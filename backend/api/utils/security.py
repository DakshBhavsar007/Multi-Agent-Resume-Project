"""
Fernet Encryption Utilities for API Key Storage
────────────────────────────────────────────────
Provides encrypt/decrypt functions for storing sensitive API keys
(Groq, etc.) in the database instead of plaintext env vars.

Usage:
    from api.utils.security import encrypt_api_key, decrypt_api_key
    ciphertext = encrypt_api_key("gsk_abc123...")
    plaintext = decrypt_api_key(ciphertext)
"""

import os
import logging
from cryptography.fernet import Fernet, InvalidToken

logger = logging.getLogger(__name__)

# The Fernet key MUST be set in production via FERNET_SECRET_KEY env var.
# In dev, a deterministic fallback is used so keys survive restarts.
_FERNET_KEY = os.getenv("FERNET_SECRET_KEY", "").strip()

# Deterministic dev-only fallback (NOT secure for production)
_DEV_FALLBACK_KEY = "ZmVybmV0LWRldi1rZXktbm90LWZvci1wcm9kdWN0aW9uMQ=="


def _get_fernet() -> Fernet:
    """Returns a Fernet instance using the configured secret key."""
    key = _FERNET_KEY or _DEV_FALLBACK_KEY
    if not _FERNET_KEY:
        logger.warning(
            "FERNET_SECRET_KEY not set — using dev fallback. "
            "Set FERNET_SECRET_KEY in production!"
        )
    return Fernet(key.encode() if isinstance(key, str) else key)


def encrypt_api_key(plaintext: str) -> str:
    """Encrypt a plaintext API key string. Returns base64-encoded ciphertext."""
    if not plaintext:
        return ""
    return _get_fernet().encrypt(plaintext.encode("utf-8")).decode("utf-8")


def decrypt_api_key(ciphertext: str) -> str:
    """Decrypt a Fernet-encrypted API key. Returns plaintext string."""
    if not ciphertext:
        return ""
    try:
        return _get_fernet().decrypt(ciphertext.encode("utf-8")).decode("utf-8")
    except InvalidToken:
        logger.error("Failed to decrypt API key — invalid token or wrong FERNET_SECRET_KEY")
        return ""
    except Exception as e:
        logger.error("Decryption error: %s", e)
        return ""


def mask_api_key(key: str) -> str:
    """Returns a masked version of an API key for display (e.g. 'gsk_abc1...xyz9')."""
    if not key or len(key) < 12:
        return "***"
    return key[:8] + "..." + key[-4:]
