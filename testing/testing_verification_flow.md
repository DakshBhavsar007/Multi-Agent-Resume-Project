# Complete Project Verification & Testing Flow (Production Hosted)

Use this guide to verify that all modules of the **Vishleshan** platform are functioning properly on the hosted production environments.

* **Frontend**: `https://between.indevs.in`
* **Backend API**: `https://api.between.indevs.in`
* **Sample Resume PDF**: [sample_peter_parker_resume.pdf](file:///c:/Users/parul/Desktop/Resume%20Project/DAIICT_Hackathon-26/testing/sample_peter_parker_resume.pdf)
* **Sample Offer Letter PDF**: [stark_enterprises_offer_letter.pdf](file:///c:/Users/parul/Desktop/Resume%20Project/DAIICT_Hackathon-26/testing/stark_enterprises_offer_letter.pdf)
* **Sample Company Logo**: [stark_logo.png](file:///c:/Users/parul/Desktop/Resume%20Project/DAIICT_Hackathon-26/testing/stark_logo.png)
* **Sample Seeker Avatar**: [seeker_avatar.png](file:///c:/Users/parul/Desktop/Resume%20Project/DAIICT_Hackathon-26/testing/seeker_avatar.png)

---

## 🔑 Flow 1: Recruiter & ATS Verification

This flow tests company registration, job posting creation, and candidate management.

### Step 1.1: Recruiter Signup & Login
1. Navigate to: `https://between.indevs.in/register`.
2. Register a new recruiter account with the following values:
   - **Company Name**: `Stark Enterprises`
   - **Company Email**: `hr@starkenterprises.com`
   - **Password**: `StarkSecure2026!`
   - **HQ Location**: `New York, NY`
   - **Industry**: `Advanced Technology & Defense`
   - **Company Size**: `10,000+ employees`
   - **Founded Year**: `1967`
   - **Website URL**: `https://starkenterprises.com`
   - **About**: `Stark Enterprises is a global leader in advanced technology, engineering, and aerospace development.`
3. Log in with the registered credentials at `https://between.indevs.in/login`.
4. Go to **Company Settings** and upload [stark_logo.png](file:///c:/Users/parul/Desktop/Resume%20Project/DAIICT_Hackathon-26/testing/stark_logo.png) as your corporate brand identity.

### Step 1.2: Create a Job Posting
1. Go to **Sessions** -> **Create Session** (Job Posting).
2. Fill in the job posting form with these values:
   - **Job Title**: `Senior Python Backend Engineer`
   - **Job Description**:
     ```text
     We are seeking a Senior Python Backend Developer to join our core engineering team. You will be responsible for designing, building, and scaling our backend services, AI model pipelines, and data integration platforms.

     Key Responsibilities:
     - Design and implement robust, scalable, and secure RESTful APIs using Python, Django, and FastAPI.
     - Orchestrate complex background job execution queues using Celery and Redis.
     - Architect schema designs and write optimized queries for PostgreSQL databases.
     - Develop custom data ingestion and parsing systems utilizing libraries like PyMuPDF and pdfplumber.
     - Containerize backend services using Docker and manage deployments on AWS/GCP.

     Required Technical Skills:
     - Programming: Python (Expert)
     - Frameworks: Django, FastAPI, Celery
     - Databases & Caching: PostgreSQL, Redis, SQL
     - DevOps & Tools: Docker, Git, AWS
     - Document Parsing: PyMuPDF, pdfplumber

     Qualifications:
     - Bachelor's or Master's degree in Computer Science, Engineering, or a related field.
     - 5+ years of software development experience with at least 3 years focusing on Python backend engineering.
     ```
   - **Rounds Configuration**:
     - *Round 1*: `Resume Screening` (Type: Screening)
     - *Round 2*: `System Design Interview` (Type: Technical Interview)
     - *Round 3*: `HR & Fit Round` (Type: HR Interview)
   - **Inferred Skills (Weights)**:
     - `Python`: `5` (Required)
     - `Django`: `5` (Required)
     - `FastAPI`: `5` (Required)
     - `Celery`: `4` (Required)
     - `PostgreSQL`: `4` (Required)
     - `Redis`: `4` (Required)
     - `PyMuPDF`: `3` (Nice to have)
     - `pdfplumber`: `3` (Nice to have)
3. Click **Submit / Create Job Posting**.

---

## 💼 Flow 2: Job Seeker Verification

This flow tests profile setup, uploading the tailored resume, Job Search, AI Cover Letter, and Application Submission.

### Step 2.1: Job Seeker Signup & Login
1. Navigate to: `https://between.indevs.in/jobs/register`.
2. Register a job seeker account:
   - **Full Name**: `Peter Parker`
   - **Email**: `peter.parker@dailybugle.com`
   - **Password**: `WebShooter2026!`
   - **Phone**: `+1 555-0143`
   - **Location**: `Queens, NY`
3. Log in with your new seeker credentials.
4. Go to **Profile Settings** and upload [seeker_avatar.png](file:///c:/Users/parul/Desktop/Resume%20Project/DAIICT_Hackathon-26/testing/seeker_avatar.png) as your seeker photo.

### Step 2.2: Upload Tailored Resume
1. In your seeker profile, navigate to the **Upload Resume** section.
2. Select and upload the [sample_peter_parker_resume.pdf](file:///c:/Users/parul/Desktop/Resume%20Project/DAIICT_Hackathon-26/testing/sample_peter_parker_resume.pdf) generated in your project root's `testing` folder.
3. This resume contains the exact skills required (Python, Django, FastAPI, Celery, Redis, PostgreSQL, PyMuPDF, pdfplumber) and matching experience at Daily Bugle and Midtown Tech.

### Step 2.3: Job Search & Hiring Safety Check
1. Navigate to the Job Search page: `https://between.indevs.in/jobs/search`.
2. Search using parameters:
   - **Keywords**: `Python`
   - **Location**: `New York`
3. Find your created job **"Senior Python Backend Engineer"** at **Stark Enterprises**.
4. Before applying, click **Hiring Safety Checker**:
   - **Domain to Scan**: `starkenterprises.com`
   - **Job Description**: Paste the Stark Enterprises job description.
   - Verify that the detector outputs a high **Trust Score** and **Low Risk Level**.

### Step 2.4: Apply & Write with AI
1. On the Job Detail page, click **Apply**.
2. *Step 1*: Verify/edit candidate details. Click **Continue**.
3. *Step 2*: Verify active resume is selected. Click **Continue**.
4. *Step 3*: On the "Why this role?" page:
   - Click the **Write with AI** button.
   - Confirm that the AI Cover Letter generates successfully (integrating Python, Django, FastAPI, and other skills from the uploaded resume) and populates the cover letter field.
5. Click **Submit application**.
6. Verify you are redirected to the **Application Sent** confirmation screen.

---

## 🛠️ Flow 3: Recruiter ATS & Chatbot Management

Verify that the recruiter sees the seeker application and can use AI agents.

### Step 3.1: Candidate Review in ATS
1. Log back in as a Recruiter (`hr@starkenterprises.com`).
2. Open the `Senior Python Backend Engineer` job session.
3. Verify that **Peter Parker** appears in the `new` status column.
4. Click on **Peter Parker** to view candidate details:
   - Verify the calculated **Match Score** (should be high due to matching resume contents) and highlighted skills alignment.

### Step 3.2: AI Recruiter Chatbot
1. Navigate to the **AI Chatbot** tab in the session view.
2. Send the following query:
   - `Find candidates who know Django and have experience with backends.`
3. Verify that the agent correctly responds, referencing Peter Parker's candidate profile.

### Step 3.3: Authenticity & Plagiarism Scan
1. In the candidate view, click the **Authenticity Scan** tab.
2. Confirm the system triggers the Fraud Agent, showing the scan metrics.

---

## 🔄 Flow 4: Candidate Round Progression & Interview Testing

Verify candidate advancement through session rounds and proctored test mock tools.

### Step 4.1: Candidate Advancement (Round 1 -> Round 2)
1. In the Recruiter Dashboard, view **Peter Parker**'s candidate details.
2. Under the actions panel, click **Forward** to move the candidate to the next round (*Round 2: System Design Interview*).
3. Log back in as Job Seeker **Peter Parker** (or open the tab at `https://between.indevs.in/jobs/applications`).
4. Click **My Applications** from the header:
   - Under your application status for Stark Enterprises, you will see a newly generated **Start System Design Interview →** test button.
   - Below it, verify that the developer mock controls (`Mock Pass` and `Mock Fail`) are visible.

### Step 4.2: Attempt Round 2 (System Design Test)
1. Choose one of two methods to complete the round:
   - **Method A (Actual Test)**: Click **Start System Design Interview →**. Perform the AI assessment (either answering MCQ questions, submitting code, or talking to the AI interviewer).
   - **Method B (Mock Tool)**: Click the green **Mock Pass** button. This will simulate a successful test attempt with a high proctored score of `85%`.
2. Go back to the Recruiter dashboard under Stark Enterprises -> candidates:
   - Check Peter Parker's profile. Verify that his Round 2 status shows **Completed** with the score (e.g. `85%`) and the test answers/feedback are generated.

### Step 4.3: Candidate Hiring & Offer Letter Generation
1. In the Recruiter Dashboard candidate panel, click **Forward** to promote Peter Parker to *Round 3: HR & Fit Round*.
2. As a seeker, go to **My Applications** and click **Mock Pass** on the new test link.
3. Back in the Recruiter Dashboard candidate panel, click **Hire** (since it is the final round):
   - A modal to upload an offer letter will appear.
   - Select and upload the [stark_enterprises_offer_letter.pdf](file:///c:/Users/parul/Desktop/Resume%20Project/DAIICT_Hackathon-26/testing/stark_enterprises_offer_letter.pdf) from the `testing` folder.
   - Click **Save / Hire Candidate**.

### Step 4.4: Seeker Accepts Offer
1. Log back in as Job Seeker **Peter Parker** and navigate to `https://between.indevs.in/jobs/applications`.
2. Observe that your application status has updated to **Hired! 🎉**
3. Click the download link next to **Download Offer Letter** to retrieve the uploaded letter.
4. Click **Accept Offer** to complete the recruitment lifecycle.

---

## 💻 Flow 5: Developer SaaS API Verification

This flow tests the developer portal integrations, billing, and keys.

### Step 5.1: Developer Registration
1. Navigate to: `https://between.indevs.in/developer/register`.
2. Create a developer account:
   - **Company Name**: `Oscorp Tech`
   - **Developer Email**: `dev@oscorp.com`
   - **Password**: `GoblinFormula99!`
3. Log in at `https://between.indevs.in/developer/login`.

### Step 5.2: API Key Rotation & Usage
1. Click **API Keys** -> **Generate New Key**.
   - **Key Name**: `Production Ingestion Key`
   - **Environment**: `production`
2. Copy the generated API Key.
3. Check the **Subscription / Billing** tab:
   - Select the **Starter Plan** or **Business Plan**.
   - Verify the simulated payment flow/success banner works.
4. Click **Webhooks** -> **Create Webhook**:
   - **Webhook URL**: `https://api.oscorp.com/v1/webhooks`
   - **Event**: `candidate.parsed`
   - Verify the webhook saves successfully.
