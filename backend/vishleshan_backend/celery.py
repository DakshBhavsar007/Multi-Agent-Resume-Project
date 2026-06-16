import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'vishleshan_backend.settings')

app = Celery('vishleshan')

# Read settings from Django settings using CELERY_ namespace
app.config_from_object('django.conf:settings', namespace='CELERY')

# Discover tasks from all registered apps (e.g. from api/tasks.py or manually imported modules)
app.autodiscover_tasks()
