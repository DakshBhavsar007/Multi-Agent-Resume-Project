#!/bin/bash
echo "Starting Celery Worker..."
cd /app
celery -A workers.celery_worker worker \
  --loglevel=info --concurrency=4
