import os
import re
import logging
import time
import datetime
import asyncio
from concurrent.futures import ThreadPoolExecutor
from openai import OpenAI
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

# Global cache for Groq model/key exhaustion tracking: (key_hash, model_name) -> unix timestamp
_GROQ_EXHAUSTED_UNTIL = {}


def _parse_retry_seconds(err_str: str) -> int:
    """
    Parses retry-after duration from Groq 429 error messages like:
    'Please try again in 43m41s', 'Please try again in 1m20.5s', 'try again in 500ms', etc.
    Returns seconds to wait (default 600s if unparseable).
    """
    err_lower = err_str.lower()
    total_seconds = 0

    m_min = re.search(r'(\d+)\s*m(?:in)?s?', err_lower)
    m_sec = re.search(r'(\d+)\s*s(?:ec)?s?', err_lower)

    if m_min:
        total_seconds += int(m_min.group(1)) * 60
    if m_sec:
        total_seconds += int(m_sec.group(1))

    if total_seconds > 0:
        return total_seconds

    m_raw = re.search(r'retry\s*after\s*(\d+)', err_lower)
    if m_raw:
        return int(m_raw.group(1))

    return 600


# Ensure .env is loaded into environment for LLM keys
_env_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_env_file = os.path.join(_env_dir, ".env")
if os.path.exists(_env_file):
    load_dotenv(_env_file, override=True)
load_dotenv(override=True)

# Pacific Time offset (UTC-7 during PDT, UTC-8 during PST)
# Google resets Gemini quota at midnight Pacific Time
_PT_UTC_OFFSET_HOURS = -7  # PDT (summer); adjust to -8 for PST if needed

_db_executor = ThreadPoolExecutor(max_workers=4)


def _run_sync_in_thread(func, *args, **kwargs):
    """Executes a synchronous function in a separate thread if an async event loop is running, preventing SynchronousOnlyOperation."""
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None

    if loop and loop.is_running():
        return _db_executor.submit(func, *args, **kwargs).result()
    else:
        return func(*args, **kwargs)


def _get_pacific_date():
    """Returns the current date in Pacific Time (for quota reset alignment with Google)."""
    utc_now = datetime.datetime.now(datetime.timezone.utc)
    pt_offset = datetime.timedelta(hours=_PT_UTC_OFFSET_HOURS)
    pt_now = utc_now + pt_offset
    return pt_now.date()


