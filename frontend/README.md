# Vishleshan Frontend — Recruiter Dashboard

## Setup
```bash
cd vishleshan/frontend
npm install
cp .env.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
npm run dev
# Opens at http://localhost:3000
```

## With Docker
From vishleshan/ root:
```bash
docker-compose up frontend
```

## Key Files
- `lib/api.js`     → ALL API calls go here only
- `stores/`        → Zustand state management
- `app/dashboard/` → All protected pages

## Backend Connection
All calls use X-API-Key header from localStorage.
API key is saved after login/register.

## Pages
- `/login`                        → Login
- `/register`                     → Create account  
- `/dashboard`                    → Overview
- `/dashboard/sessions`           → All sessions
- `/dashboard/sessions/new`       → Create session
- `/dashboard/sessions/[id]`      → Session workspace
- `/dashboard/settings`           → API keys + profile
