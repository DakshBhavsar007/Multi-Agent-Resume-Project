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
import base64

from api.models import Candidate, Session as SessionModel, IngestJob, SkillTaxonomy

redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
if redis_url.startswith("rediss://") and "ssl_cert_reqs" not in redis_url:
    if "?" in redis_url:
        redis_url += "&ssl_cert_reqs=none"
    else:
        redis_url += "?ssl_cert_reqs=none"

celery_app = Celery(
    "vishleshan",
    broker=redis_url,
    backend=redis_url
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
                from agents.llm import get_available_gemini_key, record_gemini_usage
                gemini_key, gemini_project = get_available_gemini_key()
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
                            record_gemini_usage(gemini_project)
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

        # ── IMPROVED REGEX EXTRACTION (always runs as fallback) ──────────────────
        email_re = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
        phone_re = r'[\+\(]?[0-9][0-9\s\-\(\)]{8,14}[0-9]'
        url_re = r'https?://(?:www\.)?linkedin\.com/in/[\w\-]+'
        github_re = r'https?://(?:www\.)?github\.com/[\w\-]+'

        emails = re.findall(email_re, text)
        phones = re.findall(phone_re, text)
        linkedin = re.search(url_re, text, re.IGNORECASE)
        github = re.        # ── Name extraction (handles ALL CAPS, skips email/phone/URL lines) ──
        name = Path(file_path).stem
        email_set = set(e.lower() for e in emails)
        for line in text.split("\n")[:15]:
            line = line.strip()
            if not line or len(line) > 60 or len(line) < 3:
                continue
            if any(e in line.lower() for e in email_set):
                continue
            if re.search(r'[\+\(]?\d[\d\s\-\(\)]{8,}', line):
                continue
            if re.search(r'https?://', line):
                continue
            if any(kw in line.lower() for kw in ['summary', 'objective', 'experience', 'education', 'skills', 'resume', 'curriculum', 'profile', 'portfolio']):
                continue
            words = line.split()
            alpha_words = [w for w in words if re.match(r'^[A-Za-z\.\-\']+$', w)]
            if 1 < len(alpha_words) <= 5 and len(alpha_words) == len(words):
                if all(w[0].isupper() for w in alpha_words):
                    if all(c.isupper() or not c.isalpha() for c in line):
                        name = line.title()
                    else:
                        name = line
                    break

        # Fallback for name if it still equals raw filename stem
        if name == Path(file_path).stem or len(name.strip()) == 0:
            stem = Path(file_path).stem
            clean_stem = re.sub(r'^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}_', '', stem, flags=re.IGNORECASE)
            clean_stem = re.sub(r'^[a-f0-9\-]{36}_', '', clean_stem, flags=re.IGNORECASE)
            clean_stem = re.sub(r'^resume_\d+_', '', clean_stem, flags=re.IGNORECASE)
            clean_stem = re.sub(r'[_\-]+', ' ', clean_stem).strip()
            if clean_stem:
                name = clean_stem.title()

        # ── Experience years (multiple patterns + date range calculation) ──
        total_exp_years = 0.0
        exp_patterns = [
            r'(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)[\s,]+(?:of\s+)?(?:experience|exp)',
            r'(?:experience|exp)[\s:]+?(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)',
            r'(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)\s+(?:in|of|across|working|building|developing|as)',
            r'(?:over|nearly|approximately|about|around|with)\s+(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)',
            r'(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)\s+(?:senior|professional|industry|software)',
        ]
        for pat in exp_patterns:
            m = re.search(pat, text, re.IGNORECASE)
            if m:
                total_exp_years = float(m.group(1))
                break

        # Fallback 1: sum durations like "(3 yrs)" in experience entries
        if total_exp_years == 0:
            duration_matches = re.findall(r'\((\d+(?:\.\d+)?)\s*(?:years?|yrs?)\)', text, re.IGNORECASE)
            if duration_matches:
                total_exp_years = sum(float(d) for d in duration_matches)

        # Fallback 2: Year ranges like "2018 - 2023", "2019 to Present"
        if total_exp_years == 0:
            yr_ranges = re.findall(r'\b(19\d{2}|20\d{2})\s*[\-\u2013\u2014to]+\s*(19\d{2}|20\d{2}|Present|Current|Now|Ongoing)\b', text, re.IGNORECASE)
            if yr_ranges:
                diffs = []
                for sy, ey in yr_ranges:
                    try:
                        s = int(sy)
                        e = datetime.now().year if ey.lower() in ['present', 'current', 'now', 'ongoing'] else int(ey)
                        if 0 <= (e - s) <= 35:
                            diffs.append(e - s)
                    except Exception:
                        pass
                if diffs:
                    total_exp_years = float(max(diffs))

        # Fallback 3: Any "X+ years" or "X yrs" in top summary
        if total_exp_years == 0:
            gen_m = re.search(r'\b(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)\b', text[:2000], re.IGNORECASE)
            if gen_m:
                try:
                    v = float(gen_m.group(1))
                    if 0.5 <= v <= 35:
                        total_exp_years = v
                except Exception:
                    pass

        # ── Skills extraction (expanded: 150+ tech keywords) ──
        SKILL_KEYWORDS = [
            # Languages
            "Python","Java","JavaScript","TypeScript","C\\+\\+","C#","Go","Rust","Ruby","PHP",
            "Swift","Kotlin","Scala","R","Perl","Dart","Elixir","Haskell","Clojure","Lua",
            # Frontend
            "React","Angular","Vue","Next\\.js","Nuxt\\.js","Svelte","Gatsby","Remix",
            "Redux","Redux Toolkit","MobX","Zustand","Recoil",
            "Framer Motion","GSAP","Three\\.js","D3\\.js","Chart\\.js",
            "Webpack","Vite","Rollup","Parcel","Babel","esbuild","Storybook",
            # Backend
            "Node\\.js","Express\\.js","Express","NestJS","Fastify","Koa","Hapi",
            "Django","Flask","FastAPI","Celery","Gunicorn","Uvicorn",
            "Spring","Spring Boot","Hibernate","Maven","Gradle",
            "Laravel","Symfony","Ruby on Rails",
            "ASP\\.NET","\\.NET",
            "GraphQL","REST","gRPC","WebSockets","Socket\\.IO","MQTT",
            # Databases
            "PostgreSQL","MySQL","MongoDB","Redis","SQLite","Oracle","Cassandra","DynamoDB",
            "Elasticsearch","Solr","Neo4j","CouchDB","InfluxDB","MariaDB",
            "Firebase","Supabase","PlanetScale",
            "Prisma","Sequelize","TypeORM","Mongoose","Knex","Drizzle",
            # DevOps & Cloud
            "AWS","GCP","Azure","Docker","Kubernetes","Terraform","Ansible",
            "Jenkins","GitHub Actions","GitLab CI","CircleCI","Travis CI",
            "Nginx","Apache","HAProxy","Caddy",
            "Prometheus","Grafana","Datadog","New Relic","ELK","Logstash","Kibana",
            "Helm","ArgoCD","Istio","Consul","Vault",
            "EC2","S3","RDS","Lambda","CloudFront","ECS","EKS","Fargate",
            "CloudFormation","Serverless",
            "Vercel","Netlify","Heroku","Render",
            # AI/ML
            "TensorFlow","PyTorch","Scikit-learn","Pandas","NumPy","OpenCV",
            "Hugging Face","LangChain","OpenAI","GPT",
            "Keras","XGBoost","SpaCy","NLTK","Transformers",
            "MLflow","SageMaker","Vertex AI",
            "Computer Vision","NLP","Deep Learning","Machine Learning",
            # Testing
            "Jest","Mocha","Chai","Cypress","Playwright","Selenium",
            "React Testing Library","Supertest","Postman",
            "JUnit","TestNG","Mockito","PyTest",
            # Mobile
            "React Native","Flutter","Ionic","SwiftUI","Jetpack Compose","Expo",
            # Design / CSS
            "HTML","CSS","SCSS","Sass","Tailwind","Bootstrap",
            "Material UI","Chakra UI","Ant Design","Styled Components",
            "Figma","Sketch","Adobe XD","Photoshop",
            # Messaging
            "Kafka","RabbitMQ","SQS","SNS","NATS","Redis Pub/Sub",
            # Tools & Practices
            "Git","Linux","Bash","PowerShell",
            "Agile","Scrum","Kanban","Jira","Confluence",
            "OAuth","JWT","SAML","SSO",
            "Microservices","CI/CD","DevOps",
            "Blockchain","Solidity","Web3",
        ]
        found_skills = []
        seen_skills = set()
        for sk in SKILL_KEYWORDS:
            if re.search(r'(?:^|[\s,;|/\(])' + sk + r'(?:[\s,;|/\).]|$)', text, re.IGNORECASE):
                clean_name = sk.replace("\\", "")
                if clean_name.lower() not in seen_skills:
                    found_skills.append({"skill": clean_name, "years": None, "level": None})
                    seen_skills.add(clean_name.lower())

        # ── Location detection (expanded: 70+ cities + pattern matching) ──
        location_keywords = [
            "Bengaluru","Bangalore","Mumbai","Delhi","New Delhi","Hyderabad","Chennai","Pune",
            "Kolkata","Noida","Gurgaon","Gurugram","Kochi","Thiruvananthapuram","Ahmedabad",
            "Jaipur","Lucknow","Chandigarh","Indore","Bhopal","Nagpur","Coimbatore",
            "Visakhapatnam","Vizag","Mysore","Mangalore","Surat","Vadodara","Patna",
            "Ranchi","Bhubaneswar","Guwahati","Dehradun","Agra","Varanasi","Kanpur",
            "New York","San Francisco","Los Angeles","Seattle","Austin","Boston","Chicago",
            "Denver","Atlanta","Dallas","Houston","Miami","Portland","San Jose",
            "Washington DC","Philadelphia","Phoenix","Minneapolis","Charlotte",
            "London","Berlin","Paris","Amsterdam","Dublin","Munich","Barcelona","Stockholm",
            "Singapore","Tokyo","Sydney","Melbourne","Toronto","Vancouver","Montreal",
            "Dubai","Abu Dhabi","Riyadh","Remote",
        ]
        location = None
        for loc in location_keywords:
            if re.search(r'\b' + re.escape(loc) + r'\b', text, re.IGNORECASE):
                location = loc
                break
        # Fallback: detect "City, State" or "City, ST" pattern anywhere in top 2000 chars
        if not location:
            loc_match = re.search(r'\b([A-Z][a-zA-Z\s]{2,15}),\s*([A-Z]{2}|[A-Z][a-zA-Z]{2,15})\b', text[:2000])
            if loc_match:
                location = f"{loc_match.group(1).strip()}, {loc_match.group(2).strip()}"

        # ── Extract current role ──
        current_role = None
        role_patterns = [
            r'(?:Senior|Lead|Staff|Principal|Junior|Associate)?\s*(?:Software|Full[\s\-]?Stack|Frontend|Backend|DevOps|Data|ML|AI|Cloud|Mobile|Web|QA|Test)\s*(?:Engineer|Developer|Architect|Scientist|Analyst|Consultant|Manager|Lead)',
        ]
        for pat in role_patterns:
            m = re.search(pat, text, re.IGNORECASE)
            if m:
                current_role = m.group(0).strip()
                break

        # ── Build regex-parsed result ──
        regex_parsed = {
            "name": name,
            "email": emails[0] if emails else None,
            "phone": phones[0].strip() if phones else None,
            "location": location or "Unknown",
            "linkedin_url": linkedin.group(0) if linkedin else None,
            "github_url": github.group(0) if github else None,
            "total_experience_years": total_exp_years,
            "skills": found_skills if found_skills else [],
            "experience": [],
            "education": [],
            "current_role": current_role
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

            client = RotateLLMClient(agent_name="celery_interview")
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
                        timeout=6
                    )
                    raw = resp.choices[0].message.content.strip().strip("```json").strip("```").strip()
                    llm_result[0] = json.loads(raw)
                except Exception as ex:
                    llm_error[0] = str(ex)

            t = threading.Thread(target=call_llm)
            t.start()
            t.join(timeout=6)  # Fast 6s timeout for responsive parsing

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

def _normalize_match_skill(s):
    """Normalize skill string for fuzzy matching (strips spaces/digits, maps aliases)."""
    if not s:
        return ""
    s = str(s).lower().strip()
    s = re.sub(r'[\d\.\-\_\s]', '', s)
    ALIASES = {
        'js': 'javascript', 'javascript': 'javascript',
        'reactjs': 'react', 'react': 'react',
        'nodejs': 'node', 'node': 'node',
        'ts': 'typescript', 'typescript': 'typescript',
        'py': 'python', 'python': 'python',
        'html': 'html', 'css': 'css',
        'htmlcss': 'htmlcss',
        'nextjs': 'nextjs', 'next': 'nextjs',
        'vuejs': 'vue', 'vue': 'vue',
        'angularjs': 'angular', 'angular': 'angular',
        'expressjs': 'express', 'express': 'express',
        'mongodb': 'mongodb', 'mongo': 'mongodb',
        'postgresql': 'postgresql', 'postgres': 'postgresql',
        'mysql': 'mysql', 'sql': 'sql',
    }
    return ALIASES.get(s, s)

@celery_app.task(bind=True, max_retries=2, name="process_resume_batch")
def process_resume_batch(self, job_id: str, file_paths: list, session_id: str, source: str = "upload", use_llm: bool = True, file_data_list: list = None):
    """Process resume files with unified LLM parsing and fast regex fallback circuit breaker."""
    # If file_data_list provided, reconstruct files on worker's local filesystem
    if file_data_list:
        save_dir = os.path.join(os.getenv('UPLOAD_DIR', 'uploads'), session_id)
        os.makedirs(save_dir, exist_ok=True)
        file_paths = []
        for fd in file_data_list:
            local_path = os.path.join(save_dir, fd['name'])
            with open(local_path, 'wb') as f:
                f.write(base64.b64decode(fd['content_b64']))
            file_paths.append(local_path)

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
        job.status = "processing"
        job.save()

        # Batch-level circuit breaker for LLM rate limits/failures
        batch_state = {"consecutive_llm_fails": 0, "circuit_open": False}
        import threading
        state_lock = threading.Lock()

        def _process_one(path):
            with state_lock:
                should_skip = (not use_llm) or batch_state["circuit_open"]
            
            res = _parse_resume_sync(path, skip_llm=should_skip)
            
            # Check if LLM failed
            if not should_skip:
                if res.get("parsing_method") != "llm":
                    with state_lock:
                        batch_state["consecutive_llm_fails"] += 1
                        if batch_state["consecutive_llm_fails"] >= 2: # 2 fails in a row = open circuit for remaining batch!
                            batch_state["circuit_open"] = True
                            print(f"[Circuit Breaker] LLM providers exhausted for batch {job_id}. Switching remaining files to high-speed regex parser.")
                else:
                    with state_lock:
                        batch_state["consecutive_llm_fails"] = 0
            
            return path, res

        criteria = session_row.criteria or {}
        min_match_score = criteria.get("min_match_score", 0)
        required_skills = criteria.get("required_skills", [])
        # Fallback to inferred_skills if required_skills is empty
        if not required_skills and getattr(session_row, 'inferred_skills', None):
            inferred = session_row.inferred_skills
            if isinstance(inferred, dict):
                required_skills = inferred.get('required_skills', []) or inferred.get('skills', []) or []
            elif isinstance(inferred, list):
                required_skills = inferred
        rounds = session_row.rounds or []
        first_round_order = rounds[0]["order"] if rounds else 0
        req_lower = [r.lower() for r in required_skills]
        req_normalized = {_normalize_match_skill(r) for r in required_skills if r}

        with concurrent.futures.ThreadPoolExecutor(max_workers=min(len(file_paths), 5)) as executor:
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
                    cand_skill_names_raw = {
                        (s.get("canonical_skill") or s.get("skill") or s.get("raw_skill") or str(s)).lower()
                        if isinstance(s, dict) else str(s).lower()
                        for s in normalized_skills if s
                    }
                    # Build normalized set for fuzzy matching
                    cand_normalized = {_normalize_match_skill(s) for s in cand_skill_names_raw if s}
                    
                    matched_list = []
                    missing_list = []
                    for r in required_skills:
                        r_norm = _normalize_match_skill(r)
                        # Check normalized match first, then substring containment fallback
                        if r_norm and (
                            r_norm in cand_normalized or
                            any(r_norm in c or c in r_norm for c in cand_normalized if len(c) > 2) or
                            any(r.lower() in s for s in cand_skill_names_raw)
                        ):
                            matched_list.append(r)
                        else:
                            missing_list.append(r)
                    
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
                    
                    # Auto-reject if below min_match_score threshold
                    if min_match_score > 0 and score < min_match_score:
                        new_cand.status = "rejected"
                # Pre-generate AI insights if LLM parsed and circuit breaker is closed
                if parsed_res.get("parsing_method") == "llm" and not batch_state.get("circuit_open", False):
                    try:
                        from agents.llm import RotateLLMClient
                        import json as py_json
                        llm = RotateLLMClient(agent_name="celery_resume")
                        system_prompt = (
                            "You are an expert technical recruiter analyzing a candidate's fit for a job. "
                            "Respond in JSON format with exactly three fields: "
                            "1. 'why_hire': A brief, impactful paragraph summarizing the candidate's top strengths and alignment (2-3 sentences). "
                            "2. 'risk_factors': A brief paragraph highlighting gaps, concerns, or areas they might need support in (1-2 sentences). "
                            "3. 'skill_match_breakdown': A list of exactly 3 core skill categories from the job/resume with their match percentage (integer 0-100), structured like: "
                            "   [{\"skill\": \"React / Frontend\", \"percentage\": 96}, {\"skill\": \"Leadership\", \"percentage\": 82}, {\"skill\": \"Cloud / DevOps\", \"percentage\": 61}]."
                        )
                        flat_skills = [
                            s.get('canonical_skill') or s.get('skill') or str(s) if isinstance(s, dict) else str(s)
                            for s in normalized_skills if s
                        ]
                        prompt = (
                            f"Job Title: {session_row.job_title}\n"
                            f"Job Description:\n{session_row.job_description[:1000]}\n\n"
                            f"Candidate Name: {new_cand.name}\n"
                            f"Candidate Skills: {', '.join(flat_skills)}\n"
                            f"Candidate Experience:\n{py_json.dumps(raw_data.get('experience', [])[:3])}\n"
                        )
                        response_text = llm.generate(prompt, system_prompt)
                        if "```json" in response_text:
                            response_text = response_text.split("```json")[1].split("```")[0]
                        elif "```" in response_text:
                            response_text = response_text.split("```")[1].split("```")[0]
                        ai_insights = py_json.loads(response_text.strip())
                        new_cand.match_details["ai_insights"] = ai_insights
                    except Exception as inline_ex:
                        print(f"[Inline LLM] AI Insights pre-computation failed: {inline_ex}")

                new_cand.save()

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
                
                # Pre-generate AI insights after LLM enrichment
                try:
                    from agents.llm import RotateLLMClient
                    import json as py_json
                    llm = RotateLLMClient(agent_name="celery_resume")
                    system_prompt = (
                        "You are an expert technical recruiter analyzing a candidate's fit for a job. "
                        "Respond in JSON format with exactly three fields: "
                        "1. 'why_hire': A brief, impactful paragraph summarizing the candidate's top strengths and alignment (2-3 sentences). "
                        "2. 'risk_factors': A brief paragraph highlighting gaps, concerns, or areas they might need support in (1-2 sentences). "
                        "3. 'skill_match_breakdown': A list of exactly 3 core skill categories from the job/resume with their match percentage (integer 0-100), structured like: "
                        "   [{\"skill\": \"React / Frontend\", \"percentage\": 96}, {\"skill\": \"Leadership\", \"percentage\": 82}, {\"skill\": \"Cloud / DevOps\", \"percentage\": 61}]."
                    )
                    flat_skills = [
                        s.get('canonical_skill') or s.get('skill') or str(s) if isinstance(s, dict) else str(s)
                        for s in cand.normalized_skills if s
                    ]
                    prompt = (
                        f"Job Title: {cand.session.job_title}\n"
                        f"Job Description:\n{cand.session.job_description[:1000]}\n\n"
                        f"Candidate Name: {cand.name}\n"
                        f"Candidate Skills: {', '.join(flat_skills)}\n"
                        f"Candidate Experience:\n{py_json.dumps(parsed.get('experience', [])[:3])}\n"
                    )
                    response_text = llm.generate(prompt, system_prompt)
                    if "```json" in response_text:
                        response_text = response_text.split("```json")[1].split("```")[0]
                    elif "```" in response_text:
                        response_text = response_text.split("```")[1].split("```")[0]
                    ai_insights = py_json.loads(response_text.strip())
                    
                    cand.refresh_from_db()
                    m_details = cand.match_details or {}
                    m_details["ai_insights"] = ai_insights
                    cand.match_details = m_details
                    cand.save(update_fields=["match_details"])
                except Exception as insight_ex:
                    print(f"[LLM Enrich] AI Insights pre-generation failed: {insight_ex}")
            except Exception as score_ex:
                print(f"[LLM Enrich] Score recalculation failed for {cid}: {score_ex}")
        except Candidate.DoesNotExist:
            continue
        except Exception as e:
            print(f"[LLM Enrich] Failed for {cid}: {e}")

@celery_app.task(name="sync_gmail_resumes")
def sync_gmail_resumes(session_id: str, job_id: str, from_date: str = "", to_date: str = ""):
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
        # Append date range filters if provided (format: YYYY-MM-DD → YYYY/MM/DD for Gmail)
        if from_date:
            query += f" after:{from_date.replace('-', '/')}"
        if to_date:
            query += f" before:{to_date.replace('-', '/')}"
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

@celery_app.task(name="sync_google_form_resumes")
def sync_google_form_resumes(session_id: str, job_id: str):
    try:
        session_row = SessionModel.objects.get(id=session_id)
        job = IngestJob.objects.get(id=job_id)
    except (SessionModel.DoesNotExist, IngestJob.DoesNotExist):
        return

    if not session_row.gdrive_tokens:
        job.status = "failed"
        job.error_log = ["Google Form not connected"]
        job.save()
        return

    try:
        import google.oauth2.credentials
        from googleapiclient.discovery import build
        creds = google.oauth2.credentials.Credentials(**session_row.gdrive_tokens)
        
        # Build sheets service
        service = build('sheets', 'v4', credentials=creds)
        spreadsheet_id = session_row.gdrive_folder_id
        
        # Fetch spreadsheet metadata to get the first sheet name
        sheet_metadata = service.spreadsheets().get(spreadsheetId=spreadsheet_id).execute()
        sheets = sheet_metadata.get('sheets', [])
        if not sheets:
            raise Exception("No sheets found in spreadsheet")
        first_sheet_name = sheets[0]['properties']['title']
        
        # Read range
        result = service.spreadsheets().values().get(
            spreadsheetId=spreadsheet_id, 
            range=f"'{first_sheet_name}'!A1:Z200"
        ).execute()
        
        rows = result.get('values', [])
        if not rows:
            job.status = "done"
            job.completed_at = datetime.now(timezone.utc)
            job.save()
            return
            
        headers = [h.strip().lower() for h in rows[0]]
        
        # Helper to find column index by header name matching
        def find_col_idx(names):
            for name in names:
                for idx, h in enumerate(headers):
                    if name in h:
                        return idx
            return -1

        name_idx = find_col_idx(["name", "full name", "candidate"])
        email_idx = find_col_idx(["email", "e-mail", "mail"])
        phone_idx = find_col_idx(["phone", "contact", "mobile", "number"])
        loc_idx = find_col_idx(["location", "address", "city", "country"])
        skills_idx = find_col_idx(["skills", "skillset", "technologies", "tech stack"])
        exp_idx = find_col_idx(["experience", "exp", "years"])
        
        rounds = session_row.rounds or []
        first_round_order = rounds[0]["order"] if rounds else 0
        
        from agents.normalization_agent import SkillNormalizationAgent
        norm_agent = SkillNormalizationAgent()
        
        imported = 0
        
        for row_vals in rows[1:]:
            # Pad row_vals to headers length
            row_vals += [""] * (len(headers) - len(row_vals))
            
            cand_name = row_vals[name_idx] if name_idx != -1 else "Form Applicant"
            cand_email = row_vals[email_idx] if email_idx != -1 else None
            cand_phone = row_vals[phone_idx] if phone_idx != -1 else None
            cand_loc = row_vals[loc_idx] if loc_idx != -1 else None
            raw_skills = str(row_vals[skills_idx]).split(";") if (skills_idx != -1 and row_vals[skills_idx]) else []
            exp_years = 0
            if exp_idx != -1 and row_vals[exp_idx]:
                try:
                    exp_val = re.sub(r'[^\d.]', '', str(row_vals[exp_idx]))
                    exp_years = float(exp_val) if exp_val else 0
                except:
                    pass
            
            # Normalize skills
            from asgiref.sync import async_to_sync
            normalized = async_to_sync(norm_agent.normalize)(raw_skills) if raw_skills else []
            
            # Create Candidate
            cand = Candidate.objects.create(
                session_id=session_id,
                name=cand_name,
                email=cand_email,
                phone=cand_phone,
                location=cand_loc,
                total_experience_years=exp_years,
                normalized_skills=normalized,
                current_round_index=first_round_order,
                status="new",
                source="google_form"
            )
            
            # Calculate match score and details
            from api.views.jobs import _calculate_match_score
            _calculate_match_score(cand, session_row)
            
            # Pre-generate AI insights for the synced candidate
            try:
                from agents.llm import RotateLLMClient
                import json as py_json
                llm = RotateLLMClient(agent_name="celery_resume")
                system_prompt = (
                    "You are an expert technical recruiter analyzing a candidate's fit for a job. "
                    "Respond in JSON format with exactly three fields: "
                    "1. 'why_hire': A brief, impactful paragraph summarizing the candidate's top strengths and alignment (2-3 sentences). "
                    "2. 'risk_factors': A brief paragraph highlighting gaps, concerns, or areas they might need support in (1-2 sentences). "
                    "3. 'skill_match_breakdown': A list of exactly 3 core skill categories from the job/resume with their match percentage (integer 0-100), structured like: "
                    "   [{\"skill\": \"React / Frontend\", \"percentage\": 96}, {\"skill\": \"Leadership\", \"percentage\": 82}, {\"skill\": \"Cloud / DevOps\", \"percentage\": 61}]."
                )
                flat_skills = [
                    s.get('canonical_skill') or s.get('skill') or str(s) if isinstance(s, dict) else str(s)
                    for s in normalized if s
                ]
                prompt = (
                    f"Job Title: {session_row.job_title}\n"
                    f"Job Description:\n{session_row.job_description[:1000]}\n\n"
                    f"Candidate Name: {cand.name}\n"
                    f"Candidate Skills: {', '.join(flat_skills)}\n"
                )
                response_text = llm.generate(prompt, system_prompt)
                if "```json" in response_text:
                    response_text = response_text.split("```json")[1].split("```")[0]
                elif "```" in response_text:
                    response_text = response_text.split("```")[1].split("```")[0]
                ai_insights = py_json.loads(response_text.strip())
                cand.match_details["ai_insights"] = ai_insights
                cand.save()
            except Exception as insights_ex:
                print(f"[Form Sync LLM] AI Insights pre-computation failed: {insights_ex}")
                
            imported += 1
            
        job.total_files = imported
        job.processed_files = imported
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
    # Fallback to inferred_skills if required_skills is empty
    if not required_skills and getattr(session_row, 'inferred_skills', None):
        inferred = session_row.inferred_skills
        if isinstance(inferred, dict):
            required_skills = inferred.get('required_skills', []) or inferred.get('skills', []) or []
        elif isinstance(inferred, list):
            required_skills = inferred
    req_lower = [r.lower() for r in required_skills]
    req_normalized = {_normalize_match_skill(r) for r in required_skills if r}

    candidates = Candidate.objects.filter(session_id=session_id)
    total_count = candidates.count()
    job.total_files = total_count
    job.processed_files = 0
    job.status = "processing"
    job.save()

    processed_count = 0
    for cand in candidates:
        norm_skills = cand.normalized_skills or []
        cand_skill_names_raw = {
            (s.get("canonical_skill") or s.get("skill") or s.get("raw_skill") or str(s)).lower()
            if isinstance(s, dict) else str(s).lower()
            for s in norm_skills if s
        }
        # Build normalized set for fuzzy matching
        cand_normalized = {_normalize_match_skill(s) for s in cand_skill_names_raw if s}
        
        matched_list = []
        missing_list = []
        for r in required_skills:
            r_norm = _normalize_match_skill(r)
            # Check normalized match first, then substring containment fallback
            if r_norm and (
                r_norm in cand_normalized or
                any(r_norm in c or c in r_norm for c in cand_normalized if len(c) > 2) or
                any(r.lower() in s for s in cand_skill_names_raw)
            ):
                matched_list.append(r)
            else:
                missing_list.append(r)
        
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

        company_name = app.session.company.name if app.session and app.session.company else (app.session.name if app.session else "Between Partner")
        
        # Calculate unified match score & active round details
        match_val = None
        current_round_name = None
        test_link = None
        try:
            from api.views.seeker_jobs import _compute_match_score
            match_val = _compute_match_score(app.seeker.skills if (app.seeker and app.seeker.skills) else [], [], str(app.session.id) if app.session else "", app.seeker, app.session)
        except Exception:
            pass

        prior_round_name = None
        try:
            from api.models import SessionRound, ApplicantRoundAttempt
            if app.candidate:
                curr_idx = app.candidate.current_round_index
                sr = SessionRound.objects.filter(session=app.session, round_number=curr_idx).first()
                if sr:
                    current_round_name = sr.name
                
                prior_sr = SessionRound.objects.filter(session=app.session, round_number=max(1, curr_idx - 1)).first()
                if prior_sr:
                    prior_round_name = prior_sr.name

                attempt = ApplicantRoundAttempt.objects.filter(candidate=app.candidate, round__round_number=curr_idx).first()
                if attempt and attempt.access_token:
                    test_link = f"/test/entry?token={attempt.access_token}"
        except Exception:
            pass

        match_score_str = f"{match_val}%" if match_val else "N/A"
        notif_link = test_link if test_link else f"/jobs/applications?app_id={app.id}"

        if notify_status == 'shortlisted':
            notif_title = f"Shortlisted for {current_round_name or 'Next Round'} — {app.session.job_title}"
            notif_msg = f"Congratulations! Your application for {app.session.job_title} at {company_name} [{match_score_str} Match] has been shortlisted on {prior_round_name or 'the previous round'}. You have advanced to the next round: {current_round_name or 'Next Round'}."
        else:
            notif_title = f"{notify_status.title()}: {app.session.job_title} at {company_name}"
            round_note = f" ({current_round_name})" if current_round_name else ""
            notif_msg = f"Your application for {app.session.job_title} at {company_name} [{match_score_str} Match] has been updated to {notify_status.title()}{round_note}. Click to view details."

        # Create rich in-app notification
        Notification.objects.create(
            seeker=app.seeker,
            type='status_updated',
            title=notif_title,
            message=notif_msg,
            link=notif_link,
        )

        # Send rich email with full details
        send_status_update_to_seeker(
            seeker_email=app.seeker.email,
            seeker_name=app.seeker.full_name,
            job_title=app.session.job_title,
            company_name=company_name,
            new_status=notify_status,
            match_score=match_val,
            current_round_name=current_round_name,
            previous_round_name=prior_round_name if notify_status == 'shortlisted' else None,
            location=(app.session.criteria.get("location") if (app.session and isinstance(app.session.criteria, dict) and app.session.criteria.get("location")) else None),
            test_link=test_link,
        )
        logger.info(f"release_round_results: Released status {notify_status} for app {application_id}")
    except Exception as e:
        logger.error(f"release_round_results failed: {e}")

# Celery app alias
app = celery_app
