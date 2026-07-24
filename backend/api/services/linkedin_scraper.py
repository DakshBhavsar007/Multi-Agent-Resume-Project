import re
import json
import httpx
from agents.llm import RotateLLMClient

def extract_linkedin_slug_info(url: str) -> dict:
    """
    Parses a LinkedIn Job URL to extract fallback Job Title, Company, and Job ID.
    Supports formats:
      - https://www.linkedin.com/jobs/view/software-engineer-at-google-3958210344
      - https://www.linkedin.com/jobs/view/3958210344
      - https://www.linkedin.com/jobs/collections/recommended/?currentJobId=3958210344
    """
    result = {
        "job_id": None,
        "fallback_title": "Job Posting Target",
        "fallback_company": "LinkedIn Company",
        "fallback_location": "Remote"
    }

    # 1. Try to extract currentJobId from query parameters
    job_id_match = re.search(r"currentJobId=(\d+)", url)
    if job_id_match:
        result["job_id"] = job_id_match.group(1)

    # 2. Try to match /jobs/view/ slug and ID
    # Pattern matches optional slug text followed by the numeric ID
    view_match = re.search(r"linkedin\.com/jobs/view/(?:([a-zA-Z0-9\-]+)-)?(\d+)", url)
    if view_match:
        slug_text = view_match.group(1)
        job_id = view_match.group(2)
        if job_id:
            result["job_id"] = job_id
        
        if slug_text:
            # Check for "-at-" separator in slug
            if "-at-" in slug_text.lower():
                parts = re.split(r"-at-", slug_text, flags=re.IGNORECASE)
                if len(parts) >= 2:
                    result["fallback_title"] = parts[0].replace("-", " ").title()
                    result["fallback_company"] = parts[1].replace("-", " ").title()
            else:
                result["fallback_title"] = slug_text.replace("-", " ").title()

    return result