def _seed_from_env():
    """
    Auto-seed GeminiProject + GeminiApiKey and GroqApiKey from env vars
    if the DB tables are empty (first-time server start).
    Also seeds AgentModelConfig with default agent assignments.
    """
    from api.models import GeminiProject, GeminiApiKey, AgentModelConfig, GroqApiKey
    from api.utils.security import encrypt_api_key

    # --- Seed Gemini keys from .env if DB is empty ---
    if GeminiProject.objects.count() == 0:
        keys_str = os.getenv("GEMINI_API_KEYS", "")
        keys = [k.strip() for k in keys_str.split(",") if k.strip()]
        if not keys:
            single = os.getenv("GEMINI_API_KEY", "")
            if single.strip():
                keys.append(single.strip())

        for i, key in enumerate(keys, 1):
            project_name = f"Gemini-Project-{i}"
            project, _ = GeminiProject.objects.get_or_create(
                name=project_name,
                defaults={"daily_limit": 20, "daily_usage": 0, "rpm_limit": 5}
            )
            GeminiApiKey.objects.get_or_create(
                key=key,
                defaults={"project": project, "label": f"Key-{i}", "is_active": True}
            )
        if keys:
            print(f"[LLM SEED] Auto-imported {len(keys)} Gemini keys from .env into DB.", flush=True)

    # --- Seed Groq keys from .env if DB is empty ---
    if GroqApiKey.objects.count() == 0:
        raw_keys_list = [
            os.getenv("GROQ_API_KEYS", ""),
            os.getenv("GROK_API_KEYS", ""),
            os.getenv("GROQ_API_KEY", ""),
            os.getenv("GROK_API_KEY", ""),
        ]
        gkeys = []
        for raw in raw_keys_list:
            if raw:
                for k in raw.split(","):
                    k_str = k.strip()
                    if k_str and k_str not in gkeys:
                        gkeys.append(k_str)
        for i, gk in enumerate(gkeys, 1):
            enc = encrypt_api_key(gk)
            if enc:
                GroqApiKey.objects.get_or_create(
                    encrypted_key=enc,
                    defaults={"label": f"Groq-Key-{i}", "is_active": True}
                )
        if gkeys:
            print(f"[LLM SEED] Auto-imported {len(gkeys)} Groq keys from .env into encrypted DB.", flush=True)


    # --- Seed AgentModelConfig if DB is empty ---
    if AgentModelConfig.objects.count() == 0:
        default_agents = [
            ("resume_parser",       "Resume Parser",          "gemini", "groq"),
            ("inference_agent",     "Candidate Scoring",      "gemini", "groq"),
            ("parsing_agent",       "Basic Parsing",          "gemini", "groq"),
            ("resume_enhancer",     "Resume Enhancer",        "groq",   "gemini"),
            ("interview_agent",     "AI Interview",           "groq",   "gemini"),
            ("cover_letter",        "Cover Letter",           "groq",   "gemini"),
            ("chatbot",             "AI Chatbot",             "groq",   "gemini"),
            ("ats_parser",          "ATS Parser",             "gemini", "groq"),
            ("ats_compatibility",   "ATS Compatibility",      "gemini", "groq"),
            ("round_recommendation","Round Recommendation",   "groq",   "gemini"),
            ("mcq_parser",          "MCQ Paper Parser",       "gemini", "groq"),
            ("jd_generator",        "JD Generator",           "groq",   "gemini"),
            ("resume_builder",      "Resume Builder",         "gemini", "groq"),
            ("round_evaluation",    "Round Evaluation",       "gemini", "groq"),
            ("linkedin_scraper",    "LinkedIn Scraper",       "groq",   "gemini"),
            ("celery_resume",       "Celery Resume Tasks",    "gemini", "groq"),
            ("celery_interview",    "Celery Interview Tasks", "groq",   "gemini"),
            ("celery_general",      "Celery General Tasks",   "gemini", "groq"),
        ]
        for agent_name, display_name, primary, fallback in default_agents:
            AgentModelConfig.objects.get_or_create(
                agent_name=agent_name,
                defaults={
                    "display_name": display_name,
                    "primary_provider": primary,
                    "fallback_provider": fallback,
                }
            )
        print(f"[LLM SEED] Auto-seeded {len(default_agents)} agent model configs.", flush=True)


# Flag to prevent seeding multiple times in same process
_seed_done = False


def _ensure_seeded():
    """Ensure DB is seeded on first access. Called lazily."""
    def _inner():
        global _seed_done
        if not _seed_done:
            try:
                _seed_from_env()
            except Exception as e:
                logger.warning("DB seed skipped (tables may not exist yet): %s", e)
            _seed_done = True
    _run_sync_in_thread(_inner)


def get_agent_config(agent_name: str):
    """
    Fetch AgentModelConfig from DB for the given agent.
    Returns (primary_provider, fallback_provider) tuple.
    Falls back to ('gemini', 'groq') if not found.
    """
    def _inner():
        _ensure_seeded()
        try:
            from api.models import AgentModelConfig
            config = AgentModelConfig.objects.filter(agent_name=agent_name, is_active=True).first()
            if config:
                return (config.primary_provider, config.fallback_provider)
        except Exception as e:
            logger.warning("Failed to fetch agent config for %s: %s", agent_name, e)
        return ("gemini", "groq")
    return _run_sync_in_thread(_inner)


