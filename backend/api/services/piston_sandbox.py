"""
Piston API Sandboxed Execution Service
──────────────────────────────────────
Executes candidate code safely inside Piston API containers.
Performs per-submission batching (1 HTTP request per submission).
Uses Redis distributed rate-limiting to stay under public Piston rate limits (20 req/min).
No local subprocess execution on the host machine.
"""

import json
import time
import requests
import logging
import math
from typing import List, Dict, Any, Tuple
from api.decorators import redis_client

logger = logging.getLogger(__name__)

PISTON_API_URL = "https://emkc.org/api/v2/piston/execute"

LANGUAGE_VERSIONS = {
    "python": "3.10.0",
    "javascript": "18.15.0",
    "js": "18.15.0"
}


def acquire_piston_token_distributed(max_per_minute: int = 15) -> bool:
    """
    Redis-backed distributed rate limiter.
    Ensures total requests across all workers stay under `max_per_minute` (15/min).
    """
    try:
        current_minute = int(time.time() // 60)
        key = f"piston:rate:{current_minute}"
        count = redis_client.incr(key)
        if count == 1:
            redis_client.expire(key, 60)
        if count > max_per_minute:
            logger.warning("Piston distributed rate limit reached (%d/%d)", count, max_per_minute)
            return False
        return True
    except Exception as e:
        logger.warning("Redis rate limiter error: %s — allowing request", e)
        return True


def compare_output(actual: Any, expected: Any) -> bool:
    """
    Float-tolerant, structure-aware output comparison helper.
    """
    if actual == expected:
        return True

    # Try numeric float comparison
    try:
        if isinstance(actual, (int, float)) and isinstance(expected, (int, float)):
            return math.isclose(float(actual), float(expected), abs_tol=1e-5)
    except Exception:
        pass

    # Deep comparison for list/dict
    if isinstance(actual, (list, dict)) and isinstance(expected, (list, dict)):
        try:
            return json.dumps(actual, sort_keys=True) == json.dumps(expected, sort_keys=True)
        except Exception:
            pass

    # String comparison stripping trailing whitespace
    if isinstance(actual, str) and isinstance(expected, str):
        return actual.strip() == expected.strip()

    return False


def execute_in_piston(
    code: str,
    language: str,
    test_cases: List[Dict[str, Any]],
    func_name: str = None,
    call_code_override: str = None,
    is_custom_run: bool = False
) -> Tuple[bool, List[Dict[str, Any]], str, str, float, int]:
    """
    Executes candidate code inside Piston API.
    Batches all test cases into a single Piston API request.

    Returns:
      (all_passed, run_results, user_stdout, user_stderr, elapsed_seconds, peak_memory_kb)
    """
    lang_key = language.lower()
    if lang_key not in LANGUAGE_VERSIONS:
        return False, [{"passed": False, "error": f"Unsupported language '{language}'"}], "", "", 0.0, 0

    if not test_cases:
        return True, [], "", "", 0.0, 0

    # 1. Rate Limit Check
    if not acquire_piston_token_distributed():
        # Short backoff retry
        time.sleep(2.0)
        if not acquire_piston_token_distributed():
            return False, [{
                "passed": False,
                "error": "Piston rate limit exceeded. Please wait a few seconds and retry submission."
            }], "", "Rate limited", 0.0, 0

    # 2. Build Batched Script for Piston
    inputs = [tc.get("input") for tc in test_cases]
    inputs_json = json.dumps(inputs)

    if lang_key == "python":
        call_expr = f"{func_name}(**inp)" if func_name else (call_code_override or "None")
        runner_script = f"""
import json
import sys

# User submitted code
{code}

inputs = json.loads('''{inputs_json}''')
results = []

for idx, inp in enumerate(inputs):
    try:
        if isinstance(inp, dict):
            res = {call_expr}
        else:
            res = {func_name}(inp) if '{func_name}' in globals() else {call_expr}
        results.append({{"success": True, "output": res}})
    except Exception as e:
        results.append({{"success": False, "error": str(e)}})

print("___TEST_RESULTS___")
print(json.dumps({{"results": results, "peak_memory_bytes": 0}}))
"""

    elif lang_key in ["javascript", "js"]:
        call_expr = f"{func_name}(...Object.values(inp))" if func_name else (call_code_override or "null")
        runner_script = f"""
// User submitted code
{code}

const inputs = JSON.parse('{inputs_json}');
const results = [];

for (let idx = 0; idx < inputs.length; idx++) {{
    const inp = inputs[idx];
    try {{
        let res;
        if (typeof inp === 'object' && inp !== null) {{
            res = {call_expr};
        }} else if (typeof {func_name} === 'function') {{
            res = {func_name}(inp);
        }} else {{
            res = {call_expr};
        }}
        results.push({{success: true, output: res}});
    }} catch (e) {{
        results.push({{success: false, error: e.message}});
    }}
}}

console.log("___TEST_RESULTS___");
console.log(JSON.stringify({{results: results, peak_memory_bytes: 0}}));
"""

    # 3. Call Piston API with retries
    piston_version = LANGUAGE_VERSIONS[lang_key]
    payload = {
        "language": "python" if lang_key == "python" else "javascript",
        "version": piston_version,
        "files": [{"name": f"main.{'py' if lang_key == 'python' else 'js'}", "content": runner_script}],
        "run_timeout": 10000
    }

    resp_json = None
    start_time = time.perf_counter()

    for attempt in range(3):
        try:
            resp = requests.post(PISTON_API_URL, json=payload, timeout=12.0)
            if resp.status_code == 200:
                resp_json = resp.json()
                break
            elif resp.status_code == 429:
                time.sleep(1.5 * (attempt + 1))
            else:
                logger.warning("Piston API returned HTTP %d on attempt %d", resp.status_code, attempt + 1)
                time.sleep(1.0)
        except Exception as http_err:
            logger.warning("Piston API connection attempt %d failed: %s", attempt + 1, http_err)
            time.sleep(1.0)

    elapsed_seconds = time.perf_counter() - start_time

    if not resp_json or "run" not in resp_json:
        return False, [{
            "passed": False,
            "error": "Sandbox execution service unavailable. Please retry submission."
        }], "", "Piston service unavailable", round(elapsed_seconds, 3), 0

    run_output = resp_json.get("run", {})
    stdout = run_output.get("stdout", "")
    stderr = run_output.get("stderr", "")

    if "___TEST_RESULTS___" not in stdout:
        err_msg = stderr or stdout or "Code execution failed inside sandbox"
        return False, [{"passed": False, "error": err_msg}], "", err_msg, round(elapsed_seconds, 3), 0

    parts = stdout.split("___TEST_RESULTS___")
    user_stdout = parts[0].strip()
    
    try:
        result_payload = json.loads(parts[1].strip())
    except Exception as parse_err:
        return False, [{"passed": False, "error": f"Invalid sandbox output format: {parse_err}"}], user_stdout, stderr, round(elapsed_seconds, 3), 0

    outputs = result_payload.get("results", [])
    run_results = []
    all_passed = True

    for idx, out in enumerate(outputs):
        tc = test_cases[idx] if idx < len(test_cases) else {}
        expected = tc.get("expected_output")

        if out.get("success"):
            actual = out.get("output")
            if is_custom_run:
                run_results.append({
                    "passed": True,
                    "input": tc.get("input"),
                    "expected": None,
                    "actual": actual
                })
            else:
                passed = compare_output(actual, expected)
                run_results.append({
                    "passed": passed,
                    "input": tc.get("input"),
                    "expected": expected,
                    "actual": actual
                })
                if not passed:
                    all_passed = False
        else:
            all_passed = False
            run_results.append({
                "passed": False,
                "input": tc.get("input"),
                "expected": expected,
                "error": out.get("error")
            })

    return all_passed, run_results, user_stdout, stderr, round(elapsed_seconds, 3), 0
