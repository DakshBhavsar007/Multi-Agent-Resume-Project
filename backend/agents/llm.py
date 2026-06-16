import os
import logging
import sys
from openai import OpenAI

logger = logging.getLogger(__name__)

# Initialize global key index
_current_key_idx = 0

def get_api_keys():
    """Reads Gemini API keys from environment variable."""
    keys_str = os.getenv("GEMINI_API_KEYS", "")
    keys = [k.strip() for k in keys_str.split(",") if k.strip()]
    if not keys:
        gkey = os.getenv("GEMINI_API_KEY")
        if gkey:
            keys.append(gkey)
    return keys

def get_openai_fallback_key():
    """Reads OpenAI API key from environment variable."""
    return os.getenv("OPENAI_API_KEY")

class RotateCompletions:
    def __init__(self, client_instance):
        self.client_instance = client_instance

    def create(self, **kwargs):
        keys = get_api_keys()
        model = kwargs.get("model", "gemini-1.5-flash")
        messages = kwargs.get("messages", [])
        temperature = kwargs.get("temperature", 0.2)
        response_format = kwargs.get("response_format")
        max_tokens = kwargs.get("max_tokens")
        timeout = kwargs.get("timeout")

        global _current_key_idx

        if keys:
            # Try keys sequentially starting from the last working key index
            for attempt in range(len(keys)):
                idx = (_current_key_idx + attempt) % len(keys)
                key = keys[idx]
                
                try:
                    # Initialize client pointing to Google's OpenAI-compatible endpoint
                    client = OpenAI(
                        api_key=key,
                        base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
                    )
                    
                    # Map standard GPT models to Gemini
                    default_flash = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
                    gemini_model = default_flash
                    if ("pro" in model.lower() or "gpt-4" in model.lower()) and "mini" not in model.lower():
                        gemini_model = "gemini-2.5-pro"
                        
                    call_kwargs = {
                        "model": gemini_model,
                        "messages": messages,
                        "temperature": temperature,
                    }
                    if response_format:
                        call_kwargs["response_format"] = response_format
                    if max_tokens:
                        call_kwargs["max_tokens"] = max_tokens
                    if timeout:
                        call_kwargs["timeout"] = timeout
                        
                    masked_key = key[:8] + "..." + key[-4:] if len(key) > 12 else "..."
                    try:
                        res = client.chat.completions.create(**call_kwargs)
                        # Save working key index
                        _current_key_idx = idx
                        return res
                    except Exception as inner_e:
                        if gemini_model != default_flash:
                            logger.warning(f"Model {gemini_model} failed on key {masked_key}, falling back to {default_flash}: {str(inner_e)}")
                            call_kwargs["model"] = default_flash
                            res = client.chat.completions.create(**call_kwargs)
                            # Save working key index
                            _current_key_idx = idx
                            return res
                        else:
                            raise inner_e
                    
                except Exception as e:
                    masked_key = key[:8] + "..." + key[-4:] if len(key) > 12 else "..."
            logger.error("All Gemini API keys exhausted.")

        # Fallback to Groq if GROQ_API_KEY is configured
        groq_key = os.getenv("GROQ_API_KEY")
        if groq_key:
            try:
                client = OpenAI(
                    api_key=groq_key,
                    base_url="https://api.groq.com/openai/v1"
                )
                groq_model = os.getenv("GROQ_MODEL", "llama-3.3-70b-specdec")
                call_kwargs = {
                    "model": groq_model,
                    "messages": messages,
                    "temperature": temperature,
                }
                if response_format:
                    call_kwargs["response_format"] = response_format
                if max_tokens:
                    call_kwargs["max_tokens"] = min(max_tokens, 4096) if max_tokens else 4096
                if timeout:
                    call_kwargs["timeout"] = timeout
                return client.chat.completions.create(**call_kwargs)
            except Exception as e:
                logger.error(f"Groq fallback failed: {str(e)}")

        # Fallback to OpenAI client if OPENAI_API_KEY is configured
        openai_key = get_openai_fallback_key()
        if openai_key:
            try:
                client = OpenAI(api_key=openai_key)
                call_kwargs = {
                    "model": "gpt-4o-mini" if "flash" in model.lower() else model,
                    "messages": messages,
                    "temperature": temperature,
                }
                if response_format:
                    call_kwargs["response_format"] = response_format
                if max_tokens:
                    call_kwargs["max_tokens"] = max_tokens
                if timeout:
                    call_kwargs["timeout"] = timeout
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