def get_available_gemini_key():
    """
    Returns (api_key_string, GeminiProject instance) for the best available project.
    Performs lazy Pacific Time midnight reset.
    Returns (None, None) if no keys are available.
    """
    def _inner():
        _ensure_seeded()
        try:
            from api.models import GeminiProject, GeminiApiKey

            today_pt = _get_pacific_date()
            projects = GeminiProject.objects.filter(is_active=True).order_by('daily_usage')

            for project in projects:
                # Lazy reset: if last_reset is before today (Pacific Time), reset counter
                if project.last_reset < today_pt:
                    project.daily_usage = 0
                    project.last_reset = today_pt
                    project.save(update_fields=['daily_usage', 'last_reset'])
                    print(f"[LLM ROTATION] Lazy reset for project '{project.name}' (new day in PT).", flush=True)

                # Check if project has remaining quota
                if project.daily_usage < project.daily_limit:
                    # Get an active key from this project
                    key_obj = GeminiApiKey.objects.filter(project=project, is_active=True).first()
                    if key_obj:
                        return (key_obj.key, project)

            return (None, None)
        except Exception as e:
            logger.warning("Failed to fetch Gemini key from DB: %s", e)
            return (None, None)
    return _run_sync_in_thread(_inner)


def record_gemini_usage(project):
    """Increment daily usage for a project after a successful request."""
    def _inner():
        try:
            project.daily_usage += 1
            project.save(update_fields=['daily_usage'])
        except Exception as e:
            logger.warning("Failed to record Gemini usage: %s", e)
    _run_sync_in_thread(_inner)


def mark_project_exhausted(project):
    """Mark a project as fully exhausted (429 response)."""
    def _inner():
        try:
            project.daily_usage = project.daily_limit
            project.save(update_fields=['daily_usage'])
            print(f"[LLM ROTATION] Project '{project.name}' marked EXHAUSTED (429 hit). Usage set to {project.daily_limit}/{project.daily_limit}.", flush=True)
        except Exception as e:
            logger.warning("Failed to mark project exhausted: %s", e)
    _run_sync_in_thread(_inner)


def get_all_gemini_stats():
    """Returns summary stats for logging."""
    def _inner():
        try:
            from api.models import GeminiProject
            projects = GeminiProject.objects.filter(is_active=True)
            total = projects.count()
            available = sum(1 for p in projects if p.daily_usage < p.daily_limit)
            return total, available
        except Exception:
            return 0, 0
    return _run_sync_in_thread(_inner)


# --- Legacy compatibility (used by advanced_ats_parsing_agent directly) ---

def get_api_keys():
    """Legacy: returns list of all Gemini API key strings from DB."""
    _ensure_seeded()
    try:
        from api.models import GeminiApiKey
        return list(GeminiApiKey.objects.filter(is_active=True).values_list('key', flat=True))
    except Exception:
        # Fallback to .env if DB not available
        keys_str = os.getenv("GEMINI_API_KEYS", "")
        keys = [k.strip() for k in keys_str.split(",") if k.strip()]
        if not keys:
            gkey = os.getenv("GEMINI_API_KEY")
            if gkey and gkey.strip():
                keys.append(gkey.strip())
        return keys


def get_active_gemini_keys():
    """Legacy: returns list of Gemini API key strings with remaining quota."""
    _ensure_seeded()
    try:
        from api.models import GeminiProject, GeminiApiKey
        today_pt = _get_pacific_date()
        active_keys = []
        projects = GeminiProject.objects.filter(is_active=True)
        for project in projects:
            if project.last_reset < today_pt:
                project.daily_usage = 0
                project.last_reset = today_pt
                project.save(update_fields=['daily_usage', 'last_reset'])
            if project.daily_usage < project.daily_limit:
                keys = GeminiApiKey.objects.filter(project=project, is_active=True).values_list('key', flat=True)
                active_keys.extend(keys)
        return active_keys
    except Exception:
        return get_api_keys()