def fetch_linkedin_job_details(url: str) -> dict:
    """
    Fetches real-time job details from LinkedIn job post URL.
    Uses multi-tier fetching:
    1. LinkedIn Guest API: https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/<job_id>
    2. Direct URL fetch with custom desktop browser headers & OpenGraph / JSON-LD parsing.
    3. LLM structured metadata extraction.
    """
    slug_info = extract_linkedin_slug_info(url)
    job_id = slug_info.get("job_id")
    fallback_title = slug_info["fallback_title"]
    fallback_company = slug_info["fallback_company"]
    fallback_location = slug_info["fallback_location"]

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache"
    }

    html_content = ""
    scraped_successfully = False

    # Attempt 1: Fetch via LinkedIn Guest API if job_id is present
    if job_id:
        guest_api_url = f"https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/{job_id}"
        print(f"[LINKEDIN SCRAPER] Fetching via Guest API: {guest_api_url}", flush=True)
        try:
            with httpx.Client(follow_redirects=True, headers=headers, timeout=6.0) as client:
                res = client.get(guest_api_url)
                if res.status_code == 200 and len(res.text) > 300:
                    html_content = res.text
                    scraped_successfully = True
                    print("[LINKEDIN SCRAPER] Successfully retrieved HTML via Guest API.", flush=True)
        except Exception as api_err:
            print(f"[LINKEDIN SCRAPER] Guest API fetch failed: {api_err}", flush=True)

    # Attempt 2: Fetch target URL directly if Guest API wasn't successful
    if not scraped_successfully:
        print(f"[LINKEDIN SCRAPER] Fetching target URL directly: {url}", flush=True)
        try:
            with httpx.Client(follow_redirects=True, headers=headers, timeout=6.0) as client:
                res = client.get(url)
                if res.status_code == 200 and "login" not in res.url.path.lower():
                    html_content = res.text
                    if "og:title" in html_content or "og:description" in html_content or "jobPosting" in html_content:
                        scraped_successfully = True
                        print("[LINKEDIN SCRAPER] Successfully retrieved target URL HTML.", flush=True)
        except Exception as direct_err:
            print(f"[LINKEDIN SCRAPER] Direct URL fetch failed: {direct_err}", flush=True)

    # Fast-path JSON-LD parsing if structured schema is embedded
    job_title = None
    company_name = None
    location_val = None
    job_desc = None

    if html_content:
        # Check for <script type="application/ld+json">
        json_ld_matches = re.findall(r'<script[^>]*type=["\']application/ld\+json["\'][^>]*>([\s\S]*?)</script>', html_content, re.IGNORECASE)
        for ld_text in json_ld_matches:
            try:
                data = json.loads(ld_text.strip())
                if isinstance(data, dict) and data.get("@type") == "JobPosting":
                    job_title = data.get("title")
                    job_desc = data.get("description")
                    if isinstance(data.get("hiringOrganization"), dict):
                        company_name = data["hiringOrganization"].get("name")
                    if isinstance(data.get("jobLocation"), dict):
                        addr = data["jobLocation"].get("address", {})
                        if isinstance(addr, dict):
                            location_val = addr.get("addressLocality") or addr.get("addressRegion") or addr.get("addressCountry")
                    break
            except Exception:
                pass

        # Check OpenGraph meta tags if JSON-LD fields are missing
        if not job_title or not job_desc:
            og_title_m = re.search(r'<meta[^>]*property=["\']og:title["\'][^>]*content=["\'](.*?)["\']', html_content, re.IGNORECASE)
            og_desc_m = re.search(r'<meta[^>]*property=["\']og:description["\'][^>]*content=["\'](.*?)["\']', html_content, re.IGNORECASE)
            if og_title_m and not job_title:
                raw_og_title = og_title_m.group(1)
                # Split "Job Title - Company - Location"
                parts = raw_og_title.split(" hiring ") if " hiring " in raw_og_title else raw_og_title.split(" in ")
                if len(parts) >= 2:
                    job_title = parts[0].strip()
                    company_name = parts[1].strip()
                else:
                    job_title = raw_og_title.strip()
            if og_desc_m and not job_desc:
                job_desc = og_desc_m.group(1)

        # Check description HTML container elements
        if not job_desc or len(job_desc) < 50:
            desc_m = re.search(r'<div[^>]*class=["\'][^"\']*(?:show-more-less-html__markup|description__text)[^"\']*["\'][^>]*>([\s\S]*?)</div>', html_content, re.IGNORECASE)
            if desc_m:
                raw_desc_html = desc_m.group(1)
                # Clean HTML tags
                job_desc = re.sub(r'<[^>]+>', ' ', raw_desc_html).strip()

    # Clean HTML tags from JSON-LD description if present
    if job_desc and "<" in job_desc and ">" in job_desc:
        job_desc = re.sub(r'<[^>]+>', ' ', job_desc)
        job_desc = re.sub(r'\s+', ' ', job_desc).strip()

    if job_title and job_desc and len(job_desc) > 50:
        print("[LINKEDIN SCRAPER] Scraped & parsed real-time job post successfully!", flush=True)
        return {
            "job_title": job_title,
            "company_name": company_name or fallback_company,
            "location": location_val or fallback_location,
            "job_description": job_desc,
            "source_url": url,
            "scraped_successfully": True
        }

    # Fallback to LLM extraction if raw HTML exists but standard selectors didn't find all fields
    llm = RotateLLMClient()
    if scraped_successfully and len(html_content) > 200:
        head_match = re.search(r"<head>([\s\S]*?)</head>", html_content)
        body_match = re.search(r"<body>([\s\S]*?)</body>", html_content)
        extracted_html = (head_match.group(1) if head_match else "") + "\n" + (body_match.group(1)[:5000] if body_match else html_content[:6000])

        system_prompt = (
            "You are an expert LinkedIn job description extractor.\n"
            "Analyze the HTML metadata, page titles, and body to extract job listing details.\n"
            "Return ONLY valid JSON. No markdown codeblocks, no extra explanations."
        )
        prompt = f"""Extract the Job Title, Company Name, Location, and full Job Description from the following HTML context.
HTML context:
{extracted_html[:8000]}

Return JSON format:
{{
  "job_title": "string",
  "company_name": "string",
  "location": "string",
  "job_description": "string"
}}"""
        try:
            res_content = llm.generate(prompt=prompt, system_prompt=system_prompt).strip()
            if res_content.startswith("```json"): res_content = res_content[7:]
            if res_content.startswith("```"): res_content = res_content[3:]
            if res_content.endswith("```"): res_content = res_content[:-3]
            
            parsed_data = json.loads(res_content.strip())
            return {
                "job_title": parsed_data.get("job_title") or fallback_title,
                "company_name": parsed_data.get("company_name") or fallback_company,
                "location": parsed_data.get("location") or fallback_location,
                "job_description": parsed_data.get("job_description") or "Details could not be parsed.",
                "source_url": url,
                "scraped_successfully": True
            }
        except Exception as e:
            print(f"[LINKEDIN SCRAPER] LLM extraction from HTML failed: {e}", flush=True)

    # Fallback mode: Slug-based info & LLM generated mockup
    print(f"[LINKEDIN SCRAPER] Falling back to AI mockup generation for {fallback_title} at {fallback_company}", flush=True)
    system_prompt = (
        "You are an expert recruitment system AI.\n"
        "Your job is to simulate a realistic job posting description based on a job title and company.\n"
        "Return ONLY valid JSON. No markdown codeblocks, no extra explanations."
    )
    prompt = f"""Generate a realistic, typical job posting description and requirements list for safety audit purposes.
Job Title: {fallback_title}
Company Name: {fallback_company}
Location: {fallback_location}

Include typical responsibilities, required skills, and clear parameters. Make it look like a real job description.
Return JSON format:
{{
  "job_title": "{fallback_title}",
  "company_name": "{fallback_company}",
  "location": "{fallback_location}",
  "job_description": "string"
}}"""
    try:
        res_content = llm.generate(prompt=prompt, system_prompt=system_prompt).strip()
        if res_content.startswith("```json"): res_content = res_content[7:]
        if res_content.startswith("```"): res_content = res_content[3:]
        if res_content.endswith("```"): res_content = res_content[:-3]
        
        parsed_data = json.loads(res_content.strip())
        return {
            "job_title": parsed_data.get("job_title") or fallback_title,
            "company_name": parsed_data.get("company_name") or fallback_company,
            "location": parsed_data.get("location") or fallback_location,
            "job_description": parsed_data.get("job_description") or f"We are hiring a {fallback_title}.",
            "source_url": url,
            "scraped_successfully": False
        }
    except Exception as e:
        print(f"[LINKEDIN SCRAPER] LLM fallback mockup generation failed: {e}", flush=True)
        return {
            "job_title": fallback_title,
            "company_name": fallback_company,
            "location": fallback_location,
            "job_description": f"Typical listing for a {fallback_title} at {fallback_company}. Location: {fallback_location}.",
            "source_url": url,
            "scraped_successfully": False
        }
