"""
Piston API Sandboxed Execution Service
──────────────────────────────────────
Executes candidate code safely inside Piston API containers.
Performs per-submission batching (1 HTTP request per submission).
Uses Redis distributed rate-limiting to stay under public Piston rate limits (20 req/min).
Includes automatic Wandbox fallback and local fallback engines if external OCI sandboxes fail with crun/clone limits.
"""

import json
import os
import time
import requests
import logging
import math
import subprocess
from typing import List, Dict, Any, Tuple
from api.decorators import redis_client

logger = logging.getLogger(__name__)

PISTON_API_URL = os.environ.get("PISTON_API_URL", "https://emkc.org/api/v2/piston/execute")
PISTON_API_KEY = os.environ.get("PISTON_API_KEY", "")

WANDBOX_API_URL = "https://wandbox.org/api/compile.json"
WANDBOX_COMPILERS = {
    "python": "cpython-3.10.15",
    "javascript": "nodejs-20.17.0",
    "js": "nodejs-20.17.0"
}

LANGUAGE_VERSIONS = {
    "python": "3.10.0",
    "javascript": "18.15.0",
    "js": "18.15.0"
}


def _call_wandbox_sandbox(runner_script: str, lang_key: str) -> Tuple[bool, str, str]:
    """
    Fallback execution service using Wandbox API when Piston requires a whitelist key or encounters errors.
    """
    compiler = WANDBOX_COMPILERS.get(lang_key, "cpython-3.10.15")
    payload = {
        "compiler": compiler,
        "code": runner_script
    }
    try:
        resp = requests.post(WANDBOX_API_URL, json=payload, timeout=15.0)
        if resp.status_code == 200:
            res_data = resp.json()
            stdout = res_data.get("program_output", "") or res_data.get("compiler_output", "")
            stderr = res_data.get("program_error", "") or res_data.get("compiler_error", "") or res_data.get("compiler_message", "")
            return True, stdout, stderr
        else:
            logger.warning("Wandbox API returned HTTP %d", resp.status_code)
    except Exception as e:
        logger.warning("Wandbox sandbox execution error: %s", e)
    return False, "", "Wandbox execution failed"


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


def _local_python_fallback(
    code: str,
    test_cases: List[Dict[str, Any]],
    func_name: str = None,
    call_code_override: str = None,
    is_custom_run: bool = False
) -> Tuple[bool, List[Dict[str, Any]], str, str, float, int]:
    """
    In-memory Python execution engine. Runs when external OCI sandbox services
    (Piston/Wandbox) encounter container resource limit errors (crun: clone: Resource temporarily unavailable).
    """
    logger.info("Executing Python solution via local engine fallback...")
    start_t = time.perf_counter()

    safe_globals = {
        "__builtins__": {
            "len": len, "range": range, "enumerate": enumerate, "zip": zip,
            "int": int, "float": float, "str": str, "bool": bool, "list": list,
            "dict": dict, "set": set, "tuple": tuple, "min": min, "max": max,
            "sum": sum, "abs": abs, "sorted": sorted, "reversed": reversed,
            "map": map, "filter": filter, "any": any, "all": all, "isinstance": isinstance,
            "print": lambda *args, **kwargs: None
        }
    }
    local_vars = {}

    try:
        exec(code, safe_globals, local_vars)
    except Exception as e:
        err_msg = f"Runtime Error: {type(e).__name__}: {str(e)}"
        return False, [{"passed": False, "error": err_msg}], "", err_msg, round(time.perf_counter() - start_t, 3), 0

    target_func = None
    if func_name and func_name in local_vars:
        target_func = local_vars[func_name]
    else:
        for obj in list(local_vars.values()):
            if callable(obj):
                target_func = obj
                break

    if not target_func:
        err_msg = f"Function '{func_name or 'solution'}' not found."
        return False, [{"passed": False, "error": err_msg}], "", err_msg, round(time.perf_counter() - start_t, 3), 0

    run_results = []
    all_passed = True

    for idx, tc in enumerate(test_cases):
        inp = tc.get("input")
        expected = tc.get("expected_output")
        try:
            if isinstance(inp, dict):
                actual = target_func(**inp)
            elif isinstance(inp, list):
                actual = target_func(inp)
            elif inp is not None:
                actual = target_func(inp)
            else:
                actual = target_func()

            if is_custom_run:
                run_results.append({"passed": True, "input": inp, "expected": None, "actual": actual})
            else:
                passed = compare_output(actual, expected)
                run_results.append({"passed": passed, "input": inp, "expected": expected, "actual": actual})
                if not passed:
                    all_passed = False
        except Exception as e:
            all_passed = False
            run_results.append({
                "passed": False,
                "input": inp,
                "expected": expected,
                "error": f"{type(e).__name__}: {str(e)}"
            })

    return all_passed, run_results, "", "", round(time.perf_counter() - start_t, 3), 0


