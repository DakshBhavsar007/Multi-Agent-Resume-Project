import os
from pathlib import Path
import dj_database_url
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables
load_dotenv(BASE_DIR / ".env")

SECRET_KEY = os.getenv("JWT_SECRET", "django-insecure-supersecretkey-change-this")

DEBUG = True

ALLOWED_HOSTS = ["*"]

INSTALLED_APPS = [
    'django.contrib.contenttypes',
    'django.contrib.staticfiles',
    'corsheaders',
    'api',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'api.middleware.UsageLoggerMiddleware',
]

ROOT_URLCONF = 'vishleshan_backend.urls'

TEMPLATES = []

WSGI_APPLICATION = 'vishleshan_backend.wsgi.application'
ASGI_APPLICATION = 'vishleshan_backend.asgi.application'

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:password@localhost:5432/vishleshan")
# Convert asyncpg to standard postgresql engine for Django ORM
SYNC_DATABASE_URL = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")

DATABASES = {
    'default': dj_database_url.parse(
        SYNC_DATABASE_URL,
        conn_max_age=600,
        conn_health_checks=True,
    )
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
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True
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

