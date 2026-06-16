<div align="center">
  <img src="./assets/hero_banner.png" alt="Vishleshan API Banner" width="100%" />

  <h1 align="center">Vishleshan — Recruitment Intelligence & Protection Infrastructure</h1>

  <p align="center">
    <strong>A high-performance semantic resume parsing, AI candidate matching, and fraud protection engine built for enterprise HR and job seekers.</strong>
  </p>

  <p align="center">
    <a href="#architecture">Architecture</a> •
    <a href="#features">Features</a> •
    <a href="#quick-start">Quick Start</a> •
    <a href="#developer-portal">Developer Portal</a> •
    <a href="#api-reference">API Reference</a>
  </p>
</div>

---

## ⚡ Overview

**Vishleshan** is a state-of-the-art backend infrastructure and API ecosystem engineered to automate recruitment data ingestion and protect the hiring pipeline. Utilizing advanced Local LLMs, Vector Databases, and Semantic Retrieval engines, it transforms unstructured PDFs, Word documents, and text files into rich, actionable JSON candidate profiles—all instantly queryable via natural language.

In addition to deep data extraction, Vishleshan provides an **Advanced Fraud Detection & Safety Audit System** to protect recruiters from fake candidate profiles/ATS manipulations, and to shield job seekers from fraudulent, clone, or phishing job postings.

---

## ✨ Core Capabilities & Latest Updates

- **Advanced Fraud Detection (Recruiters)**: Screen candidate resume files and GitHub portfolios for AI generation probability, plagiarism patterns, and hidden ATS tricks (such as white-text keyword stuffing).
- **Job Seeker Safety Verification**: Public-facing checks that allow job seekers to inspect company postings, verify their safety score, and query arbitrary companies with real-time company auto-suggestions and JDs autofill.
- **Developer API Fraud Scan Limits**: Developer API keys can execute Safety Scans `/api/v1/protection/scan` programmatically. Plan limits are enforced in Redis:
  - **Free**: 0 Safety scans/month
  - **Starter**: 100 Safety scans/month
  - **Business**: 1,000 Safety scans/month
- **Unified Developer Dashboard**: A unified React SPA dashboard mapping API call volumes, error rates, latencies, and Safety Scans metrics in a premium traffic chart.
- **AI-Powered Search Autocomplete**: The Job Seeker portal matches inputs against active job postings in real time to suggest relevant titles and locations.
- **Smart Location State Mapping**: Indian tech hubs automatically append corresponding states (e.g., searching `Bangalore` or `Bengaluru` returns `Bengaluru, Karnataka`).
- **Company Profile Logos**: Recruiters can upload corporate logos (Base64) inside Settings, which sync dynamically and reactively with the sidebar and settings preview.

---

## 🧩 Architectural Ecosystem

Vishleshan is built as a highly robust, multi-app monorepo:

1. **`backend/` - The AI Engine** (Django, Postgres, Redis, ChromaDB, Celery)
   - Handles strict JWT and API Key Authentication.
   - Synchronous and asynchronous parsing via advanced Worker queues.
   - Embeds candidate histories into specialized vector embeddings for sub-millisecond semantic match scoring against JD profiles.
   - Runs LLM agents for candidate evaluation and safety audit scans.
   - Manages rate-limiting and monthly plan limits securely via Redis.

2. **`frontend/` - Unified Recruiter & Developer Dashboard** (React / Vite, Tailwind, Zustand)
   - **Applicant Tracking System (ATS)**: Drag-and-drop resume ingestion, candidate evaluation, and portfolio verification.
   - **Job Seeker Safety Hub**: Real-time company autocompletes, safety score metrics, and phishing alerts.
   - **Developer Portal**: API Keys management, Webhooks logging, Razorpay-based billing plans (Free, Starter, Business), and dynamic Recharts traffic graphs displaying safety scans alongside parses, matches, and chat queries.

---

## 📸 Platform Highlights

### Interactive Applicant Tracking System (ATS)
Our internal operational interface mapped specifically for recruitment leads. Complete with AI evaluation panels, granular match dials, and candidate filtering.

<div align="center">
  <img src="./assets/ats_dashboard.png" alt="ATS Dashboard" width="100%" />
</div>

### Scalable Developer SaaS Portal
Monetize your AI model. Empower client engineering teams to configure their own integration points, inspect parse latencies across their endpoints, and scale API access reliably.

<div align="center">
  <img src="./assets/dev_portal.png" alt="Developer SDK Portal" width="100%" />
</div>

---

## 🚀 Quick Start

### 1. Requirements
- Node.js `v18+`
- Python `v3.10+`
- PostgreSQL, Redis, Chroma DB (running locally or remotely)

### 2. Backend Setup
Configure your local environment and run the services.
```bash
cd backend
cp .env.example .env

# Install Python dependencies
pip install -r requirements.txt

# Configure environment variables in `.env`:
# Set GEMINI_API_KEYS with a comma-separated list of your Gemini API keys
# Set GEMINI_MODEL=gemini-2.5-flash for optimized free tier quota usage

# Run Database Migrations
python manage.py migrate --fake-initial

# Seed the Skill Taxonomy table (one-time)
python manage.py seed_skills

# Run the Django Dev Server
python manage.py runserver 8000

# Run the Celery Worker (using multi-threaded pool on Windows for speed)
celery -A workers.celery_worker worker --loglevel=info --pool=threads --concurrency=4
```

### 3. Frontend Application (ATS, Seeker Portal & Developer Portal)
Operates the main recruiter tool, seeker portal, and developer portal in a single React SPA.
```bash
cd ../frontend
npm install
cp .env.local.example .env.local
npm run dev
```

---

## 💻 API Integration Preview

Integrating your existing HR system with the Vishleshan ingestion and fraud detection engine takes just seconds.

### Synchronous Resume Ingestion
```bash
curl -X POST "https://api.vishleshan.ai/api/v1/parse" \
  -H "X-API-Key: vish_live_xxxxxxxxxxx" \
  -F "file=@johndoe_resume.pdf"
```
```json
{
  "success": true,
  "data": {
    "candidate_id": "cnd_9248239a",
    "name": "John Doe",
    "email": "johndoe@email.com",
    "skills": ["Distributed Systems", "Go", "Python"],
    "experience_years": 4.5
  }
}
```

### Programmatic Fraud & Safety Auditing
```bash
curl -X POST "https://api.vishleshan.ai/api/v1/protection/scan" \
  -H "X-API-Key: vish_live_xxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "scan_type": "job",
    "job_title": "Frontend Developer",
    "job_description": "Seeking React developer to work from home..."
  }'
```
```json
{
  "success": true,
  "data": {
    "originality_score": 94,
    "ai_probability": 6,
    "plagiarism_score": 5,
    "status": "Verified Clean",
    "portfolios": ["React Project Showcase"],
    "summary": "Document is original with low AI probability."
  }
}
```

---

## 🛡️ License & Attributions
Engineered and designed explicitly for optimal processing, zero-downtime, and elegant enterprise integration patterns. Restricted commercial licensure.

**Team Vision x** | *Building the Next Generation of Recruitment Intelligence.*