def _local_js_fallback(
    runner_script: str,
    test_cases: List[Dict[str, Any]],
    is_custom_run: bool = False
) -> Tuple[bool, List[Dict[str, Any]], str, str, float, int]:
    """
    Local Node.js execution engine. Runs when external OCI sandbox services fail.
    """
    logger.info("Executing JavaScript solution via local Node.js engine fallback...")
    start_t = time.perf_counter()
    try:
        res = subprocess.run(
            ["node", "-e", runner_script],
            capture_output=True,
            text=True,
            timeout=5.0
        )
        stdout = res.stdout or ""
        stderr = res.stderr or ""

        if "___TEST_RESULTS___" in stdout:
            parts = stdout.split("___TEST_RESULTS___")
            user_stdout = parts[0].strip()
            result_payload = json.loads(parts[1].strip())
            outputs = result_payload.get("results", [])
            run_results = []
            all_passed = True

            for idx, out in enumerate(outputs):
                tc = test_cases[idx] if idx < len(test_cases) else {}
                expected = tc.get("expected_output")
                if out.get("success"):
                    actual = out.get("output")
                    if is_custom_run:
                        run_results.append({"passed": True, "input": tc.get("input"), "expected": None, "actual": actual})
                    else:
                        passed = compare_output(actual, expected)
                        run_results.append({"passed": passed, "input": tc.get("input"), "expected": expected, "actual": actual})
                        if not passed:
                            all_passed = False
                else:
                    all_passed = False
                    run_results.append({"passed": False, "input": tc.get("input"), "expected": expected, "error": out.get("error")})

            return all_passed, run_results, user_stdout, stderr, round(time.perf_counter() - start_t, 3), 0
    except Exception as err:
        logger.warning("Local JS fallback error: %s", err)

    return False, [{"passed": False, "error": "Execution unavailable."}], "", "Execution error", 0.0, 0


def execute_in_piston(
    code: str,
    language: str,
    test_cases: List[Dict[str, Any]],
    func_name: str = None,
    call_code_override: str = None,
    is_custom_run: bool = False
) -> Tuple[bool, List[Dict[str, Any]], str, str, float, int]:
    """
    Executes candidate code inside isolated sandbox API (Piston, Wandbox, or Local Fallback Engine).
    Batches all test cases into a single request.

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
        time.sleep(1.0)

    # 2. Build Batched Script for Sandbox
    inputs = [tc.get("input") for tc in test_cases]
    inputs_json = json.dumps(inputs)

    if lang_key == "python":
        call_expr = call_code_override if call_code_override else (f"{func_name}(**inp)" if func_name else "None")
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
        call_expr = call_code_override if call_code_override else (f"{func_name}(...Object.values(inp))" if func_name else "null")
        array_call_expr = call_code_override if call_code_override else (f"{func_name}(inp)" if func_name else "null")
        runner_script = f"""
// User submitted code
{code}

const inputs = {inputs_json};
const results = [];

for (let idx = 0; idx < inputs.length; idx++) {{
    const inp = inputs[idx];
    try {{
        let res;
        if (Array.isArray(inp)) {{
            res = {array_call_expr};
        }} else if (typeof inp === 'object' && inp !== null) {{
            res = {call_expr};
        }} else if (typeof {func_name} !== 'undefined') {{
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

    # 3. Call Piston API
    piston_version = LANGUAGE_VERSIONS[lang_key]
    payload = {
        "language": "python" if lang_key == "python" else "javascript",
        "version": piston_version,
        "files": [{"name": f"main.{'py' if lang_key == 'python' else 'js'}", "content": runner_script}],
        "run_timeout": 10000
    }

    start_time = time.perf_counter()
    stdout = ""
    stderr = ""
    resp_success = False

    headers = {}
    if PISTON_API_KEY:
        headers["Authorization"] = PISTON_API_KEY

    try:
        resp = requests.post(PISTON_API_URL, json=payload, headers=headers, timeout=8.0)
        if resp.status_code == 200:
            run_output = resp.json().get("run", {})
            stdout = run_output.get("stdout", "")
            stderr = run_output.get("stderr", "")
            # Check that crun / clone resource errors are NOT present in output
            if "___TEST_RESULTS___" in stdout and "OCI runtime error" not in stderr and "Resource temporarily unavailable" not in stderr:
                resp_success = True
            else:
                logger.warning("Piston API output missing result delimiter or container error: %s", stderr or stdout)
        else:
            logger.warning("Piston API returned HTTP %d — trying Wandbox fallback", resp.status_code)
    except Exception as http_err:
        logger.warning("Piston API connection failed: %s — trying Wandbox fallback", http_err)

    if not resp_success:
        wand_ok, stdout, stderr = _call_wandbox_sandbox(runner_script, lang_key)
        if wand_ok and "___TEST_RESULTS___" in stdout and "OCI runtime error" not in stderr and "Resource temporarily unavailable" not in stderr:
            resp_success = True

    # If external container sandboxes failed (due to OCI crun/clone limits on public servers), use Local Fallback Engine
    if not resp_success:
        logger.warning("External sandboxes unavailable or exhausted — activating Local Engine Fallback")
        if lang_key == "python":
            return _local_python_fallback(
                code,
                test_cases,
                func_name=func_name,
                call_code_override=call_code_override,
                is_custom_run=is_custom_run
            )
        elif lang_key in ["javascript", "js"]:
            return _local_js_fallback(
                runner_script,
                test_cases,
                is_custom_run=is_custom_run
            )

    elapsed_seconds = time.perf_counter() - start_time

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
