import os
import logging
import sys
import time
import json
import random
from openai import OpenAI

logger = logging.getLogger(__name__)

# File path to persist bad key timestamps across server restarts
_BAD_KEYS_FILE = os.path.join(os.getenv("UPLOAD_DIR", "uploads"), "llm_bad_keys.json")
_current_key_idx = 0
_bad_keys = {}  # maps api_key string -> float timestamp when key becomes eligible again


def _load_bad_keys():
    """Load bad key expiry timestamps from persistent JSON file."""
    global _bad_keys
    try:
        if os.path.exists(_BAD_KEYS_FILE):
            with open(_BAD_KEYS_FILE, "r") as f:
                data = json.load(f)
                now = time.time()
                # Keep only unexpired entries
                _bad_keys = {k: float(v) for k, v in data.items() if float(v) > now}
    except Exception as e:
        logger.warning("Failed to load bad keys from file: %s", e)
        _bad_keys = {}


def _save_bad_keys():
    """Save bad key expiry timestamps to persistent JSON file."""
    try:
        os.makedirs(os.path.dirname(_BAD_KEYS_FILE), exist_ok=True)
        with open(_BAD_KEYS_FILE, "w") as f:
            json.dump(_bad_keys, f)
    except Exception as e:
        logger.warning("Failed to save bad keys to file: %s", e)


# Initialize bad keys on module import
_load_bad_keys()


def get_api_keys():
    """Reads Gemini API keys from environment variable as a list."""
    keys_str = os.getenv("GEMINI_API_KEYS", "")
    keys = [k.strip() for k in keys_str.split(",") if k.strip()]
    if not keys:
        gkey = os.getenv("GEMINI_API_KEY")
        if gkey and gkey.strip():
            keys.append(gkey.strip())
    return keys


def get_active_gemini_keys():
    """
    Returns list of Gemini keys that are currently active and not expired in quota.
    Filters out keys whose bad_key timestamp is in the future.
    """
    all_keys = get_api_keys()
    now = time.time()
    active = [k for k in all_keys if _bad_keys.get(k, 0) <= now]
    return active


def record_bad_key(key: str, error: Exception or str):
    """
    Records a key as bad/exhausted.
    If the error indicates 429 / QuotaExceeded / ResourceExhausted, marks it bad for 24 Hours (86,400s).
    Otherwise, marks it bad for 60 Seconds (short rate limit / network error).
    """
    global _bad_keys
    err_str = str(error)
    now = time.time()

    # Detect 429 or daily quota exhaustion
    is_daily_quota = any(kw in err_str.lower() for kw in ["429", "quota", "resource_exhausted", "resourceexhausted"])

    if is_daily_quota:
        # Mark as exhausted for 24 hours (86,400 seconds)
        expiry = now + 86400.0
        _bad_keys[key] = expiry
        masked = key[:8] + "..." + key[-4:] if len(key) > 12 else "..."
        print(f"[LLM ROTATION] Gemini key {masked} hit DAILY QUOTA (429)! Saved to DB/Disk memory (marked bad for 24 hours).", flush=True)
        logger.warning(f"Gemini key {masked} hit daily quota 429. Marked bad for 24h.")
    else:
        # Short 60s cooldown for temporary glitches
        expiry = now + 60.0
        _bad_keys[key] = expiry
        masked = key[:8] + "..." + key[-4:] if len(key) > 12 else "..."
        print(f"[LLM ROTATION] Gemini key {masked} temporary error: {error}. Marked bad for 60s.", flush=True)

    _save_bad_keys()


def get_openai_fallback_key():
    """Reads OpenAI API key from environment variable."""
    return os.getenv("OPENAI_API_KEY")