def record_bad_key(key: str, error):
    """Legacy: marks the PROJECT of this key as exhausted if 429, else logs warning."""
    try:
        from api.models import GeminiApiKey
        key_obj = GeminiApiKey.objects.filter(key=key).select_related('project').first()
        if key_obj:
            err_str = str(error).lower()
            is_daily_quota = any(kw in err_str for kw in ["429", "quota", "resource_exhausted", "resourceexhausted"])
            if is_daily_quota:
                mark_project_exhausted(key_obj.project)
            else:
                masked = key[:8] + "..." + key[-4:] if len(key) > 12 else "..."
                print(f"[LLM ROTATION] Key {masked} temporary error: {error}", flush=True)
    except Exception as e:
        logger.warning("record_bad_key failed: %s", e)


def get_openai_fallback_key():
    """Reads OpenAI API key from environment variable."""
    return os.getenv("OPENAI_API_KEY")


# ─── Main RotateLLMClient ────────────────────────────────────────────────────

def _get_active_projects_and_keys():
    def _inner():
        from api.models import GeminiProject, GeminiApiKey
        today_pt = _get_pacific_date()
        results = []
        projects = GeminiProject.objects.filter(is_active=True).order_by('daily_usage')
        for project in projects:
            if project.last_reset < today_pt:
                project.daily_usage = 0
                project.last_reset = today_pt
                project.save(update_fields=['daily_usage', 'last_reset'])
            if project.daily_usage >= project.daily_limit:
                continue
            key_obj = GeminiApiKey.objects.filter(project=project, is_active=True).first()
            if key_obj:
                results.append((project, key_obj.key))
        return results
    return _run_sync_in_thread(_inner)


