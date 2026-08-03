import hashlib
import logging
import re

logger = logging.getLogger(__name__)

def _normalize_skill(s):
    """Normalize skill string for fuzzy matching (e.g. 'HTML5' -> 'html', 'CSS3' -> 'css', 'JS' -> 'javascript')."""
    if not s:
        return ""
    s = str(s).lower().strip()
    s = re.sub(r'[\d\.\-\_\s]', '', s)
    if s in ['js', 'javascript']:
        return 'javascript'
    if s in ['reactjs', 'react']:
        return 'react'
    if s in ['nodejs', 'node']:
        return 'node'
    return s

def _get_flat_skills(skills_input):
    """Recursively flattens skills input into a clean list of strings from lists, dicts, or nested objects."""
    if not skills_input:
        return []
    flat = []
    if isinstance(skills_input, list):
        for item in skills_input:
            if isinstance(item, dict):
                val = item.get("canonical_skill") or item.get("name") or item.get("skill") or str(item)
                flat.append(str(val))
            elif isinstance(item, str):
                flat.append(item)
            elif isinstance(item, list):
                flat.extend(_get_flat_skills(item))
    elif isinstance(skills_input, dict):
        for k, v in skills_input.items():
            flat.extend(_get_flat_skills(v))
    elif isinstance(skills_input, str):
        flat.append(skills_input)
    return flat

def calculate_unified_match_score(skills, total_exp_years, location, entity_id_str, session):
    """
    Pure mathematical, dynamic match score calculation (0–100%) without artificial minimum clamping.
    Formula:
      - Skill Match (50% weight): Ratio of matched job skills to required skills.
      - Experience Match (25% weight): Candidate experience vs required min experience.
      - Location Match (15% weight): Match candidate location against preferred locations or remote.
      - Title / Domain Match (10% weight): Relevance of job title keywords in candidate skills.
    """
    if not session:
        return 75, {"match_score": 75}

    criteria = getattr(session, "criteria", {}) or {}
    if not isinstance(criteria, dict):
        criteria = {}

    required_skills = criteria.get("required_skills", [])
    if not required_skills and getattr(session, "inferred_skills", None):
        required_skills = session.inferred_skills or []

    req_norm_list = [_normalize_skill(r) for r in required_skills if r]
    flat_skills = _get_flat_skills(skills)
    cand_norm_set = {_normalize_skill(s) for s in flat_skills if s}

    # 1. Skill Match Score (50% Weight)
    matched_list = []
    for r in required_skills:
        rn = _normalize_skill(r)
        if rn and (rn in cand_norm_set or any(rn in c or c in rn for c in cand_norm_set if len(c) > 2)):
            matched_list.append(r)

    missing_list = [r for r in required_skills if r not in matched_list]
    matched_count = len(matched_list)

    if req_norm_list:
        skill_score = round((matched_count / len(req_norm_list)) * 100)
    else:
        skill_score = 50 if cand_norm_set else 0

    # 2. Experience Match Score (25% Weight)
    min_exp = criteria.get("min_experience", 0)
    try:
        exp_val = total_exp_years if total_exp_years is not None else 0
        exp_years = float(exp_val)
    except (ValueError, TypeError):
        exp_years = 0.0

    if min_exp > 0:
        experience_score = min(100, round((exp_years / min_exp) * 100))
    else:
        experience_score = 100 if exp_years >= 1 else 70

    # 3. Location Match Score (15% Weight)
    preferred_locs = criteria.get("preferred_locations", [])
    cand_location = (location or "").lower().strip()
    if not preferred_locs or "remote" in [str(l).lower().strip() for l in preferred_locs]:
        location_score = 100
    elif cand_location and any(str(l).lower().strip() in cand_location or cand_location in str(l).lower().strip() for l in preferred_locs):
        location_score = 100
    else:
        location_score = 0

    # 4. Title / Domain Keyword Match (10% Weight)
    title_lower = (session.job_title or "").lower()
    title_score = 0
    if cand_norm_set:
        matches_title = sum(1 for c in cand_norm_set if len(c) > 2 and c in title_lower)
        if matches_title > 0:
            title_score = min(100, matches_title * 40)
        elif any(k in title_lower for k in ['developer', 'engineer', 'software', 'frontend', 'backend', 'web', 'python', 'javascript', 'ui']):
            title_score = 50

    # Pure Weighted Match Score calculation (0 to 100)
    raw_score = round(
        skill_score * 0.50 +
        experience_score * 0.25 +
        location_score * 0.15 +
        title_score * 0.10
    )

    # Final score strictly bounded to 0..100 (no artificial minimum floor like 15 or 45!)
    score = max(0, min(100, raw_score))

    details = {
        "match_score": score,
        "skill_score": skill_score,
        "experience_score": experience_score,
        "location_score": location_score,
        "title_score": title_score,
        "matched_skills": matched_list,
        "missing_skills": missing_list,
        "matched_count": matched_count,
        "total_required": len(req_norm_list)
    }
    return score, details