class RotateCompletions:
    def __init__(self, client_instance):
        self.client_instance = client_instance

    def create(self, **kwargs):
        all_keys = get_api_keys()
        active_keys = get_active_gemini_keys()

        model = kwargs.get("model", "gemini-1.5-flash")
        messages = kwargs.get("messages", [])
        temperature = kwargs.get("temperature", 0.2)
        response_format = kwargs.get("response_format")
        max_tokens = kwargs.get("max_tokens")

        timeout = kwargs.get("timeout") or 30.0
        fallback_timeout = kwargs.get("timeout") or 25.0

        global _current_key_idx

        if active_keys:
            # Pick a starting index to distribute requests evenly across active keys
            start_idx = _current_key_idx % len(active_keys)

            for attempt in range(len(active_keys)):
                idx = (start_idx + attempt) % len(active_keys)
                key = active_keys[idx]
                masked_key = key[:8] + "..." + key[-4:] if len(key) > 12 else "..."

                try:
                    client = OpenAI(
                        api_key=key,
                        base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
                        max_retries=0
                    )

                    default_flash = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
                    gemini_model = default_flash
                    if ("pro" in model.lower() or "gpt-4" in model.lower()) and "mini" not in model.lower():
                        gemini_model = "gemini-2.5-pro"

                    call_kwargs = {
                        "model": gemini_model,
                        "messages": messages,
                        "temperature": temperature,
                        "timeout": timeout
                    }
                    if response_format:
                        call_kwargs["response_format"] = response_format
                    if max_tokens:
                        call_kwargs["max_tokens"] = max_tokens

                    print(f"[LLM ROTATION] Active Gemini Keys: {len(active_keys)}/{len(all_keys)}. Trying key ({idx+1}/{len(active_keys)}): {masked_key}", flush=True)

                    try:
                        res = client.chat.completions.create(**call_kwargs)
                        _current_key_idx = (idx + 1) % len(active_keys)
                        print(f"[LLM ROTATION] Gemini key {masked_key} succeeded!", flush=True)
                        return res
                    except Exception as inner_e:
                        record_bad_key(key, inner_e)
                        if gemini_model != default_flash:
                            print(f"[LLM ROTATION] Retrying {default_flash} on key {masked_key}", flush=True)
                            call_kwargs["model"] = default_flash
                            res = client.chat.completions.create(**call_kwargs)
                            _current_key_idx = (idx + 1) % len(active_keys)
                            print(f"[LLM ROTATION] Gemini key {masked_key} fallback succeeded!", flush=True)
                            return res
                        else:
                            raise inner_e

                except Exception as e:
                    record_bad_key(key, e)
                    continue

            print("[LLM ROTATION] All active Gemini API keys exhausted for today.", flush=True)
            logger.error("All active Gemini API keys exhausted for today.")
        else:
            print(f"[LLM ROTATION] No active Gemini keys (all {len(all_keys)} keys currently in quota cooldown).", flush=True)

        # Fallback to Groq if GROQ_API_KEY is configured
        groq_key = os.getenv("GROQ_API_KEY")
        if groq_key:
            client = OpenAI(
                api_key=groq_key,
                base_url="https://api.groq.com/openai/v1",
                max_retries=0
            )
            groq_models = [
                os.getenv("GROQ_MODEL", "llama-3.3-70b-specdec"),
                "llama-3.3-70b-versatile",
                "llama-3.1-8b-instant",
                "llama3-8b-8192"
            ]

            seen = set()
            unique_models = []
            for m in groq_models:
                if m not in seen:
                    unique_models.append(m)
                    seen.add(m)

            for model_name in unique_models:
                print(f"[LLM ROTATION] Trying Groq model: {model_name} (timeout={fallback_timeout})", flush=True)
                try:
                    call_kwargs = {
                        "model": model_name,
                        "messages": messages,
                        "temperature": temperature,
                        "timeout": fallback_timeout
                    }
                    if response_format:
                        call_kwargs["response_format"] = response_format
                    if max_tokens:
                        call_kwargs["max_tokens"] = min(max_tokens, 4096) if max_tokens else 4096
                    res = client.chat.completions.create(**call_kwargs)
                    print(f"[LLM ROTATION] Groq model {model_name} succeeded!", flush=True)
                    return res
                except Exception as e:
                    print(f"[LLM ROTATION] Groq model {model_name} failed: {e}", flush=True)
                    logger.error(f"Groq model {model_name} failed/rate-limited: {str(e)}")

        # Fallback to OpenAI client if OPENAI_API_KEY is configured
        openai_key = get_openai_fallback_key()
        if openai_key:
            try:
                client = OpenAI(api_key=openai_key, max_retries=0)
                call_kwargs = {
                    "model": "gpt-4o-mini" if "flash" in model.lower() else model,
                    "messages": messages,
                    "temperature": temperature,
                    "timeout": fallback_timeout
                }
                if response_format:
                    call_kwargs["response_format"] = response_format
                if max_tokens:
                    call_kwargs["max_tokens"] = max_tokens
                return client.chat.completions.create(**call_kwargs)
            except Exception as e:
                logger.error(f"OpenAI fallback failed: {str(e)}")
                raise e

        raise ValueError("No working API keys configured (All Gemini keys failed, and no Groq or OpenAI key exists).")


class RotateChat:
    def __init__(self, client_instance):
        self.completions = RotateCompletions(client_instance)


class RotateLLMClient:
    """Mock OpenAI client that handles API Key rotation and Gemini compatibility."""
    def __init__(self):
        self.chat = RotateChat(self)

    def generate(self, prompt: str, system_prompt: str = None) -> str:
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        response = self.chat.completions.create(
            model="gemini-1.5-flash",
            messages=messages,
            temperature=0.2
        )
        return response.choices[0].message.content
