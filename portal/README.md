# Vishleshan Developer Portal

## Setup
\`\`\`bash
cd vishleshan/portal
npm install
cp .env.example .env.local
\`\`\`

**.env.local:**
\`\`\`env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_RAZORPAY_KEY=rzp_test_your_key
\`\`\`

\`\`\`bash
npm run dev 
# View at http://localhost:3001
\`\`\`

## With Docker
From the `vishleshan/` root monorepo path:
\`\`\`bash
docker-compose up portal
\`\`\`

## Purpose
This is the developer-facing SaaS portal where client corporations and developers can:
- Register for an account and obtain API keys
- View deep usage analytics of their API traffic and limits
- Manage Webhooks for asynchronous processing 
- Get Embed UI codes to implant the Vishleshan UI directly into their host HRMS platform

## Key Technical Integrations
- `lib/portalApi.js` → Comprehensive Axios API client for handling all REST communication strictly via `Bearer {jwt}` authentication.
- `stores/portalAuthStore.js` → Fully hydrated global Zustand store holding explicit `company_name`, `tier`, and JSON Web Tokens directly integrated with standard frontend reactivity patterns.

## Complete Pages Architecture
- `/`                      → Standard marketing landing page.
- `/login`                 → Simple developer login mechanism.
- `/register`              → Highly robust 3-step payment onboarding & API key revealing funnel.
- `/portal/dashboard`      → Central usage overview mapping percentages and timeline charts via `recharts`.
- `/portal/keys`           → API key generation/revocation management layout equipped with Live/Test separation.
- `/portal/usage`          → Granular, downloadable analytics endpoints sorted by error_rate and latency metrics.
- `/portal/webhooks`       → Payload configuration endpoint delivery routing and synchronous testing dashboards.
- `/portal/embed`          → Embed widget scoping for cross-origin whitelisting.
- `/portal/billing`        → Plans and subscription Razorpay bindings.
- `/portal/settings`       → Developer profile and workspace deletion functions.
- `/portal/docs`           → Integrated deep documentation matching Live requests to standard endpoint syntax schemas.

## Connecting to Backend API Protocol
- **Backend URL Base:** `http://localhost:8000`
- **Frontend Auth (Portal):** `Authorization: Bearer {portal_jwt}` 
- All platform API responses resolve explicitly to standardized formatting `{ success, data, error }`.
