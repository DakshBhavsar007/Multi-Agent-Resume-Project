import hashlib
import logging

logger = logging.getLogger(__name__)

def _get_flat_skills(skills_input):
    """Recursively flattens skills input into a clean list of strings."""
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
    elif isinstance(skills_input, str):
        flat.append(skills_input)
    return flat

from asgiref.sync import async_to_sync

def calculate_unified_match_score(skills, total_exp_years, location, entity_id_str, session):
    """
    Unified, deterministic match score calculation (0-100) powered by
    the 4-Tier Hybrid SemanticMatchingAgent shared by:
    - Seeker Find Jobs (/jobs/search)
    - Seeker Applications (/jobs/applications)
    - Recruiter Dashboard & Candidate Profiles
    """
    if not session:
        return 75, {"match_score": 75}

    criteria = getattr(session, "criteria", {}) or {}
    if not isinstance(criteria, dict):
        criteria = {}

    flat_skills = _get_flat_skills(skills)
    cand_dict = {
        "skills": flat_skills,
        "normalized_skills": flat_skills,
        "total_experience_years": total_exp_years or 0,
        "location": location or ""
    }

    try:
        from agents.matching_agent import SemanticMatchingAgent
        agent = SemanticMatchingAgent()
        result = async_to_sync(agent.match)(cand_dict, criteria)
        score = float(result.get("match_score", 75))
        return round(score, 1), result
    except Exception as err:
        logger.warning(f"SemanticMatchingAgent fallback in calculate_unified_match_score: {err}")

    # Fallback if async agent invocation encounters any issue
    required_skills = criteria.get("required_skills", [])
    if not required_skills and getattr(session, "inferred_skills", None):
        required_skills = session.inferred_skills or []

    req_lower = [str(r).lower().strip() for r in required_skills if r]
    cand_skill_names = {str(s).lower().strip() for s in flat_skills if s}

    matched_list = [r for r in required_skills if any(str(r).lower().strip() in s or s in str(r).lower().strip() for s in cand_skill_names)]
    missing_list = [r for r in required_skills if str(r).lower().strip() not in [m.lower().strip() for m in matched_list]]
    matched = len(matched_list)

    if req_lower:
        skill_score = round((matched / len(req_lower)) * 100)
    else:
        # No required skills defined for this job — cannot compute meaningful match
        skill_score = 0

    min_exp = criteria.get("min_experience", 0)
    try:
        exp_years = float(total_exp_years or 0)
    except (ValueError, TypeError):
        exp_years = 0.0
    experience_score = min(100, round((exp_years / max(min_exp, 1)) * 100)) if min_exp > 0 else (75 if exp_years >= 2 else 60)

    preferred_locs = criteria.get("preferred_locations", [])
    cand_location = (location or "").lower().strip()
    location_score = 100 if not preferred_locs else (100 if any(str(l).lower().strip() in cand_location for l in preferred_locs) else 50)

    weights = criteria.get("weights", {"skills": 0.5, "experience": 0.3, "location": 0.2})
    if not isinstance(weights, dict):
        weights = {"skills": 0.5, "experience": 0.3, "location": 0.2}

    raw_score = round(
        skill_score * weights.get("skills", 0.5) + 
        experience_score * weights.get("experience", 0.3) + 
        location_score * weights.get("location", 0.2)
    )
    
    # Strict matching: If there are required skills but 0 were matched, the candidate is a 0% match.
    if req_lower and matched == 0:
        raw_score = 0
        
    score = min(98, max(0, raw_score))

    details = {
        "match_score": score,
        "skill_score": skill_score,
        "experience_score": experience_score,
        "location_score": location_score,
        "matched_skills": matched_list,
        "missing_skills": missing_list,
        "matched_count": matched,
        "total_required": len(req_lower)
    }
    return score, details
