# Vishleshan (Between) - Industry Faculty Presentation Guide

Welcome, External Faculty Members! This guide details the core engineering components, machine learning algorithms, and security detection engines implemented in the project.

---

## 1. Core System Architecture & Features

This platform is a secure, AI-powered Applicant Tracking System (ATS) designed to automate resume parsing, semantic ranking, and talent pool segmentation, while protecting the integrity of the recruitment process using biometric keystroke telemetry.

### Key Features to Showcase:
1. **AI Resume Parser & Ingester**: Converts unstructured PDF/Docx resumes into structured JSON profiles (skills, experience, contact).
2. **Semantic Candidate Matching**: Replaced traditional keyword searching with a TF-IDF Cosine Similarity engine that ranks candidates by semantic relevance to a Job Description.
3. **Unsupervised Talent Pool Clustering**: Groups candidates into semantic pools (e.g. Backend, Frontend, Cloud Infra) using K-Means clustering without pre-labeled data.
4. **Biometric Fraud Detection Agent**: Evaluates candidate keystroke dynamics (hold/flight latencies) during online test rounds using a trained **Isolation Forest** anomaly detector to identify automation scripts, macro-typists, and copy-paste behavior.

---

## 2. Running the Integrated ML & Verification Demo

To demonstrate the mathematical models and detection algorithms in 2 seconds, run the consolidated test runner:

```bash
python testing/run_demo_suite.py
```

### What the Demo Suite Demonstrates:
* **Job Matching**: Takes a backend job description and 4 candidate skill profiles, and ranks them by cosine similarity.
* **Unsupervised Clustering**: Segments backend and frontend candidates into their respective talent pools automatically.
* **Biometric Telemetry**: Runs typing latency streams through the Isolation Forest outlier detector, correctly identifying bots/macro scripts.

---

## 3. Step-by-Step UI Verification Guide

To show the live system to industry experts:

### Step 1: Start Backend & Frontend Servers
* Backend: `python manage.py runserver` (Port 8000)
* Frontend: `npm run dev` (Port 5173)

### Step 2: Showcase Candidate Clustering (Recruiter Dashboard)
* Log in as a Recruiter.
* Create/select a workspace session, and click the **"Clusters"** tab.
* Demonstrate how the candidates are automatically segmented into semantic groups with corresponding match scores.

### Step 3: Showcase Developer API Docs & Interactive Playground
* Navigate to the Developer API Docs page.
* Point out the dynamic pricing plans, sections, and the live **"Try It"** playground.
* Execute a test call against the `/api/v1/sessions/:session_id/candidate-clusters` endpoint directly from the browser documentation playground.

### Step 4: System Health Check
* Open `http://127.0.0.1:8000/health` to show the diagnostic status of active systems, API integrations, and database connections.
