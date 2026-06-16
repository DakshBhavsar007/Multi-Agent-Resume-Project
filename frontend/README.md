# Vishleshan Frontend — Recruiter Dashboard

This is the Applicant Tracking System (ATS) interface for recruiters.

## Setup
```bash
cd frontend
npm install
cp .env.local.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1 (or your backend port)
npm run dev
# Opens at http://localhost:5173 (default Vite port)
```

## Key Folders & Files
- `src/lib/api.js`       → All API endpoints and interceptor handling.
- `src/stores/`          → Zustand state management (`authStore.js`).
- `src/pages/`           → Pages matching routing endpoints.
- `src/components/`      → Reusable UI components (like navigation, layout, cards).
- `src/App.jsx`          → App routing and setup.

## Session Management & Backend Connection
- **Session Redirection**: Logged-in users (detected by `vish_jwt` in `localStorage`) are automatically redirected to `/dashboard` when visiting `/login` or clicking Call-To-Action buttons on the landing page `/`.
- **API Headers**: All backend requests fetch the `X-API-Key` and `Authorization` Bearer tokens from `localStorage`.
- **Automatic Logout**: If an API call receives a `401 Unauthorized` status code, the application automatically clears storage and redirects to `/login`.

## Pages & Routing (`src/App.jsx`)
- `/`                            → Landing page (dynamically adjusts to show "Dashboard" if logged in)
- `/login`                       → Sign In page (auto-redirects to `/dashboard` if already logged in)
- `/register`                    → Create Account page (auto-redirects to `/dashboard` if already logged in)
- `/dashboard`                   → Overview
- `/dashboard/sessions`          → All recruitment sessions
- `/dashboard/sessions/new`      → Create a new recruitment session
- `/dashboard/sessions/:id`      → Session workspace (ingestion, chat, analysis)
- `/dashboard/smart-analyzer`    → Custom analysis tools
- `/dashboard/settings`          → API keys generation and profile management
