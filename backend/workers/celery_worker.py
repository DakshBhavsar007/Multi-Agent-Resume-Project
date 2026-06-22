import socket
# Patch socket to force IPv4 and avoid IPv6 resolution hangs
orig_getaddrinfo = socket.getaddrinfo
def getaddrinfo_ipv4(host, port, family=0, type=0, proto=0, flags=0):
    return orig_getaddrinfo(host, port, socket.AF_INET, type, proto, flags)
socket.getaddrinfo = getaddrinfo_ipv4

import os
import sys

# Ensure the backend directory is in the Python pathway
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import django
# Initialize Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'vishleshan_backend.settings')
django.setup()

from celery import Celery
import asyncio
from pathlib import Path
import json
from datetime import datetime, timezone
import concurrent.futures
import fitz  # PyMuPDF
from docx import Document
import re
import uuid

from api.models import Candidate, Session as SessionModel, IngestJob, SkillTaxonomy

celery_app = Celery(
    "vishleshan",
    broker=os.getenv("REDIS_URL", "redis://localhost:6379"),
    backend=os.getenv("REDIS_URL", "redis://localhost:6379")
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    timezone="Asia/Kolkata",
    task_track_started=True,
    broker_connection_retry_on_startup=True
)

def _parse_resume_sync(file_path: str, skip_llm: bool = False) -> dict:
    """Synchronously extract text and parse a resume file using AI logic."""
    upload_dir = os.getenv("UPLOAD_DIR", "uploads")
    photo_dir = os.getenv("PHOTO_DIR", "photos")
    os.makedirs(photo_dir, exist_ok=True)

    ext = Path(file_path).suffix.lower()
    text = ""
    photo_path = None

    try:
        if ext == ".pdf":
            # Using PyMuPDF (fitz) instead of pdfplumber for blazing fast C++ extraction that avoids GIL lock
            doc = fitz.open(file_path)
            text_pages = []
            for page in doc:
                text_pages.append(page.get_text())
            text = "\n".join(text_pages)
                
            # --- GEMINI OCR FALLBACK FOR IMAGE-BASED PDFS ---
            if len(text.strip()) < 50:
                gemini_key = os.getenv("GEMINI_API_KEY")
                if gemini_key:
                    try:
                        import google.generativeai as genai
                        from PIL import Image
                        import io
                        
                        genai.configure(api_key=gemini_key)
                        model = genai.GenerativeModel('gemini-1.5-flash')
                        
                        doc = fitz.open(file_path)
                        ocr_text = []
                        for i in range(min(len(doc), 1)): # Only first page for speed (<10s budget)
                            page = doc[i]
                            pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
                            img_data = pix.tobytes("png")
                            img = Image.open(io.BytesIO(img_data))
                            
                            response = model.generate_content([
                                "Extract all standard text from this resume image exactly as written. Do not add markdown or conversational wrappers.", 
                                img
                            ])
                            ocr_text.append(response.text)
                        
                        if ocr_text:
                            text = "\n".join(ocr_text)
                    except Exception as e:
                        print("Gemini OCR Failed:", str(e))
            try:
                doc = fitz.open(file_path)
                for page in doc:
                    for img in page.get_images():
                        xref = img[0]
                        base = doc.extract_image(xref)
                        photo_path = f"{photo_dir}/{uuid.uuid4()}.jpg"
                        with open(photo_path, "wb") as f:
                            f.write(base["image"])
                        break
            except Exception:
                photo_path = None
        elif ext in [".docx", ".doc"]:
            doc = Document(file_path)
            parts = [para.text for para in doc.paragraphs if para.text.strip()]
            text = "\n".join(parts)
        else:
            with open(file_path, "r", errors="ignore") as f:
                text = f.read()

        # ── FAST REGEX EXTRACTION (always runs, <0.5s) ──────────────────
        email_re = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
        phone_re = r'[\+\(]?[0-9][0-9\s\-\(\)]{8,14}[0-9]'
        url_re = r'https?://(?:www\.)?linkedin\.com/in/[\w\-]+'
        github_re = r'https?://(?:www\.)?github\.com/[\w\-]+'
        exp_re = r'(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)\s+(?:of\s+)?(?:experience|exp)'

        emails = re.findall(email_re, text)
        phones = re.findall(phone_re, text)
        linkedin = re.search(url_re, text, re.IGNORECASE)
        github = re.search(github_re, text, re.IGNORECASE)
        exp_match = re.search(exp_re, text, re.IGNORECASE)

        # Extract name: first non-empty line that looks like a name (2 cap words)
        name = Path(file_path).stem
        for line in text.split("\n")[:10]:
            line = line.strip()
            words = line.split()
            if 1 < len(words) <= 6 and all(w[0].isupper() if w else True for w in words if w.isalpha()):
                name = line
                break

        # Extract skills: common tech stack keywords
        SKILL_KEYWORDS = [
            "Python","Java","JavaScript","TypeScript","C\\+\\+","C#","Go","Rust","Ruby","PHP","Swift","Kotlin",
            "React","Angular","Vue","Next\\.js","Node\\.js","Django","Flask","FastAPI","Spring","Laravel",
            "PostgreSQL","MySQL","MongoDB","Redis","SQLite","Oracle","Cassandra","DynamoDB",
            "AWS","GCP","Azure","Docker","Kubernetes","Terraform","Ansible","Jenkins","GitHub Actions",
            "TensorFlow","PyTorch","Scikit-learn","Pandas","NumPy","OpenCV","Hugging Face",
            "HTML","CSS","SCSS","Tailwind","Bootstrap","REST","GraphQL","gRPC","Kafka","RabbitMQ",
            "Git","Linux","Bash","PowerShell","Agile","Scrum","Jira","Figma","Photoshop"
        ]
        found_skills = []
        for sk in SKILL_KEYWORDS:
            if re.search(r'\b' + sk + r'\b', text, re.IGNORECASE):
                found_skills.append({"skill": sk.replace("\\", ""), "years": None, "level": None})

        # Simple location detection
        location_keywords = ["Bengaluru","Bangalore","Mumbai","Delhi","Hyderabad","Chennai","Pune","Remote","Kolkata",
                             "Noida","Gurgaon","Gurugram","Kochi","Kerala","New York","San Francisco","London","Singapore","Dubai"]
        location = None
        for loc in location_keywords:
            if loc.lower() in text.lower():
                location = loc
                break

        # Fallback Mock Data for UI presentation if LLM fails
        regex_parsed = {
            "name": name,
            "email": emails[0] if emails else None,
            "phone": phones[0].strip() if phones else None,
            "location": location or "Unknown",
            "linkedin_url": linkedin.group(0) if linkedin else None,
            "github_url": github.group(0) if github else None,
            "total_experience_years": float(exp_match.group(1)) if exp_match else 0.0,
            "skills": found_skills if found_skills else [],
            "experience": [],
            "education": [],
            "current_role": None
        }

        if skip_llm:
            return {
                "parsed": regex_parsed,
                "photo_path": photo_path,
                "raw_text_length": len(text),
                "parsing_method": "regex",
                "confidence": 0.7
            }

        # ── OPTIONAL LLM ENRICHMENT (skip on failure) ────────
        try:
            from agents.llm import RotateLLMClient
            import threading
            from dotenv import load_dotenv
            
            load_dotenv() # Load environment variables so keys exist

            client = RotateLLMClient()
            model_to_use = "gemini-1.5-flash"
            
            llm_result = [None]
            llm_error = [None]

            def call_llm():
                try:
                    SCHEMA = """{"name":str,"email":str|null,"phone":str|null,"location":str|null,
"summary":str|null,"gender":str|null,"date_of_birth":str|null,
"current_role":str|null,"linkedin_url":str|null,"github_url":str|null,
"total_experience_years":float,"skills":[{"skill":str,"years":float|null}],
"experience":[{"company":str,"role":str,"start_date":str,"end_date":str,"duration":str,"description":str}],
"education":[{"institution":str,"degree":str,"field":str,"year":str}],
"projects":[{"name":str,"description":str,"technologies":[str],"link":str}],
"certifications":[{"name":str,"issuer":str,"date":str}],
"awards":[str],"languages":[str]}"""
                    resp = client.chat.completions.create(
                        model=model_to_use,
                        response_format={"type": "json_object"},
                        messages=[
                            {"role": "system", "content": "You are an elite Resume parser. Extract EVERYTHING accurately. If unsure, leave as null but don't skip existing data. Projects, Certifications, and Summary are CRITICAL."},
                            {"role": "user", "content": f"Parse this resume into rich JSON. Schema:\n{SCHEMA}\n\nResume:\n{text[:4000]}"}
                        ],
                        temperature=0.0,
                        timeout=8
                    )
                    raw = resp.choices[0].message.content.strip().strip("```json").strip("```").strip()
                    llm_result[0] = json.loads(raw)
                except Exception as ex:
                    llm_error[0] = str(ex)

            t = threading.Thread(target=call_llm)
            t.start()
            t.join(timeout=7)  # hard cap: 7s so total stays <10s with overhead

            if llm_error[0]:
                print("LLM Error:", llm_error[0])

            if llm_result[0]:
                # Merge: LLM wins on fields it has, regex fills gaps
                parsed = llm_result[0]
                for field in ["email", "phone", "location", "linkedin_url", "github_url"]:
                    if not parsed.get(field) and regex_parsed.get(field):
                        parsed[field] = regex_parsed[field]
                if not parsed.get("skills"):
                    parsed["skills"] = regex_parsed["skills"]
                return {
                    "parsed": parsed,
                    "photo_path": photo_path,
                    "raw_text_length": len(text),
                    "parsing_method": "llm",
                    "confidence": 0.9
                }
        except Exception:
            pass

        # Fallback to regex result
        return {
            "parsed": regex_parsed,
            "photo_path": photo_path,
            "raw_text_length": len(text),
            "parsing_method": "regex",
            "confidence": 0.7
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        return {
            "parsed": {"name": Path(file_path).stem, "email": None, "phone": None, "location": "Unknown",
                       "skills": [], "experience": [], "education": [], "total_experience_years": 0.0, "current_role": None},
            "photo_path": photo_path,
            "parsing_method": "error_fallback",
            "confidence": 0.1
        }

def _normalize_skills_sync(raw_skills: list, db=None) -> list:
    """Delegates to the highly optimized V2 flat lookup normalization agent."""
    from agents.normalization_agent import _normalize_skills_sync as fast_normalize
    return fast_normalize(raw_skills, db)

@celery_app.task(bind=True, max_retries=2, name="process_resume_batch")
def process_resume_batch(self, job_id: str, file_paths: list, session_id: str, source: str = "upload", use_llm: bool = True):
    """Process resume files. Two-phase approach for speed:
       Phase 1: Fast regex-only parsing (all files, <0.3s each)
       Phase 2: Background LLM enrichment (if use_llm=True, staggered)
    """
    if not file_paths:
        try:
            job = IngestJob.objects.get(id=job_id)
            job.status = "done"
            job.completed_at = datetime.now(timezone.utc)
            job.save()
        except IngestJob.DoesNotExist:
            pass
        return

    try:
        job = IngestJob.objects.get(id=job_id)
        session_row = SessionModel.objects.get(id=session_id)
    except (IngestJob.DoesNotExist, SessionModel.DoesNotExist):
        return

    try:
        is_bulk = len(file_paths) > 10

        job.status = "processing"
        job.save()

        # Phase 1: For bulk uploads → regex-only (fast, <0.3s/file)
        # For small batches (<=10) and LLM enabled → full LLM parsing
        do_llm_inline = (not is_bulk) and use_llm

        def _process_one(path):
            return path, _parse_resume_sync(path, skip_llm=(not do_llm_inline))

        candidate_ids_for_enrichment = []

        criteria = session_row.criteria or {}
        min_match_score = criteria.get("min_match_score", 0)
        required_skills = criteria.get("required_skills", [])
        rounds = session_row.rounds or []
        first_round_order = rounds[0]["order"] if rounds else 0
        req_lower = [r.lower() for r in required_skills]

        with concurrent.futures.ThreadPoolExecutor(max_workers=min(len(file_paths), 30)) as executor:
            future_to_path = {executor.submit(_process_one, p): p for p in file_paths}
            
            for future in concurrent.futures.as_completed(future_to_path):
                path = future_to_path[future]
                try:
                    _, parsed_res = future.result()
                except Exception as e:
                    try:
                        active_job = IngestJob.objects.get(id=job_id)
                        active_job.failed_files = (active_job.failed_files or 0) + 1
                        errs = list(active_job.error_log or [])
                        errs.append(f"{Path(path).name}: {str(e)[:200]}")
                        active_job.error_log = errs
                        active_job.save()
                    except IngestJob.DoesNotExist:
                        pass
                    continue

                raw_data = parsed_res["parsed"]
                raw_skills = raw_data.get("skills", [])
                normalized_skills = _normalize_skills_sync(raw_skills)

                new_cand = Candidate(
                    session=session_row,
                    name=raw_data.get("name") or Path(path).stem,
                    email=raw_data.get("email"),
                    phone=raw_data.get("phone"),
                    location=raw_data.get("location"),
                    total_experience_years=float(raw_data.get("total_experience_years") or 0),
                    normalized_skills=normalized_skills,
                    raw_resume_data=parsed_res,
                    resume_file_path=path,
                    resume_photo_path=parsed_res.get("photo_path"),
                    current_round_index=first_round_order,
                    status="new",
                    source=source
                )

                # Simple rule-based match scoring if criteria exist
                if required_skills:
                    cand_skill_names = {
                        (s.get("canonical_skill") or s.get("skill") or s.get("raw_skill") or str(s)).lower()
                        if isinstance(s, dict) else str(s).lower()
                        for s in normalized_skills if s
                    }
                    matched_list = [r for r in required_skills if any(r.lower() in s for s in cand_skill_names)]
                    missing_list = [r for r in required_skills if r.lower() not in [m.lower() for m in matched_list]]
                    matched = len(matched_list)
                    skill_score = round((matched / len(req_lower)) * 100) if req_lower else 0
                    
                    # Experience score based on criteria min_experience
                    min_exp = criteria.get("min_experience", 0)
                    exp_years = float(raw_data.get("total_experience_years") or 0)
                    experience_score = min(100, round((exp_years / max(min_exp, 1)) * 100)) if min_exp > 0 else 50
                    
                    # Location score
                    preferred_locs = criteria.get("preferred_locations", [])
                    cand_location = (raw_data.get("location") or "").lower()
                    location_score = 100 if not preferred_locs else (100 if any(l.lower() in cand_location for l in preferred_locs) else 30)
                    
                    # Weighted overall score
                    weights = criteria.get("weights", {"skills": 0.5, "experience": 0.3, "location": 0.2})
                    score = round(
                        skill_score * weights.get("skills", 0.5) + 
                        experience_score * weights.get("experience", 0.3) + 
                        location_score * weights.get("location", 0.2)
                    )
                    score = min(100, score)
                    new_cand.match_score = score
                    new_cand.recommendation = "Strong" if score >= 70 else ("Moderate" if score >= 40 else "Weak")
                    new_cand.match_details = {
                        "match_score": score,
                        "skill_score": skill_score,
                        "experience_score": experience_score,
                        "location_score": location_score,
                        "matched_skills": matched_list,
                        "missing_skills": missing_list,
                        "matched_count": matched,
                        "total_required": len(req_lower)
                    }
                    if min_match_score > 0 and score < min_match_score:
                        new_cand.status = "rejected"

                new_cand.save()

                # Track candidates that need background LLM enrichment
                if is_bulk and use_llm and parsed_res.get("parsing_method") == "regex":
                    candidate_ids_for_enrichment.append(str(new_cand.id))

                try:
                    active_job = IngestJob.objects.get(id=job_id)
                    active_job.processed_files = (active_job.processed_files or 0) + 1
                    active_job.save()
                except IngestJob.DoesNotExist:
                    pass

        try:
            active_job = IngestJob.objects.get(id=job_id)
            active_job.status = "done"
            active_job.completed_at = datetime.now(timezone.utc)
            active_job.save()
        except IngestJob.DoesNotExist:
            pass

        # Phase 2: Fire background LLM enrichment for bulk-parsed candidates
        if candidate_ids_for_enrichment:
            # Stagger: process 5 at a time with 2s delay between batches
            for i in range(0, len(candidate_ids_for_enrichment), 5):
                batch = candidate_ids_for_enrichment[i:i+5]
                enrich_candidates_llm.apply_async(
                    args=[batch],
                    countdown=i // 5 * 2  # 0s, 2s, 4s, 6s...
                )

    except Exception as e:
        import traceback
        try:
            active_job = IngestJob.objects.get(id=job_id)
            active_job.status = "failed"
            active_job.error_log = [str(e), traceback.format_exc()]
            active_job.completed_at = datetime.now(timezone.utc)
            active_job.save()
        except IngestJob.DoesNotExist:
            pass
        raise e

@celery_app.task(name="enrich_candidates_llm", max_retries=1)
def enrich_candidates_llm(candidate_ids: list):
    """Phase 2: Background LLM enrichment for candidates that were parsed with regex-only.
    Re-parses the resume file through the full LLM pipeline and merges richer data back.
    """
    for cid in candidate_ids:
        try:
            cand = Candidate.objects.get(id=cid)
            if not cand.resume_file_path:
                continue

            # Check if already enriched
            raw = cand.raw_resume_data or {}
            if raw.get("parsing_method") == "llm":
                continue

            # Re-parse with LLM
            enriched = _parse_resume_sync(cand.resume_file_path, skip_llm=False)
            if enriched.get("parsing_method") != "llm":
                continue  # LLM failed, keep regex data

            parsed = enriched["parsed"]

            # Merge: update candidate fields with richer LLM data
            if parsed.get("name") and parsed["name"] != Path(cand.resume_file_path).stem:
                cand.name = parsed["name"]
            if parsed.get("email"):
                cand.email = parsed["email"]
            if parsed.get("phone"):
                cand.phone = parsed["phone"]
            if parsed.get("location") and parsed["location"] != "Unknown":
                cand.location = parsed["location"]
            if parsed.get("total_experience_years"):
                cand.total_experience_years = float(parsed["total_experience_years"])

            # Re-normalize skills from LLM output
            llm_skills = parsed.get("skills", [])
            if llm_skills:
                cand.normalized_skills = _normalize_skills_sync(llm_skills)

            # Update raw_resume_data with enriched version
            cand.raw_resume_data = enriched
            cand.save()

            # Recalculate match score with the newly enriched data
            try:
                from api.views.jobs import _calculate_match_score
                _calculate_match_score(cand, cand.session)
            except Exception as score_ex:
                print(f"[LLM Enrich] Score recalculation failed for {cid}: {score_ex}")
        except Candidate.DoesNotExist:
            continue
        except Exception as e:
            print(f"[LLM Enrich] Failed for {cid}: {e}")

@celery_app.task(name="sync_gmail_resumes")
def sync_gmail_resumes(session_id: str, job_id: str):
    try:
        session_row = SessionModel.objects.get(id=session_id)
        job = IngestJob.objects.get(id=job_id)
    except (SessionModel.DoesNotExist, IngestJob.DoesNotExist):
        return

    if not session_row.gmail_tokens:
        job.status = "failed"
        job.error_log = ["Gmail not connected"]
        job.save()
        return

    try:
        import google.oauth2.credentials
        from googleapiclient.discovery import build
        creds = google.oauth2.credentials.Credentials(**session_row.gmail_tokens)
        service = build('gmail', 'v1', credentials=creds)

        query = "has:attachment filename:(pdf OR docx OR txt) subject:(resume OR CV OR application)"
        results = service.users().messages().list(userId='me', q=query, maxResults=50).execute()
        messages = results.get('messages', [])

        save_dir = os.path.join(os.getenv("UPLOAD_DIR", "uploads"), session_id)
        os.makedirs(save_dir, exist_ok=True)
        downloaded = []

        for msg in messages:
            msg_id = msg['id']
            message_data = service.users().messages().get(userId='me', id=msg_id).execute()
            parts = message_data.get('payload', {}).get('parts', [])
            for part in parts:
                filename = part.get('filename', '')
                if filename and (filename.lower().endswith('.pdf') or filename.lower().endswith('.docx') or filename.lower().endswith('.txt')):
                    att_id = part['body'].get('attachmentId')
                    if att_id:
                        import base64
                        att = service.users().messages().attachments().get(userId='me', messageId=msg_id, id=att_id).execute()
                        file_data = base64.urlsafe_b64decode(att['data'].encode('UTF-8'))
                        file_path = os.path.join(save_dir, f"{msg_id}_{filename}")
                        with open(file_path, 'wb') as f:
                            f.write(file_data)
                        downloaded.append(file_path)

        if downloaded:
            job.total_files = len(downloaded)
            job.save()
            process_resume_batch.delay(job_id, downloaded, session_id, "gmail")
        else:
            job.status = "done"
            job.completed_at = datetime.now(timezone.utc)
            job.save()

    except Exception as e:
        job.status = "failed"
        job.error_log = [str(e)]
        job.completed_at = datetime.now(timezone.utc)
        job.save()

@celery_app.task(name="sync_gdrive_resumes")
def sync_gdrive_resumes(session_id: str, job_id: str):
    try:
        session_row = SessionModel.objects.get(id=session_id)
        job = IngestJob.objects.get(id=job_id)
    except (SessionModel.DoesNotExist, IngestJob.DoesNotExist):
        return

    if not session_row.gdrive_tokens:
        job.status = "failed"
        job.error_log = ["Google Drive not connected"]
        job.save()
        return

    try:
        import google.oauth2.credentials
        from googleapiclient.discovery import build
        creds = google.oauth2.credentials.Credentials(**session_row.gdrive_tokens)
        service = build('drive', 'v3', credentials=creds)

        save_dir = os.path.join(os.getenv("UPLOAD_DIR", "uploads"), session_id)
        os.makedirs(save_dir, exist_ok=True)

        query = "mimeType='application/pdf' or mimeType='application/vnd.openxmlformats-officedocument.wordprocessingml.document' or mimeType='text/plain'"
        if session_row.gdrive_folder_id:
            query = f"'{session_row.gdrive_folder_id}' in parents and ({query})"

        results = service.files().list(q=query, pageSize=100, fields="files(id, name)").execute()
        files = results.get('files', [])

        downloaded = []
        for f in files:
            try:
                import io
                from googleapiclient.http import MediaIoBaseDownload
                request = service.files().get_media(fileId=f['id'])
                file_path = os.path.join(save_dir, f"{f['id']}_{f['name']}")
                fh = io.FileIO(file_path, 'wb')
                downloader = MediaIoBaseDownload(fh, request)
                done = False
                while not done:
                    _, done = downloader.next_chunk()
                fh.close()
                downloaded.append(file_path)
            except Exception:
                pass

        if downloaded:
            job.total_files = len(downloaded)
            job.save()
            process_resume_batch.delay(job_id, downloaded, session_id, "gdrive")
        else:
            job.status = "done"
            job.completed_at = datetime.now(timezone.utc)
            job.save()

    except Exception as e:
        job.status = "failed"
        job.error_log = [str(e)]
        job.completed_at = datetime.now(timezone.utc)
        job.save()

@celery_app.task(name="match_all_candidates")
def match_all_candidates(session_id: str, job_id: str):
    try:
        session_row = SessionModel.objects.get(id=session_id)
        job = IngestJob.objects.get(id=job_id)
    except (SessionModel.DoesNotExist, IngestJob.DoesNotExist):
        return

    criteria = session_row.criteria or {}
    min_match_score = criteria.get("min_match_score", 0)
    required_skills = criteria.get("required_skills", [])
    req_lower = [r.lower() for r in required_skills]

    candidates = Candidate.objects.filter(session_id=session_id)
    total_count = candidates.count()
    job.total_files = total_count
    job.processed_files = 0
    job.status = "processing"
    job.save()

    processed_count = 0
    for cand in candidates:
        norm_skills = cand.normalized_skills or []
        cand_skill_names = {
            (s.get("canonical_skill") or s.get("skill") or s.get("raw_skill") or str(s)).lower()
            if isinstance(s, dict) else str(s).lower()
            for s in norm_skills if s
        }
        matched_list = [r for r in required_skills if any(r.lower() in s for s in cand_skill_names)]
        missing_list = [r for r in required_skills if r.lower() not in [m.lower() for m in matched_list]]
        matched = len(matched_list)
        skill_score = round((matched / len(req_lower)) * 100) if req_lower else 0

        # Experience score
        min_exp = criteria.get("min_experience", 0)
        exp_years = float(cand.total_experience_years or 0)
        experience_score = min(100, round((exp_years / max(min_exp, 1)) * 100)) if min_exp > 0 else 50

        # Location score
        preferred_locs = criteria.get("preferred_locations", [])
        cand_location = (cand.location or "").lower()
        location_score = 100 if not preferred_locs else (100 if any(l.lower() in cand_location for l in preferred_locs) else 30)

        # Weighted overall score
        weights = criteria.get("weights", {"skills": 0.5, "experience": 0.3, "location": 0.2})
        score = round(
            skill_score * weights.get("skills", 0.5) + 
            experience_score * weights.get("experience", 0.3) + 
            location_score * weights.get("location", 0.2)
        )
        score = min(100, score)
        cand.match_score = score
        cand.recommendation = "Strong" if score >= 70 else ("Moderate" if score >= 40 else "Weak")
        cand.match_details = {
            "match_score": score,
            "skill_score": skill_score,
            "experience_score": experience_score,
            "location_score": location_score,
            "matched_skills": matched_list,
            "missing_skills": missing_list,
            "matched_count": matched
        }
        if min_match_score > 0 and score < min_match_score:
            cand.status = "rejected"
        
        cand.save()
        processed_count += 1
        job.processed_files = processed_count
        job.save()

    job.status = "done"
    job.completed_at = datetime.now(timezone.utc)
    job.save()

@celery_app.task(name="release_round_results")
def release_round_results(application_id: str, notify_status: str):
    from api.models import JobApplication, Notification
    from api.services.email_service import send_status_update_to_seeker
    import logging
    logger = logging.getLogger(__name__)

    try:
        app = JobApplication.objects.filter(id=application_id).select_related('seeker', 'session').first()
        if not app:
            logger.warning(f"release_round_results: Application {application_id} not found")
            return

        # Update application status
        app.status = notify_status
        app.save(update_fields=['status'])

        # Create in-app notification
        Notification.objects.create(
            seeker=app.seeker,
            type='status_updated',
            title=f'Application Update — {app.session.job_title}',
            message=f'Your application at {app.session.name} has been updated to: {notify_status.title()}.',
            link=f'/jobs/applications?app_id={app.id}',
        )

        # Send email
        send_status_update_to_seeker(
            seeker_email=app.seeker.email,
            seeker_name=app.seeker.full_name,
            job_title=app.session.job_title,
            company_name=app.session.name,
            new_status=notify_status,
        )
        logger.info(f"release_round_results: Released status {notify_status} for app {application_id}")
    except Exception as e:
        logger.error(f"release_round_results failed: {e}")

# Celery app alias
app = celery_app
