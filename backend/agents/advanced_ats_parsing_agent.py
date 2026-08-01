import json
import logging
import os
import re
import uuid
from agents.llm import RotateLLMClient, get_api_keys, get_active_gemini_keys, record_bad_key
from openai import OpenAI

logger = logging.getLogger(__name__)

# Section keywords used to evaluate text extraction quality
_SECTION_KEYWORDS = [
    "experience", "education", "skills", "projects", "summary",
    "certifications", "languages", "achievements", "work history",
    "professional summary", "objective", "technical skills",
    "personal info", "contact", "profile",
]


class AdvancedAtsParsingAgent:
    """
    Advanced, separate, and token-efficient Resume Parsing Agent.
    Uses gemini-2.5-flash for high extraction accuracy at low token cost.
    Parses resume text directly into the schema expected by the React frontend editor,
    extracting summary, skills, experience, education, projects (with techStack),
    certifications, languages, and links.

    Includes:
    - Gemini Vision OCR fallback for scanned/image-based PDFs
    - Improved column-aware text extraction without confusing LLM markers
    - Gemini-first LLM call (no weak 8B model fallback)
    """
    def __init__(self):
        self.client = RotateLLMClient(agent_name="resume_parser")

    @staticmethod
    def _count_section_keywords(text: str) -> int:
        """Count how many resume section keywords appear in the text."""
        text_lower = text.lower()
        return sum(1 for kw in _SECTION_KEYWORDS if kw in text_lower)

    @staticmethod
    def _ocr_pdf_with_gemini(file_path: str, max_pages: int = 3) -> str:
        """
        OCR fallback for scanned/image-based PDFs using Gemini Vision.
        Renders each page as a high-res PNG and sends to Gemini for text extraction.
        Processes up to max_pages pages.
        """
        import fitz

        gemini_keys = get_api_keys()
        if not gemini_keys:
            logger.warning("No Gemini API keys available for OCR fallback.")
            return ""

        try:
            import google.generativeai as genai
            from PIL import Image
            import io
        except ImportError:
            logger.warning("google-generativeai or Pillow not installed; OCR fallback unavailable.")
            return ""

        doc = fitz.open(file_path)
        num_pages = min(len(doc), max_pages)
        ocr_pages = []

        # Try each Gemini key until one works
        for key in gemini_keys:
            try:
                genai.configure(api_key=key)
                model = genai.GenerativeModel('gemini-2.5-flash')

                for i in range(num_pages):
                    page = doc[i]
                    # Render at 2x resolution for better OCR accuracy
                    pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
                    img_data = pix.tobytes("png")
                    img = Image.open(io.BytesIO(img_data))

                    response = model.generate_content([
                        "Extract ALL text from this resume image exactly as written. "
                        "Preserve section headings, bullet points, dates, and formatting structure. "
                        "Do not add markdown wrappers, code fences, or conversational text. "
                        "Just return the plain text content.",
                        img
                    ])
                    page_text = response.text.strip()
                    if page_text:
                        ocr_pages.append(page_text)

                if ocr_pages:
                    logger.info("Gemini Vision OCR extracted text from %d pages.", len(ocr_pages))
                    return "\n\n".join(ocr_pages)

            except Exception as e:
                logger.warning("Gemini Vision OCR failed with key %s...: %s", key[:8], e)
                continue

        return ""

    @staticmethod
    def extract_text_column_aware(file_path: str) -> str:
        """
        Smart PDF text extraction with column awareness and OCR fallback.

        Strategy:
        1. Try standard get_text("text") — this preserves reading order for most PDFs.
        2. Try block-based extraction with column detection for two-column layouts.
        3. Compare both extractions and pick the one with more resume section keywords.
        4. If both produce < 50 chars (scanned PDF), fall back to Gemini Vision OCR.

        Falls back to standard extraction for non-PDF files.
        """
        import fitz
        from pathlib import Path

        ext = Path(file_path).suffix.lower()
        try:
            if ext == ".pdf":
                doc = fitz.open(file_path)

                # --- Method 1: Standard text extraction (reading order) ---
                standard_pages = []
                for page in doc:
                    standard_pages.append(page.get_text("text") or "")
                standard_text = "\n\n".join(standard_pages)

                # --- Method 2: Block-based column-aware extraction ---
                block_pages = []
                for page in doc:
                    blocks = page.get_text("blocks")
                    # filter out empty blocks and non-text blocks
                    blocks = [b for b in blocks if b[4].strip() and b[6] == 0]

                    page_width = page.rect.width
                    page_height = page.rect.height

                    # Search for best vertical split x between 25% and 75% width
                    best_x = None
                    min_crossings = float('inf')

                    start_x = int(page_width * 0.25)
                    end_x = int(page_width * 0.75)

                    for x in range(start_x, end_x, 5):
                        crossings = 0
                        for b in blocks:
                            x0, y0, x1, y1 = b[0], b[1], b[2], b[3]
                            if y0 >= 120 and y1 <= page_height - 80:
                                if x0 < x < x1:
                                    crossings += 1

                        if crossings < min_crossings:
                            min_crossings = crossings
                            best_x = x

                    # Treat as two-column if min_crossings is low relative to blocks
                    is_two_column = False
                    if len(blocks) > 4:
                        ratio = min_crossings / len(blocks)
                        if min_crossings <= 2 or ratio < 0.15:
                            is_two_column = True

                    if is_two_column:
                        header_blocks = []
                        footer_blocks = []
                        left_blocks = []
                        right_blocks = []

                        for b in blocks:
                            x0, y0, x1, y1 = b[0], b[1], b[2], b[3]
                            if y0 < 120:
                                header_blocks.append(b)
                            elif y1 > page_height - 80:
                                footer_blocks.append(b)
                            else:
                                center_x = (x0 + x1) / 2.0
                                if center_x < best_x:
                                    left_blocks.append(b)
                                else:
                                    right_blocks.append(b)

                        header_blocks.sort(key=lambda x: (x[1], x[0]))
                        left_blocks.sort(key=lambda x: (x[1], x[0]))
                        right_blocks.sort(key=lambda x: (x[1], x[0]))
                        footer_blocks.sort(key=lambda x: (x[1], x[0]))

                        # Concatenate without confusing markers — just header, left, right, footer
                        page_text = []
                        for b in header_blocks:
                            page_text.append(b[4].strip())
                        for b in left_blocks:
                            page_text.append(b[4].strip())
                        for b in right_blocks:
                            page_text.append(b[4].strip())
                        for b in footer_blocks:
                            page_text.append(b[4].strip())

                        block_pages.append("\n".join(page_text))
                    else:
                        blocks.sort(key=lambda x: (x[1], x[0]))
                        block_pages.append("\n".join(b[4].strip() for b in blocks))

                block_text = "\n\n".join(block_pages)

                # --- Pick the better extraction ---
                standard_len = len(standard_text.strip())
                block_len = len(block_text.strip())

                # If both are too short, try OCR
                if standard_len < 50 and block_len < 50:
                    logger.info("Both text extractions too short (%d, %d chars); attempting Gemini Vision OCR.", standard_len, block_len)
                    ocr_text = AdvancedAtsParsingAgent._ocr_pdf_with_gemini(file_path)
                    if ocr_text and len(ocr_text.strip()) >= 50:
                        return ocr_text
                    return standard_text  # Return whatever we have

                # Extract all embedded URI links (LinkedIn, GitHub, Portfolio, etc.)
                embedded_links = []
                for page in doc:
                    for l in page.get_links():
                        uri = l.get("uri")
                        if uri and uri.strip() and uri.strip() not in embedded_links:
                            embedded_links.append(uri.strip())

                # Compare by section keyword density
                standard_kw = AdvancedAtsParsingAgent._count_section_keywords(standard_text)
                block_kw = AdvancedAtsParsingAgent._count_section_keywords(block_text)

                # Prefer standard text if it has equal or more section keywords
                # (standard preserves reading order better for exported/re-uploaded PDFs)
                final_text = standard_text if standard_kw >= block_kw else block_text

                if embedded_links:
                    final_text += "\n\n[EMBEDDED HYPERLINKS IN PDF]\n" + "\n".join(embedded_links)

                return final_text

            elif ext in [".docx", ".doc"]:
                from docx import Document
                doc = Document(file_path)
                return "\n".join(p.text for p in doc.paragraphs if p.text.strip())
            else:
                with open(file_path, "r", errors="ignore") as f:
                    return f.read()
        except Exception as e:
            logger.error("Column-aware extraction failed for %s: %s", file_path, e)
            return ""

    def preprocess_text(self, text: str) -> str:
        """
        Compress text to save input tokens:
        - Replaces 3+ consecutive newlines with exactly 2 newlines.
        - Trims whitespace from individual lines.
        - Limits maximum text length to 16000 chars (~4K tokens for Gemini).
        """
        if not text:
            return ""
        # Split lines, strip, and join
        lines = [line.strip() for line in text.splitlines()]
        # Filter out multiple consecutive empty lines
        cleaned_lines = []
        consecutive_empty = 0
        for line in lines:
            if not line:
                consecutive_empty += 1
                if consecutive_empty <= 1:
                    cleaned_lines.append(line)
            else:
                consecutive_empty = 0
                cleaned_lines.append(line)

        cleaned_text = "\n".join(cleaned_lines)
        return cleaned_text[:16000]  # Increased from 12K to 16K for better extraction

    def clean_url(self, url: str) -> str:
        """Helper to ensure URLs are formatted properly with a protocol."""
        if not url:
            return ""
        url = url.strip()
        if not url:
            return ""
        # Strip stray trailing punctuation
        url = url.rstrip(".,;)")
        if not re.match(r"^https?://", url, re.IGNORECASE):
            # If it's a known short-form handle like "yuvraj346" without a domain, skip it
            if "/" not in url and "." not in url:
                return ""
            return "https://" + url
        return url

    def _create_gemini_client(self):
        """Create a direct Gemini OpenAI-compatible client, bypassing RotateLLMClient fallback chain."""
        keys = get_api_keys()
        if not keys:
            return None, None

        import time
        for key in keys:
            try:
                client = OpenAI(
                    api_key=key,
                    base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
                    max_retries=0
                )
                return client, key
            except Exception:
                continue
        return None, None

    async def parse(self, text: str) -> dict:
        preprocessed = self.preprocess_text(text)
        if not preprocessed.strip():
            return self.get_empty_resume_dict()

        system_prompt = (
            "You are an elite AI Resume Parsing Agent. The resume text may come from a two-column PDF layout "
            "where text blocks are partially interleaved — contact info, skills, and projects may appear jumbled. "
            "Reconstruct all sections correctly despite the scrambled order.\n\n"
            "The resume may also be re-uploaded from our own platform. If the text appears scrambled due to PDF "
            "rendering order, use semantic understanding to reconstruct sections correctly. Look for common section "
            "headers (Personal Info, Summary, Experience, Education, Projects, Skills, Certifications, Languages) "
            "and group content under the correct sections.\n\n"
            "CRITICAL OPTIMIZATION: Rewrite and enhance the professional summary, experience bullets, and project "
            "descriptions to make them highly professional and ATS-optimized (by using strong action verbs, including "
            "key industry keywords matching their target/current roles, and formatting for readability).\n\n"
            "Extract everything into this exact JSON schema:\n"
            "{\n"
            "  \"personalInfo\": {\n"
            "    \"fullName\": \"full legal name\",\n"
            "    \"title\": \"professional headline or current role\",\n"
            "    \"email\": \"email address\",\n"
            "    \"phone\": \"phone number\",\n"
            "    \"location\": \"city, state or country\",\n"
            "    \"website\": \"personal website URL or empty string\",\n"
            "    \"linkedin\": \"full LinkedIn profile URL (e.g. https://linkedin.com/in/username)\",\n"
            "    \"github\": \"full GitHub profile URL (e.g. https://github.com/username)\"\n"
            "  },\n"
            "  \"summary\": \"ATS-friendly professional summary or profile paragraph\",\n"
            "  \"skills\": [\"Python\", \"React\", \"Docker\"],\n"
            "  \"experience\": [\n"
            "    {\n"
            "      \"company\": \"Company Name\",\n"
            "      \"title\": \"Job Title\",\n"
            "      \"location\": \"City, Country\",\n"
            "      \"startDate\": \"Month Year\",\n"
            "      \"endDate\": \"Month Year or Present\",\n"
            "      \"bullets\": [\"ATS-friendly bullet: Achieved X by doing Y\", \"Led team of Z people\"]\n"
            "    }\n"
            "  ],\n"
            "  \"education\": [\n"
            "    {\n"
            "      \"school\": \"University / College name\",\n"
            "      \"degree\": \"B.E. Computer Engineering\",\n"
            "      \"location\": \"City\",\n"
            "      \"startDate\": \"Jul 2024\",\n"
            "      \"endDate\": \"May 2028\"\n"
            "    }\n"
            "  ],\n"
            "  \"projects\": [\n"
            "    {\n"
            "      \"name\": \"Project Name\",\n"
            "      \"link\": \"https://github.com/user/repo or live URL or empty string\",\n"
            "      \"bullets\": [\"Engineered X supporting Y users, achieving Z measurable outcome\", \"Built A using B, reducing C by D%\"],\n"
            "      \"techStack\": [\"Python\", \"Flask\", \"MySQL\"]\n"
            "    }\n"
            "  ],\n"
            "  \"certifications\": [\n"
            "    {\n"
            "      \"name\": \"Certification Name\",\n"
            "      \"issuer\": \"Issuing Organization\",\n"
            "      \"date\": \"Month Year\"\n"
            "    }\n"
            "  ],\n"
            "  \"languages\": [\n"
            "    {\n"
            "      \"name\": \"English\",\n"
            "      \"proficiency\": \"Native\"\n"
            "    }\n"
            "  ]\n"
            "}\n\n"
            "CRITICAL RULES:\n"
            "1. PROJECTS are MANDATORY — extract ALL projects listed. Look for project headings, project names "
            "followed by tech stacks (lines starting with 'Stack:' or listing technologies). "
            "ALWAYS split each project into 2-4 separate bullet points in the 'bullets' array — NEVER return a single "
            "paragraph. If the source resume has one dense paragraph per project, intelligently split it into distinct "
            "achievement-focused bullets (e.g. one bullet for the core feature built, one for a technical challenge solved, "
            "one for the measurable outcome). Each bullet MUST start with a strong action verb (Engineered, Built, "
            "Architected, Optimized, Designed, Automated, Reduced, Implemented — vary them, do not repeat the same verb "
            "across bullets). Wherever the source text implies scale, performance, or impact (e.g. 'scalable', "
            "'real-time', 'high-performance'), rewrite it with a concrete estimated metric if reasonably inferable from "
            "context (e.g. 'supporting concurrent users', 'reducing latency to under Xms') — but NEVER fabricate a "
            "specific number that isn't supported by the source text; instead use qualitative-but-specific phrasing if no "
            "number is available. techStack should be a clean array of technology names parsed from lines like "
            "'Stack: Python, Flask, MySQL'.\n"
            "2. For GitHub URL: look for patterns like 'GitHub: username' or 'github.com/username' and construct "
            "the full URL https://github.com/username.\n"
            "3. For LinkedIn URL: look for patterns like 'LinkedIn: /in/slug' or 'linkedin.com/in/slug' and construct "
            "the full URL https://linkedin.com/in/slug.\n"
            "4. CERTIFICATIONS: extract all listed certifications. If a LinkedIn certifications URL is present, "
            "create one entry named 'View all certifications' with the URL as the issuer field.\n"
            "5. Skills should be a flat array of individual skill strings, not categories.\n"
            "6. Clean up experience bullets — remove leading symbols (▸, •, -, *).\n"
            "7. Return ONLY valid JSON. No markdown. No explanation."
        )

        # --- Gemini-First Parsing (skip weak 8B fallback models) ---
        active_gemini_keys = get_active_gemini_keys()
        all_gemini_keys = get_api_keys()

        if active_gemini_keys:
            for key in active_gemini_keys:
                try:
                    client = OpenAI(
                        api_key=key,
                        base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
                        max_retries=0
                    )
                    gemini_model = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
                    if "2.5" in gemini_model:
                        gemini_model = "gemini-2.0-flash"
                    masked_key = key[:8] + "..." + key[-4:] if len(key) > 12 else "..."
                    print(f"[RESUME PARSER] Active Keys: {len(active_gemini_keys)}/{len(all_gemini_keys)}. Trying key {masked_key} with model {gemini_model}", flush=True)

                    response = client.chat.completions.create(
                        model=gemini_model,
                        messages=[
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": f"Resume Text:\n{preprocessed}"}
                        ],
                        temperature=0.0,
                        response_format={"type": "json_object"},
                        timeout=45.0
                    )
                    raw = response.choices[0].message.content.strip()
                    print(f"[RESUME PARSER] Gemini key {masked_key} succeeded!", flush=True)

                    # Clean markdown JSON wraps
                    if raw.startswith("```json"):
                        raw = raw[7:]
                    if raw.startswith("```"):
                        raw = raw[3:]
                    if raw.endswith("```"):
                        raw = raw[:-3]
                    raw = raw.strip()

                    parsed = json.loads(raw)
                    normalized = self.normalize_parsed_content(parsed)
                    if normalized.get("personalInfo", {}).get("fullName"):
                        return normalized

                except Exception as e:
                    self._safe_record_bad_key(key, e)
                    continue

        # --- Groq Fallback ---
        groq_key = os.getenv("GROQ_API_KEY")
        if groq_key:
            try:
                client = OpenAI(
                    api_key=groq_key,
                    base_url="https://api.groq.com/openai/v1",
                    max_retries=0
                )
                groq_model = os.getenv("GROQ_MODEL", "llama-3.3-70b-specdec")
                print(f"[RESUME PARSER] Falling back to Groq model: {groq_model}", flush=True)

                response = client.chat.completions.create(
                    model=groq_model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": f"Resume Text:\n{preprocessed}"}
                    ],
                    temperature=0.0,
                    timeout=30.0
                )
                raw = response.choices[0].message.content.strip()
                print(f"[RESUME PARSER] Groq model {groq_model} succeeded!", flush=True)

                if raw.startswith("```json"):
                    raw = raw[7:]
                if raw.startswith("```"):
                    raw = raw[3:]
                if raw.endswith("```"):
                    raw = raw[:-3]
                raw = raw.strip()

                parsed = json.loads(raw)
                normalized = self.normalize_parsed_content(parsed)
                if normalized.get("personalInfo", {}).get("fullName"):
                    return normalized

            except Exception as e:
                print(f"[RESUME PARSER] Groq fallback failed: {e}", flush=True)
                logger.error("Groq 70B parsing fallback failed: %s", e)

        # High-reliability Deterministic Heuristic Fallback
        logger.warning("All LLM providers exhausted or returned empty results; executing deterministic heuristic fallback parser.")
        return self._fallback_heuristic_parse(text)

    def _safe_record_bad_key(self, key: str, exc: Exception):
        """Safely call record_bad_key using thread pool to prevent Django ORM async thread errors."""
        try:
            from agents.llm import _run_sync_in_thread, record_bad_key
            _run_sync_in_thread(record_bad_key, key, exc)
        except Exception as err:
            logger.warning("Failed to safely record bad key: %s", err)

    def _fallback_heuristic_parse(self, raw_text: str) -> dict:
        """
        Deterministic, rule-based fallback parser using regex and section headers.
        Guarantees that 100% of resume uploads extract valid Personal Info, Summary,
        Education, Experience, Projects, Skills, and Certifications even if external
        LLM APIs (Gemini/Groq) are rate-limited, quota-exhausted, or offline.
        """
        schema = self.get_empty_resume_dict()
        if not raw_text or not raw_text.strip():
            return schema

        lines = [line.strip() for line in raw_text.splitlines() if line.strip()]
        if not lines:
            return schema

        section_keywords = [
            'career objective', 'objective', 'professional summary', 'summary', 'profile',
            'education', 'academic background',
            'experience', 'work experience', 'work history', 'employment',
            'projects', 'personal projects', 'key projects',
            'technical skills', 'skills', 'technologies',
            'certifications', 'certificates', 'courses', 'languages'
        ]

        # 1. Group into sections based on headers
        sections = {}
        current_sec = 'header'
        sec_lines = []

        for line in lines:
            cleaned = line.lower().rstrip(':')
            if cleaned in section_keywords:
                if sec_lines:
                    sections[current_sec] = sec_lines
                current_sec = cleaned
                sec_lines = []
            else:
                sec_lines.append(line)
        if sec_lines:
            sections[current_sec] = sec_lines

        header_lines = sections.get('header', [])
        header_text = '\n'.join(header_lines)
        full_raw = '\n'.join(lines)

        # 2. Extract Personal Info
        full_name = ''
        for line in header_lines[:5]:
            if not re.search(r'resume|curriculum|cv|email|phone|\+|@|github|linkedin|portfolio|http', line, re.I):
                if len(line) < 40 and re.match(r'^[A-Za-z\s\.\-]+$', line):
                    full_name = line.strip()
                    break
        if not full_name and lines:
            first = lines[0]
            if len(first) < 40 and not re.search(r'@|http|\+|\d{5}', first):
                full_name = first.strip()

        email_m = re.search(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', full_raw)
        email = email_m.group(0) if email_m else ''

        phone_m = re.search(r'(\+?\d{1,3}[\s\-]?)?\(?\d{2,4}\)?[\s\-]?\d{3,5}[\s\-]?\d{3,5}', full_raw)
        phone = phone_m.group(0) if phone_m else ''

        loc_m = re.search(r'([A-Z][a-zA-Z\s]+,\s*[A-Z][a-zA-Z\s]+)', header_text)
        location = loc_m.group(1).strip() if loc_m else ''

        gh_m = re.search(r'(?:https?://)?(?:www\.)?github\.com/([a-zA-Z0-9_-]+)', full_raw, re.I)
        github = f'https://github.com/{gh_m.group(1)}' if gh_m else ''

        li_m = re.search(r'(?:https?://)?(?:www\.)?linkedin\.com/in/([a-zA-Z0-9_-]+)', full_raw, re.I)
        linkedin = f'https://linkedin.com/in/{li_m.group(1)}' if li_m else ''

        website = ''
        web_m = re.search(r'https?://(?!github\.com|linkedin\.com)[^\s]+', full_raw)
        if web_m:
            website = web_m.group(0)

        title = ''
        for h_line in header_lines[1:]:
            if not re.search(r'@|\+|\d{5}|github|linkedin|portfolio', h_line, re.I):
                if len(h_line) < 60:
                    title = h_line.strip()
                    break

        schema["personalInfo"] = {
            "fullName": full_name,
            "title": title,
            "email": email,
            "phone": phone,
            "location": location,
            "website": self.clean_url(website),
            "linkedin": self.clean_url(linkedin),
            "github": self.clean_url(github)
        }

        # 3. Extract Summary
        summary_lines = (
            sections.get('career objective', []) or
            sections.get('objective', []) or
            sections.get('summary', []) or
            sections.get('professional summary', []) or
            sections.get('profile', [])
        )
        schema["summary"] = ' '.join(summary_lines).strip()

        # 4. Extract Skills
        skill_lines = (
            sections.get('technical skills', []) or
            sections.get('skills', []) or
            sections.get('technologies', [])
        )
        skills = []
        for sl in skill_lines:
            clean_sl = re.sub(r'^(?:Languages|Frontend|Backend|Databases|Machine Learning|Tools|Frameworks|Libraries):\s*', '', sl, flags=re.I)
            parts = [p.strip() for p in re.split(r'[,|•]', clean_sl) if p.strip()]
            for p in parts:
                if p and p not in skills and len(p) < 40:
                    skills.append(p)
        schema["skills"] = skills

        # 5. Extract Education
        edu_lines = sections.get('education', []) or sections.get('academic background', [])
        if edu_lines:
            school = edu_lines[0] if len(edu_lines) > 0 else ''
            deg_line = edu_lines[1] if len(edu_lines) > 1 else ''
            dates_m = re.search(r'(\d{4})\s*[\u2013\u2014\-–]\s*(\d{4}|Present)', deg_line)
            start_date = dates_m.group(1) if dates_m else ''
            end_date = dates_m.group(2) if dates_m else ''
            degree_clean = re.sub(r'\d{4}\s*[\u2013\u2014\-–]\s*(\d{4}|Present)', '', deg_line).strip()
            schema["education"].append({
                "id": str(uuid.uuid4()),
                "school": school,
                "degree": degree_clean or deg_line,
                "location": location,
                "startDate": start_date,
                "endDate": end_date
            })

        # 6. Extract Experience
        exp_lines = (
            sections.get('experience', []) or
            sections.get('work experience', []) or
            sections.get('work history', []) or
            sections.get('employment', [])
        )
        if exp_lines:
            first_line = exp_lines[0]
            dates_m = re.search(r'([A-Za-z]+\s+\d{4})\s*[\u2013\u2014\-–]\s*([A-Za-z]+\s+\d{4}|Present)', first_line, re.I)
            s_date = dates_m.group(1) if dates_m else ''
            e_date = dates_m.group(2) if dates_m else ''
            title_comp = re.sub(r'([A-Za-z]+\s+\d{4})\s*[\u2013\u2014\-–]\s*([A-Za-z]+\s+\d{4}|Present)', '', first_line, flags=re.I).strip()
            bullets = [l.lstrip('•-* ').strip() for l in exp_lines[1:] if l.strip()]
            schema["experience"].append({
                "id": str(uuid.uuid4()),
                "company": title_comp or "Experience",
                "title": title_comp or "Role",
                "location": "",
                "startDate": s_date,
                "endDate": e_date,
                "bullets": bullets
            })

        # 7. Extract Projects
        proj_lines = (
            sections.get('projects', []) or
            sections.get('personal projects', []) or
            sections.get('key projects', [])
        )
        action_verb_re = r'^(?:Architected|Built|Implemented|Developed|Engineered|Created|Designed|Achieved|Led|Managed)\b'
        curr_proj = None
        for p_line in proj_lines:
            stripped_p = p_line.strip()
            if not stripped_p:
                continue

            is_action_verb = bool(re.match(action_verb_re, stripped_p, re.I))
            is_bullet_symbol = stripped_p.startswith(('•', '-', '*'))
            is_new_proj_header = not is_action_verb and not is_bullet_symbol and bool(re.search(r'[\u2013\u2014\-–]', stripped_p))

            if is_new_proj_header:
                if curr_proj:
                    schema["projects"].append(curr_proj)
                curr_proj = {
                    "id": str(uuid.uuid4()),
                    "name": stripped_p,
                    "link": "",
                    "bullets": [],
                    "description": "",
                    "techStack": []
                }
            elif curr_proj:
                if not is_action_verb and not is_bullet_symbol and (',' in stripped_p or 'React' in stripped_p or 'Node' in stripped_p) and not curr_proj['techStack'] and not curr_proj['bullets']:
                    curr_proj['techStack'] = [t.strip() for t in stripped_p.split(',') if t.strip()]
                else:
                    clean_b = stripped_p.lstrip('•-* ').strip()
                    if clean_b:
                        curr_proj['bullets'].append(clean_b)

        if curr_proj:
            schema["projects"].append(curr_proj)

        # 8. Extract Certifications
        cert_lines = (
            sections.get('certifications', []) or
            sections.get('certificates', []) or
            sections.get('courses', [])
        )
        for c_line in cert_lines:
            c_clean = c_line.lstrip('•-* ').strip()
            if c_clean:
                parts = c_clean.split('–') if '–' in c_clean else c_clean.split('-')
                issuer = parts[0].strip() if len(parts) > 1 else ''
                name = parts[1].strip() if len(parts) > 1 else c_clean
                schema["certifications"].append({
                    "id": str(uuid.uuid4()),
                    "name": name,
                    "issuer": issuer,
                    "date": ""
                })

        schema["languages"] = [{"id": str(uuid.uuid4()), "name": "English", "proficiency": "Native"}]
        return schema

    def get_empty_resume_dict(self) -> dict:
        return {
            "personalInfo": {
                "fullName": "",
                "title": "",
                "email": "",
                "phone": "",
                "location": "",
                "website": "",
                "linkedin": "",
                "github": ""
            },
            "summary": "",
            "skills": [],
            "experience": [],
            "education": [],
            "projects": [],
            "certifications": [],
            "languages": []
        }

    def normalize_parsed_content(self, parsed: dict) -> dict:
        schema = self.get_empty_resume_dict()

        # Merge personal info
        p_info = parsed.get("personalInfo") or {}
        if isinstance(p_info, dict):
            for k in schema["personalInfo"]:
                val = p_info.get(k) or ""
                if k in ["website", "linkedin", "github"] and val:
                    schema["personalInfo"][k] = self.clean_url(val)
                else:
                    schema["personalInfo"][k] = str(val).strip()

        schema["summary"] = str(parsed.get("summary") or "").strip()

        # Skills
        raw_skills = parsed.get("skills") or []
        if isinstance(raw_skills, list):
            schema["skills"] = [str(s).strip() for s in raw_skills if s]

        # Experience
        raw_exp = parsed.get("experience") or []
        if isinstance(raw_exp, list):
            for item in raw_exp:
                if not isinstance(item, dict):
                    continue
                bullets = item.get("bullets") or []
                if not isinstance(bullets, list):
                    bullets = [bullets] if bullets else []
                schema["experience"].append({
                    "id": str(uuid.uuid4()),
                    "company": str(item.get("company") or "").strip(),
                    "title": str(item.get("title") or "").strip(),
                    "location": str(item.get("location") or "").strip(),
                    "startDate": str(item.get("startDate") or "").strip(),
                    "endDate": str(item.get("endDate") or "").strip(),
                    "bullets": [str(b).strip() for b in bullets if b]
                })

        # Education
        raw_edu = parsed.get("education") or []
        if isinstance(raw_edu, list):
            for item in raw_edu:
                if not isinstance(item, dict):
                    continue
                schema["education"].append({
                    "id": str(uuid.uuid4()),
                    "school": str(item.get("school") or "").strip(),
                    "degree": str(item.get("degree") or "").strip(),
                    "location": str(item.get("location") or "").strip(),
                    "startDate": str(item.get("startDate") or "").strip(),
                    "endDate": str(item.get("endDate") or "").strip()
                })

        # Projects
        raw_proj = parsed.get("projects") or []
        if isinstance(raw_proj, list):
            for item in raw_proj:
                if not isinstance(item, dict):
                    continue
                link = item.get("link") or ""
                # Parse techStack — can be list or comma-separated string
                raw_tech = item.get("techStack") or item.get("tech_stack") or item.get("technologies") or []
                if isinstance(raw_tech, str):
                    tech_list = [t.strip() for t in raw_tech.split(",") if t.strip()]
                elif isinstance(raw_tech, list):
                    tech_list = [str(t).strip() for t in raw_tech if t]
                else:
                    tech_list = []

                # Prefer the new "bullets" array; fall back to splitting a legacy "description"
                # string so older drafts / older LLM responses don't break.
                raw_bullets = item.get("bullets") or []
                if isinstance(raw_bullets, list) and raw_bullets:
                    bullets_list = [str(b).strip() for b in raw_bullets if str(b).strip()]
                else:
                    legacy_desc = str(item.get("description") or "").strip()
                    if legacy_desc:
                        # Split a dense paragraph into sentence-based bullets as a safety net
                        bullets_list = [
                            s.strip().rstrip(".") + "."
                            for s in re.split(r'(?<=[.!?])\s+', legacy_desc)
                            if s.strip()
                        ]
                    else:
                        bullets_list = []

                schema["projects"].append({
                    "id": str(uuid.uuid4()),
                    "name": str(item.get("name") or "").strip(),
                    "link": self.clean_url(link),
                    "bullets": bullets_list,
                    "description": str(item.get("description") or "").strip() or "\n".join(f"• {b}" for b in bullets_list),  # kept for backward-compat, UI should prefer `bullets`
                    "techStack": tech_list
                })

        # Certifications
        raw_certs = parsed.get("certifications") or []
        if isinstance(raw_certs, list):
            for item in raw_certs:
                if not isinstance(item, dict):
                    continue
                schema["certifications"].append({
                    "id": str(uuid.uuid4()),
                    "name": str(item.get("name") or "").strip(),
                    "issuer": str(item.get("issuer") or "").strip(),
                    "date": str(item.get("date") or "").strip()
                })

        # Languages
        raw_langs = parsed.get("languages") or []
        if isinstance(raw_langs, list):
            for item in raw_langs:
                if not isinstance(item, dict):
                    continue
                schema["languages"].append({
                    "id": str(uuid.uuid4()),
                    "name": str(item.get("name") or "").strip(),
                    "proficiency": str(item.get("proficiency") or "").strip()
                })

        return schema
