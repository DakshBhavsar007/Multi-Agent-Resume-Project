import sys
from types import ModuleType

# Mock pkg_resources to prevent ModuleNotFoundError in Python 3.12+ environments (e.g. for razorpay)
try:
    import pkg_resources
except ImportError:
    class DistributionNotFound(Exception):
        pass

    class MockDistribution:
        def __init__(self):
            self.version = "1.0.0"
            
    class MockPkgResources(ModuleType):
        def __init__(self, name):
            super().__init__(name)
            self.DistributionNotFound = DistributionNotFound
            
        def get_distribution(self, name):
            return MockDistribution()
            
    mock_pkg = MockPkgResources("pkg_resources")
    sys.modules["pkg_resources"] = mock_pkg

import os
from pathlib import Path
import dj_database_url
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables
load_dotenv(BASE_DIR / ".env")

SECRET_KEY = os.getenv("JWT_SECRET")

# Validate critical environment variables at startup
CRITICAL_VARS = ["DATABASE_URL", "JWT_SECRET"]
# Ensure LLM API Keys are present
if not os.getenv("GEMINI_API_KEY") and not os.getenv("GEMINI_API_KEYS") and not os.getenv("OPENAI_API_KEY"):
    raise ValueError(
        "Critical Error: Missing required LLM API keys. "
        "Please configure GEMINI_API_KEY, GEMINI_API_KEYS, or OPENAI_API_KEY in your .env file."
    )

for var in CRITICAL_VARS:
    if not os.getenv(var):
        raise ValueError(
            f"Critical Error: Required environment variable '{var}' is not configured. "
            f"The application cannot start without this variable. Please set it in your .env file."
        )

DEBUG = os.getenv("DEBUG", "False").lower() in ("true", "1")

ALLOWED_HOSTS = ["*"]

INSTALLED_APPS = [
    'django.contrib.contenttypes',
    'django.contrib.staticfiles',
    'corsheaders',
    'api',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'api.middleware.SecurityHeadersMiddleware',
    'api.middleware.ExceptionSanitizationMiddleware',
    'django.middleware.common.CommonMiddleware',
    'api.middleware.UsageLoggerMiddleware',
]

ROOT_URLCONF = 'vishleshan_backend.urls'

TEMPLATES = []

WSGI_APPLICATION = 'vishleshan_backend.wsgi.application'
ASGI_APPLICATION = 'vishleshan_backend.asgi.application'

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL")
# Convert asyncpg to standard postgresql engine for Django ORM
SYNC_DATABASE_URL = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")

db_config = dj_database_url.parse(
    SYNC_DATABASE_URL,
    conn_max_age=600,
    conn_health_checks=True,
)
if not DEBUG:
    # Force TLS/SSL database connection in production
    if db_config.get('ENGINE') == 'django.db.backends.postgresql' or 'postgresql' in SYNC_DATABASE_URL:
        db_config.setdefault('OPTIONS', {})
        db_config['OPTIONS']['sslmode'] = 'require'

DATABASES = {
    'default': db_config
}

# Use PostgreSQL engine
DATABASES['default']['ENGINE'] = 'django.db.backends.postgresql'

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Kolkata'
USE_I18N = True
USE_TZ = True

# Static files
STATIC_URL = 'static/'

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# CORS Config
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOW_CREDENTIALS = True

allowed_origins_str = os.getenv("ALLOWED_ORIGINS", "")
if allowed_origins_str:
    CORS_ALLOWED_ORIGINS = [origin.strip() for origin in allowed_origins_str.split(",") if origin.strip()]
else:
    CORS_ALLOWED_ORIGINS = ["http://localhost:5173", "http://localhost:3000", "https://between.indevs.in"]
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
    'x-api-key',
    'X-API-Key',
]

# Custom directory configs for uploading/photos
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads")
PHOTO_DIR = os.getenv("PHOTO_DIR", "photos")

# File upload limit configs (10MB)
DATA_UPLOAD_MAX_MEMORY_SIZE = 10485760
FILE_UPLOAD_MAX_MEMORY_SIZE = 10485760

# Email settings using django-anymail for Brevo (HTTP-based API to bypass Render SMTP block)
INSTALLED_APPS += [
    'anymail',
]

ANYMAIL = {
    "BREVO_API_KEY": os.getenv("BREVO_API_KEY"),
}

EMAIL_BACKEND = "anymail.backends.brevo.EmailBackend"
DEFAULT_FROM_EMAIL = os.getenv("MAIL_FROM", "noreply@vishleshan.ai")