class RotateCompletions:
    def __init__(self, client_instance):
        self.client_instance = client_instance

    def create(self, **kwargs):
        agent_name = self.client_instance._agent_name
        primary, fallback = get_agent_config(agent_name)

        model = kwargs.get("model", "gemini-2.0-flash")
        messages = kwargs.get("messages", [])
        temperature = kwargs.get("temperature", 0.2)
        response_format = kwargs.get("response_format")
        max_tokens = kwargs.get("max_tokens")
        timeout = kwargs.get("timeout") or 30.0

        providers_to_try = [primary, fallback]
        if "gemini" in providers_to_try and "groq" not in providers_to_try:
            providers_to_try.append("groq")
        if "groq" in providers_to_try and "gemini" not in providers_to_try:
            providers_to_try.append("gemini")

        last_error = None

        for provider in providers_to_try:
            try:
                if provider == "gemini":
                    result = self._try_gemini(model, messages, temperature, response_format, max_tokens, timeout)
                    if result:
                        return result
                elif provider == "groq":
                    result = self._try_groq(messages, temperature, response_format, max_tokens, timeout)
                    if result:
                        return result
            except Exception as e:
                last_error = e
                masked_agent = agent_name or "unknown"
                print(f"[LLM ROTATION] Agent '{masked_agent}' provider '{provider}' failed: {e}", flush=True)
                continue

        # Last resort: OpenAI
        openai_key = get_openai_fallback_key()
        if openai_key:
            try:
                client = OpenAI(api_key=openai_key, max_retries=0)
                call_kwargs = {
                    "model": "gpt-4o-mini" if "flash" in model.lower() else model,
                    "messages": messages,
                    "temperature": temperature,
                    "timeout": timeout
                }
                if response_format:
                    call_kwargs["response_format"] = response_format
                if max_tokens:
                    call_kwargs["max_tokens"] = max_tokens
                return client.chat.completions.create(**call_kwargs)
            except Exception as e:
                logger.error(f"OpenAI fallback failed: {str(e)}")

        raise ValueError(
            f"All providers failed for agent '{agent_name}'. "
            f"Tried: {providers_to_try}. Last error: {last_error}"
        )

    def _try_gemini(self, model, messages, temperature, response_format, max_tokens, timeout):
        """Try all available Gemini projects/keys."""
        total_projects, available_projects = get_all_gemini_stats()

        if available_projects == 0:
            print(f"[LLM ROTATION] No Gemini projects available ({total_projects} total, all exhausted).", flush=True)
            return None

        active_items = _get_active_projects_and_keys()

        for project, key in active_items:
            masked_key = key[:8] + "..." + key[-4:] if len(key) > 12 else "..."

            try:
                client = OpenAI(
                    api_key=key,
                    base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
                    max_retries=0
                )

                default_flash = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
                if "2.5" in default_flash:
                    default_flash = "gemini-2.0-flash"
                gemini_model = default_flash
                if ("pro" in model.lower() or "gpt-4" in model.lower()) and "mini" not in model.lower():
                    gemini_model = "gemini-1.5-pro"

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

                print(
                    f"[LLM ROTATION] Gemini -> Project '{project.name}' "
                    f"({project.daily_usage}/{project.daily_limit} RPD). "
                    f"Key: {masked_key}",
                    flush=True
                )

                res = client.chat.completions.create(**call_kwargs)
                record_gemini_usage(project)
                print(f"[LLM ROTATION] Gemini key {masked_key} succeeded! Usage: {project.daily_usage}/{project.daily_limit}", flush=True)
                return res

            except Exception as e:
                err_str = str(e).lower()
                is_quota = any(kw in err_str for kw in ["429", "quota", "resource_exhausted", "resourceexhausted"])
                if is_quota:
                    mark_project_exhausted(project)
                else:
                    print(f"[LLM ROTATION] Gemini key {masked_key} error: {e}", flush=True)
                continue

        print("[LLM ROTATION] All Gemini projects exhausted for today.", flush=True)
        return None

    def _try_groq(self, messages, temperature, response_format, max_tokens, timeout):
        """Try Groq/Grok with cascading model fallback, DB-stored encrypted key rotation, and atomic counter updates."""
        _ensure_seeded()
        keys = []
        key_objs = []
        try:
            from api.models import GroqApiKey
            from api.utils.security import decrypt_api_key
            from django.db.models import F
            db_keys = list(GroqApiKey.objects.filter(is_active=True).order_by('usage_count'))
            for obj in db_keys:
                dec = decrypt_api_key(obj.encrypted_key)
                if dec and dec not in keys:
                    keys.append(dec)
                    key_objs.append((dec, obj))
        except Exception as db_err:
            logger.warning("Failed to fetch Groq keys from DB: %s", db_err)

        if not keys:
            from dotenv import load_dotenv
            _env_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            _env_file = os.path.join(_env_dir, ".env")
            if os.path.exists(_env_file):
                load_dotenv(_env_file, override=True)
            load_dotenv(override=True)

            raw_keys_list = [
                os.getenv("GROQ_API_KEYS", ""),
                os.getenv("GROK_API_KEYS", ""),
                os.getenv("GROQ_API_KEY", ""),
                os.getenv("GROK_API_KEY", ""),
            ]
            for raw in raw_keys_list:
                if raw:
                    for k in raw.split(","):
                        k_str = k.strip()
                        if k_str and k_str not in keys:
                            keys.append(k_str)
                            key_objs.append((k_str, None))

        if not keys:
            print("[LLM ROTATION] No GROQ_API_KEY configured in DB or .env.", flush=True)
            return None

        # Clean rotation model list:
        custom_override = os.getenv("GROQ_MODEL", os.getenv("GROK_MODEL", "")).strip()
        groq_models = []
        if custom_override:
            groq_models.append(custom_override)
        groq_models.extend([
            "llama-3.1-8b-instant",
            "llama-3.3-70b-versatile"
        ])

        seen = set()
        unique_models = []
        for m in groq_models:
            if m and m not in seen:
                unique_models.append(m)
                seen.add(m)

        fallback_timeout = min(timeout, 25.0)
        now = time.time()

        for key, key_obj in key_objs:
            key_hash = key[:10]
            masked_key = key[:8] + "..." + key[-4:] if len(key) > 12 else "..."
            client = OpenAI(
                api_key=key,
                base_url="https://api.groq.com/openai/v1",
                max_retries=0
            )

            for model_name in unique_models:
                cache_key = (key_hash, model_name)
                exhaust_until = _GROQ_EXHAUSTED_UNTIL.get(cache_key, 0)
                if now < exhaust_until:
                    remaining_mins = int((exhaust_until - now) / 60)
                    print(
                        f"[LLM ROTATION] Skipping Groq model '{model_name}' (key {masked_key}) "
                        f"— marked EXHAUSTED for ~{remaining_mins}m more.",
                        flush=True
                    )
                    continue

                print(f"[LLM ROTATION] Trying Groq/Grok model '{model_name}' with key {masked_key}", flush=True)
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
                        call_kwargs["max_tokens"] = min(max_tokens, 4096)
                    res = client.chat.completions.create(**call_kwargs)
                    print(f"[LLM ROTATION] Groq/Grok model '{model_name}' (key {masked_key}) succeeded!", flush=True)
                    
                    # Atomic usage increment if key_obj exists
                    if key_obj:
                        def _inc_usage():
                            try:
                                from api.models import GroqApiKey
                                from django.db.models import F
                                from django.utils import timezone
                                GroqApiKey.objects.filter(id=key_obj.id).update(
                                    usage_count=F('usage_count') + 1,
                                    last_used_at=timezone.now()
                                )
                            except Exception as inc_err:
                                logger.warning("Failed to increment Groq key usage count: %s", inc_err)
                        _run_sync_in_thread(_inc_usage)

                    return res

                except Exception as e:
                    err_str = str(e)
                    err_lower = err_str.lower()
                    is_rate_limit = any(kw in err_lower for kw in ["429", "rate_limit", "quota", "tpd", "tpm", "tokens per day", "requests per day"])
                    is_invalid_model = any(kw in err_lower for kw in ["400", "decommissioned", "does not exist", "model_not_found"])

                    if is_rate_limit:
                        retry_secs = _parse_retry_seconds(err_str)
                        _GROQ_EXHAUSTED_UNTIL[cache_key] = time.time() + retry_secs + 5
                        print(
                            f"[LLM ROTATION] Groq model '{model_name}' (key {masked_key}) hit 429 limit! "
                            f"Marked exhausted for {retry_secs}s.",
                            flush=True
                        )
                    elif is_invalid_model:
                        _GROQ_EXHAUSTED_UNTIL[cache_key] = time.time() + 86400 * 30
                        print(
                            f"[LLM ROTATION] Groq model '{model_name}' is decommissioned or invalid (400). "
                            f"Disabled permanently.",
                            flush=True
                        )
                    else:
                        print(f"[LLM ROTATION] Groq/Grok model '{model_name}' (key {masked_key}) failed: {e}", flush=True)
                    logger.warning(f"Groq/Grok model {model_name} failed: {str(e)}")

        return None


class RotateChat:
    def __init__(self, client_instance):
        self.completions = RotateCompletions(client_instance)


class RotateLLMClient:
    """
    Smart LLM client with DB-driven provider routing and key rotation.
    
    Usage:
        client = RotateLLMClient(agent_name="chatbot")
        response = client.chat.completions.create(model="gemini-2.5-flash", messages=[...])
    
    The agent_name determines which provider (Gemini/Groq) is used as primary
    and which as fallback, based on AgentModelConfig in the database.
    """
    def __init__(self, agent_name: str = "default"):
        self._agent_name = agent_name
        self.chat = RotateChat(self)

    def generate(self, prompt: str, system_prompt: str = None) -> str:
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        response = self.chat.completions.create(
            model="gemini-2.5-flash",
            messages=messages,
            temperature=0.2
        )
        return response.choices[0].message.content
