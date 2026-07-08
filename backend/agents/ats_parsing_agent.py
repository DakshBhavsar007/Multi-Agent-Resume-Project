import json
import logging
from agents.llm import RotateLLMClient

logger = logging.getLogger(__name__)

class AtsParsingAgent:
    """
    Brand-new, advanced, and token-efficient Resume Parsing Agent.
    
    Uses gemini-1.5-flash for maximum parsing accuracy at minimal token billing cost.
    Parses resume text directly into the schema expected by the React frontend editor,
    eliminating translation mismatch bugs and supporting projects, summaries, and clickable links.
    """
    def __init__(self):
        self.client = RotateLLMClient()

    async def parse(self, text: str) -> dict:
        if not text or not text.strip():
            return {
                "personalInfo": {"fullName": "", "title": "", "email": "", "phone": "", "location": "", "website": "", "linkedin": "", "github": ""},
                "summary": "",
                "skills": [],
                "experience": [],
                "education": [],
                "projects": []
            }

        # Keep within input token limits
        text = text[:9000]

        system_prompt = (
            "You are an expert AI Resume Parsing Agent. Your task is to analyze raw resume text and extract "
            "all sections into a structured JSON format.\n\n"
            "You must return ONLY a single, valid JSON object matching the exact schema below:\n"
            "{\n"
            "  \"personalInfo\": {\n"
            "    \"fullName\": \"<candidate name or empty string>\",\n"
            "    \"title\": \"<current professional headline/title or empty string>\",\n"
            "    \"email\": \"<email address or empty string>\",\n"
            "    \"phone\": \"<phone number or empty string>\",\n"
            "    \"location\": \"<city, state/country or empty string>\",\n"
            "    \"website\": \"<personal website URL or empty string>\",\n"
            "    \"linkedin\": \"<LinkedIn profile URL or empty string>\",\n"
            "    \"github\": \"<GitHub profile URL or empty string>\"\n"
            "  },\n"
            "  \"summary\": \"<professional summary paragraph or empty string>\",\n"
            "  \"skills\": [\"<skill string 1>\", \"<skill string 2>\", ...],\n"
            "  \"experience\": [\n"
            "    {\n"
            "      \"company\": \"<company name>\",\n"
            "      \"title\": \"<job title/role>\",\n"
            "      \"location\": \"<work location or empty string>\",\n"
            "      \"startDate\": \"<start date, e.g. Mar 2022>\",\n"
            "      \"endDate\": \"<end date, e.g. Present or Dec 2023>\",\n"
            "      \"bullets\": [\"<quantified achievement bullet point 1>\", ...]\n"
            "    }\n"
            "  ],\n"
            "  \"education\": [\n"
            "    {\n"
            "      \"school\": \"<institution/university name>\",\n"
            "      \"degree\": \"<degree earned, e.g. B.S. Computer Science>\",\n"
            "      \"location\": \"<school location or empty string>\",\n"
            "      \"startDate\": \"<start date or empty string>\",\n"
            "      \"endDate\": \"<graduation year or date>\"\n"
            "    }\n"
            "  ],\n"
            "  \"projects\": [\n"
            "    {\n"
            "      \"name\": \"<project title>\",\n"
            "      \"link\": \"<project repository or live URL or empty string>\",\n"
            "      \"description\": \"<description of project and technologies used>\"\n"
            "    }\n"
            "  ]\n"
            "}\n\n"
            "Rules:\n"
            "1. Extract all projects, descriptions, and clickable repository links correctly.\n"
            "2. Make sure date representations use clear MM/YYYY or short month format (e.g. 'Oct 2021').\n"
            "3. Clean up bullet points: remove leading hyphens, bullet characters, or tabs from string values.\n"
            "4. Return ONLY valid JSON. No conversational remarks, no markdown formatting (no ```json code blocks)."
        )

        try:
            response = self.client.chat.completions.create(
                model="gemini-1.5-flash",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Resume Text:\n{text}"}
                ],
                temperature=0.1
            )
            raw = response.choices[0].message.content.strip()
            
            # Safe strip potential code block wrapper
            if raw.startswith("```json"):
                raw = raw[7:]
            if raw.startswith("```"):
                raw = raw[3:]
            if raw.endswith("```"):
                raw = raw[:-3]
            raw = raw.strip()

            parsed = json.loads(raw)
            
            # Post-parse integrity check
            if not isinstance(parsed.get("personalInfo"), dict):
                parsed["personalInfo"] = {}
            if not isinstance(parsed.get("skills"), list):
                parsed["skills"] = []
            if not isinstance(parsed.get("experience"), list):
                parsed["experience"] = []
            if not isinstance(parsed.get("education"), list):
                parsed["education"] = []
            if not isinstance(parsed.get("projects"), list):
                parsed["projects"] = []
                
            # Add unique IDs to experience, education, and projects so key-index renders properly in React
            import uuid
            for item in parsed["experience"]:
                item["id"] = str(uuid.uuid4())
            for item in parsed["education"]:
                item["id"] = str(uuid.uuid4())
            for item in parsed["projects"]:
                item["id"] = str(uuid.uuid4())
                
            return parsed

        except Exception as e:
            logger.warning("AtsParsingAgent LLM parsing failed or keys exhausted. Falling back to local SpaCy parser. Error: %s", e)
            return self.parse_with_spacy(text)

    def _get_spacy_nlp(self):
        if not hasattr(self, "_nlp") or self._nlp is None:
            import spacy
            import os
            # Prevent OpenMP crash
            os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"
            current_dir = os.path.dirname(os.path.abspath(__file__))
            model_path = os.path.abspath(os.path.join(current_dir, "..", "models", "ner_resume_parser"))
            
            # Download from Hugging Face if local SpaCy model folder doesn't exist
            if not os.path.exists(model_path) or not os.path.exists(os.path.join(model_path, "config.cfg")):
                repo_id = os.environ.get("HF_MODEL_REPO")
                if repo_id:
                    try:
                        logger.info("Local SpaCy model not found. Downloading from Hugging Face: %s", repo_id)
                        from huggingface_hub import snapshot_download
                        models_parent = os.path.abspath(os.path.join(current_dir, "..", "models"))
                        snapshot_download(
                            repo_id=repo_id,
                            allow_patterns="ner_resume_parser/*",
                            local_dir=models_parent,
                            local_dir_use_symlinks=False
                        )
                        logger.info("Successfully downloaded SpaCy model from Hugging Face.")
                    except Exception as hf_err:
                        logger.error("Failed to download SpaCy model from Hugging Face: %s", hf_err)
            
            self._nlp = spacy.load(model_path)
        return self._nlp

    def parse_with_spacy(self, text: str) -> dict:
        try:
            import re
            import uuid
            nlp = self._get_spacy_nlp()
            doc = nlp(text)
            
            result = {
                "personalInfo": {"fullName": "", "title": "", "email": "", "phone": "", "location": "", "website": "", "linkedin": "", "github": ""},
                "summary": "",
                "skills": [],
                "experience": [],
                "education": [],
                "projects": []
            }
            
            # Simple regex helpers
            email_matches = re.findall(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+', text)
            if email_matches:
                result["personalInfo"]["email"] = email_matches[0]
                
            phone_matches = re.findall(r'(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}', text)
            if phone_matches:
                result["personalInfo"]["phone"] = phone_matches[0]
                
            entities_by_label = {}
            for ent in doc.ents:
                label = ent.label_
                text_val = ent.text.strip()
                if label not in entities_by_label:
                    entities_by_label[label] = []
                entities_by_label[label].append(text_val)
                
            # Personal Info
            if "Name" in entities_by_label and entities_by_label["Name"]:
                result["personalInfo"]["fullName"] = entities_by_label["Name"][0]
            if "Designation" in entities_by_label and entities_by_label["Designation"]:
                result["personalInfo"]["title"] = entities_by_label["Designation"][0]
            if "Email Address" in entities_by_label and entities_by_label["Email Address"] and not result["personalInfo"]["email"]:
                result["personalInfo"]["email"] = entities_by_label["Email Address"][0]
            if "Location" in entities_by_label and entities_by_label["Location"]:
                result["personalInfo"]["location"] = entities_by_label["Location"][0]
                
            # Skills
            raw_skills = []
            if "Skills" in entities_by_label:
                for s in entities_by_label["Skills"]:
                    parts = re.split(r'[,•\n]+', s)
                    for part in parts:
                        clean_p = part.strip(" \t\n\r.()[]\"'-")
                        # Noise cleaning
                        clean_p = re.sub(r'\(?Less than \d+ years?\)?', '', clean_p, flags=re.IGNORECASE).strip()
                        clean_p = re.sub(r'\(?\d+ years?\)?', '', clean_p, flags=re.IGNORECASE).strip()
                        if clean_p and len(clean_p) > 1 and len(clean_p) < 50:
                            raw_skills.append(clean_p)
            seen = set()
            dedup_skills = []
            for s in raw_skills:
                if s.lower() not in seen:
                    seen.add(s.lower())
                    dedup_skills.append(s)
            result["skills"] = dedup_skills[:30]
            
            # Experience
            companies = entities_by_label.get("Companies worked at", [])
            designations = entities_by_label.get("Designation", [])
            companies = list(dict.fromkeys(companies))
            designations = list(dict.fromkeys(designations))
            
            num_exps = max(len(companies), len(designations))
            for i in range(num_exps):
                company_name = companies[i] if i < len(companies) else ""
                role_name = designations[i] if i < len(designations) else ""
                if company_name or role_name:
                    result["experience"].append({
                        "id": str(uuid.uuid4()),
                        "company": company_name,
                        "title": role_name,
                        "location": "",
                        "startDate": "",
                        "endDate": "",
                        "bullets": []
                    })
                    
            # Education
            colleges = entities_by_label.get("College Name", [])
            degrees = entities_by_label.get("Degree", [])
            grad_years = entities_by_label.get("Graduation Year", [])
            colleges = list(dict.fromkeys(colleges))
            degrees = list(dict.fromkeys(degrees))
            grad_years = list(dict.fromkeys(grad_years))
            
            num_eds = max(len(colleges), len(degrees))
            for i in range(num_eds):
                school_name = colleges[i] if i < len(colleges) else ""
                degree_name = degrees[i] if i < len(degrees) else ""
                grad_year = grad_years[i] if i < len(grad_years) else ""
                if school_name or degree_name:
                    result["education"].append({
                        "id": str(uuid.uuid4()),
                        "school": school_name,
                        "degree": degree_name,
                        "location": "",
                        "startDate": "",
                        "endDate": grad_year
                    })
                    
            # Projects
            github_links = re.findall(r'github\.com/[a-zA-Z0-9_-]+/[a-zA-Z0-9_-]+', text, flags=re.IGNORECASE)
            if github_links:
                for link in github_links:
                    project_name = link.split('/')[-1]
                    result["projects"].append({
                        "id": str(uuid.uuid4()),
                        "name": project_name.replace('-', ' ').title(),
                        "link": "https://" + link,
                        "description": f"Repository for {project_name}."
                    })
                    
            # Summary
            lines = [line.strip() for line in text.split('\n') if line.strip()]
            candidate_summary = ""
            for line in lines:
                if len(line) > 100 and not any(kw in line.lower() for kw in ["experience", "education", "skills", "projects", "indeed"]):
                    candidate_summary = line
                    break
            result["summary"] = candidate_summary
            
            return result
        except Exception as ex:
            logger.error("Spacy offline fallback parser failed: %s", ex)
            return {
                "personalInfo": {"fullName": "", "title": "", "email": "", "phone": "", "location": "", "website": "", "linkedin": "", "github": ""},
                "summary": "",
                "skills": [],
                "experience": [],
                "education": [],
                "projects": [],
                "error": f"LLM error and local SpaCy error: {ex}"
            }
