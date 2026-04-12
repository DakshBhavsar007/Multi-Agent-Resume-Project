import os
from dotenv import load_dotenv

load_dotenv(dotenv_path="backend/.env")
print("OPENAI_API_KEY inside script:", os.getenv("OPENAI_API_KEY"))

import sys
sys.path.append(os.path.abspath("backend"))

from workers.celery_worker import _parse_resume_sync

res = _parse_resume_sync("/app/dummy.txt")
print("Result method:", res.get("parsing_method"))
print("Result parsed:", res.get("parsed"))
