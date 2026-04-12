#!/bin/bash
echo "Starting all Vishleshan services locally..."
echo "Requires PostgreSQL and Redis running locally."
echo ""

# Start backend API
uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
API_PID=$!

# Start Celery worker
celery -A workers.celery_worker worker --loglevel=info &
CELERY_PID=$!

echo ""
echo "============================================"
echo "  🚀 Vishleshan Backend Running"
echo "============================================"
echo "  Backend:  http://localhost:8000"
echo "  API Docs: http://localhost:8000/docs"
echo "  Health:   http://localhost:8000/health"
echo "============================================"
echo ""

# Wait for both to finish (Ctrl+C kills both)
trap "kill $API_PID $CELERY_PID 2>/dev/null; exit" INT TERM
wait
