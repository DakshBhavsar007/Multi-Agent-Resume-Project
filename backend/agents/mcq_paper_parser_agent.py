"""
MCQ Paper Parser Agent
Extracts multiple-choice questions from PDF/DOCX files using LLM.
Uses PyPDF2 for PDF text extraction and python-docx for DOCX.
No vision model needed — pure text extraction + LLM parsing.
"""
import json
import logging
import PyPDF2
import io

from agents.llm import RotateLLMClient

logger = logging.getLogger(__name__)


class MCQPaperParserAgent:
    def __init__(self):
        self.llm = RotateLLMClient()

    def extract_text_from_pdf(self, file_bytes: bytes) -> str:
        """Extract all text from a PDF file."""
        reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
        text_parts = []
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)
        return "\n\n".join(text_parts)

    def extract_text_from_docx(self, file_bytes: bytes) -> str:
        """Extract all text from a DOCX file."""
        import docx
        doc = docx.Document(io.BytesIO(file_bytes))
        return "\n".join([p.text for p in doc.paragraphs if p.text.strip()])

    def parse_questions_with_llm(self, raw_text: str, category_hint: str = "general") -> list:
        """
        Send extracted text to LLM and get structured MCQ questions back.
        Uses minimal tokens by sending only the raw text.
        """
        if not raw_text or len(raw_text.strip()) < 20:
            return []

        # Truncate to ~8000 chars to save credits
        truncated = raw_text[:8000]

        prompt = f"""Extract ALL multiple choice questions from the following exam paper text.

Return ONLY a valid JSON array. Each element must have:
- "question_text": the full question string
- "options": object like {{"A": "option text", "B": "option text", "C": "option text", "D": "option text"}}
- "correct_option": single letter (A/B/C/D) if the answer is marked/known, otherwise empty string ""
- "category": one of "logical", "quantitative", "verbal", "technical", "general"
- "difficulty": "easy", "medium", or "hard"

Rules:
- Extract EVERY question you can find
- If options are numbered (1,2,3,4) convert to A,B,C,D
- If no MCQ questions found, return empty array []
- Return ONLY the JSON array, nothing else

Exam Paper Text:
---
{truncated}
---"""

        try:
            response = self.llm.chat.completions.create(
                model="gemini-2.0-flash",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.0,
                timeout=30
            )
            raw = response.choices[0].message.content.strip()
            
            # Clean markdown code fences if present
            if raw.startswith("```"):
                raw = raw.split("\n", 1)[1] if "\n" in raw else raw[3:]
            if raw.endswith("```"):
                raw = raw[:-3]
            raw = raw.strip()
            
            parsed = json.loads(raw)
            if isinstance(parsed, dict):
                parsed = parsed.get("questions", [])
            if not isinstance(parsed, list):
                return []
            return parsed
        except Exception as e:
            logger.error("MCQ paper parse LLM error: %s", e)
            return []

    def extract_and_parse(self, file_bytes: bytes, filename: str, category_hint: str = "general") -> list:
        """Main entry point: extract text from file, then parse with LLM."""
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        
        if ext == "pdf":
            raw_text = self.extract_text_from_pdf(file_bytes)
        elif ext in ["docx", "doc"]:
            raw_text = self.extract_text_from_docx(file_bytes)
        elif ext in ["txt", "text"]:
            raw_text = file_bytes.decode("utf-8", errors="ignore")
        else:
            raise ValueError(f"Unsupported file type: {ext}")

        if not raw_text.strip():
            raise ValueError("Could not extract any text from the uploaded file.")

        logger.info("Extracted %d chars from %s", len(raw_text), filename)
        return self.parse_questions_with_llm(raw_text, category_hint)

    def save_to_db(self, questions: list, session_id: str = None) -> dict:
        """Save parsed questions to MCQQuestion table."""
        from api.models import MCQQuestion
        created = 0
        skipped = 0
        for q in questions:
            qt = q.get("question_text", "").strip()
            opts = q.get("options", {})
            if not qt or not opts:
                continue
            _, was_created = MCQQuestion.objects.get_or_create(
                question_text=qt,
                defaults={
                    "options": opts,
                    "correct_option": q.get("correct_option", "") or "",
                    "category": q.get("category", "general"),
                    "difficulty": q.get("difficulty", "medium"),
                    "tags": [session_id] if session_id else []
                }
            )
            if was_created:
                created += 1
            else:
                skipped += 1
        return {"created": created, "skipped": skipped, "total": len(questions)}

    def parse_coding_problems_with_llm(self, raw_text: str) -> list:
        """Send extracted text to LLM and get structured Coding problems back."""
        if not raw_text or len(raw_text.strip()) < 20:
            return []

        truncated = raw_text[:8000]

        prompt = f"""Extract ALL programming/coding challenges from the following text.

Return ONLY a valid JSON array. Each element must have:
- "title": the name of the coding problem
- "slug": a url-friendly unique identifier (lowercase, alphanumeric and dashes only, e.g. "two-sum")
- "difficulty": "easy", "medium", or "hard"
- "description": clear and detailed problem description
- "examples": array of objects containing "input" and "output" (e.g. [{{"input": "nums = [2,7,11,15], target = 9", "output": "[0,1]"}}])
- "constraints": array of constraint strings (e.g. ["1 <= nums.length <= 10^4"])
- "starter_code": object containing "python" and "javascript" starter function signatures (e.g. {{"python": "def twoSum(nums, target):\n    pass", "javascript": "function twoSum(nums, target) {{\n\n}}"}} )
- "test_cases": array of test case objects, each containing:
    - "input": dictionary of parameter name/value pairs matching the starter code arguments (e.g. {{"nums": [2,7,11,15], "target": 9}})
    - "expected_output": the raw expected output (e.g. [0, 1] or true)

Rules:
- Extract EVERY programming problem you can find
- starter_code: must be valid Python and JS code
- test_cases: must contain at least 2 structured test cases for verification
- Return ONLY the JSON array, nothing else

Text:
---
{truncated}
---"""

        try:
            response = self.llm.chat.completions.create(
                model="gemini-2.0-flash",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.0,
                timeout=30
            )
            raw = response.choices[0].message.content.strip()
            
            if raw.startswith("```"):
                raw = raw.split("\n", 1)[1] if "\n" in raw else raw[3:]
            if raw.endswith("```"):
                raw = raw[:-3]
            raw = raw.strip()
            
            parsed = json.loads(raw)
            if isinstance(parsed, dict):
                parsed = parsed.get("problems", [])
            if not isinstance(parsed, list):
                return []
            return parsed
        except Exception as e:
            logger.error("Coding paper parse LLM error: %s", e)
            return []

    def extract_and_parse_coding(self, file_bytes: bytes, filename: str) -> list:
        """Extract text from file, then parse coding problems with LLM."""
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        
        if ext == "pdf":
            raw_text = self.extract_text_from_pdf(file_bytes)
        elif ext in ["docx", "doc"]:
            raw_text = self.extract_text_from_docx(file_bytes)
        elif ext in ["txt", "text"]:
            raw_text = file_bytes.decode("utf-8", errors="ignore")
        else:
            raise ValueError(f"Unsupported file type: {ext}")

        if not raw_text.strip():
            raise ValueError("Could not extract any text from the uploaded file.")

        logger.info("Extracted %d chars from %s for coding", len(raw_text), filename)
        return self.parse_coding_problems_with_llm(raw_text)

    def save_coding_to_db(self, problems: list, session_id: str = None) -> dict:
        """Save parsed coding problems to CodingProblem table."""
        from api.models import CodingProblem
        created = 0
        skipped = 0
        slugs = []
        for p in problems:
            title = p.get("title", "").strip()
            slug = p.get("slug", "").strip()
            if not title or not slug:
                continue
            if session_id:
                slug = f"{session_id}-{slug}"
            
            cp, was_created = CodingProblem.objects.get_or_create(
                slug=slug,
                defaults={
                    "title": title,
                    "difficulty": p.get("difficulty", "medium"),
                    "description": p.get("description", ""),
                    "examples": p.get("examples", []),
                    "constraints": p.get("constraints", []),
                    "starter_code": p.get("starter_code", {}),
                    "test_cases": p.get("test_cases", []),
                    "tags": [session_id] if session_id else []
                }
            )
            slugs.append(slug)
            if was_created:
                created += 1
            else:
                skipped += 1
        return {"created": created, "skipped": skipped, "total": len(problems), "slugs": slugs}
