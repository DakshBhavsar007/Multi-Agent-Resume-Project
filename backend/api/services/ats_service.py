"""
Unified ATS Scoring Engine Service
───────────────────────────────────
Single source of truth for ATS scoring (0–100 deterministic scale).
Categories (100 total):
  1. keyword_match (35 pts)
  2. formatting (25 pts) — includes role-adaptive creative bonus (max 6, capped inside 25)
  3. content_impact (20 pts)
  4. contact_completeness (10 pts)
  5. timeline_consistency (10 pts)
"""

import re
import logging
from typing import Dict, Any, List, Tuple
from datetime import datetime

logger = logging.getLogger(__name__)

# Design / Creative role keywords for role adaptation
CREATIVE_ROLE_KEYWORDS = {
    "design", "designer", "ui", "ux", "ui/ux", "graphic", "illustrator",
    "animator", "art", "motion", "brand", "video", "visual", "creative", "product designer"
}

ACTION_VERBS = {
    "led", "spearheaded", "architected", "built", "developed", "created", "designed",
    "implemented", "engineered", "optimized", "improved", "increased", "reduced",
    "decreased", "automated", "orchestrated", "streamlined", "transformed", "managed",
    "launched", "delivered", "expanded", "generated", "pioneered", "refactored"
}

CONTACT_FIELDS = ["email", "phone", "linkedin", "location"]


def is_creative_role(job_description: str, resume_data: Dict[str, Any]) -> bool:
    """Detects if job description or resume targets a creative/design role."""
    combined = (job_description + " " + str(resume_data.get("headline", "")) + " " + str(resume_data.get("current_role", ""))).lower()
    return any(ck in combined for ck in CREATIVE_ROLE_KEYWORDS)


def calculate_job_title_score(resume_role: str, target_role: str) -> float:
    """
    Returns title relevance multiplier between 0.7 and 1.0.
    5-tier heuristic matching.
    """
    if not resume_role or not target_role:
        return 0.85

    r = resume_role.lower().strip()
    t = target_role.lower().strip()

    if r == t:
        return 1.0
    if r in t or t in r:
        return 0.95

    r_words = set(re.findall(r'\w+', r))
    t_words = set(re.findall(r'\w+', t))
    common = r_words.intersection(t_words)

    if common:
        return 0.90

    # Domain similarity check
    domains = [
        {"software", "developer", "engineer", "fullstack", "frontend", "backend", "web"},
        {"data", "analyst", "scientist", "machine learning", "ai", "bi"},
        {"design", "ui", "ux", "graphic", "creative", "product designer"},
        {"manager", "lead", "director", "head", "product manager", "project manager"}
    ]
    for d in domains:
        if any(w in d for w in r_words) and any(w in d for w in t_words):
            return 0.85

    return 0.70


def extract_all_bullets(resume_data: Dict[str, Any]) -> List[str]:
    """Extracts all experience bullet points from resume data."""
    bullets = []
    for exp in resume_data.get("experience", []) or []:
        if isinstance(exp, dict):
            b_list = exp.get("bullets") or exp.get("responsibilities") or []
            if isinstance(b_list, list):
                bullets.extend([str(b) for b in b_list if b])
            elif isinstance(b_list, str):
                bullets.append(b_list)
    return bullets


def calculate_unified_ats_score(
    resume_data: Dict[str, Any],
    job_description: str,
    resume_text: str = ""
) -> Dict[str, Any]:
    """
    Main unified ATS scoring engine.
    Returns structured report with overall_score (0-100), categories breakdown, suggestions, keywords.
    """
    if not resume_data:
        resume_data = {}

    # Extract all bullets early at top of function so Section 2 & Section 3 can safely use it
    bullets = extract_all_bullets(resume_data)

    suggestions = []

    # 1. SECTION 1: KEYWORD MATCH (Max 35 points)
    # ──────────────────────────────────────────
    jd_skills = set(re.findall(r'\b[a-zA-Z0-9+#.-]{2,30}\b', job_description.lower()))
    resume_skills = set()

    for s in resume_data.get("skills", []) or []:
        if isinstance(s, str):
            resume_skills.add(s.lower().strip())
        elif isinstance(s, dict):
            val = s.get("canonical_skill") or s.get("skill") or s.get("name") or ""
            if val:
                resume_skills.add(str(val).lower().strip())

    # Text extraction fallback
    if resume_text:
        for w in re.findall(r'\b[a-zA-Z0-9+#.-]{2,30}\b', resume_text.lower()):
            if len(w) > 2:
                resume_skills.add(w)

    matched_kws = list(jd_skills.intersection(resume_skills))
    missing_kws = list(jd_skills.difference(resume_skills))

    base_kw_pct = (len(matched_kws) / max(1, len(jd_skills))) if jd_skills else 0.5
    kw_score_raw = base_kw_pct * 35.0

    # Semantic booster
    try:
        from agents.ats_compatibility_agent import compute_semantic_similarity
        if bullets and job_description:
            jd_sentences = [s.strip() for s in job_description.split('.') if len(s.strip()) > 10][:10]
            sem_sim, _ = compute_semantic_similarity(jd_sentences, bullets[:15])
            if sem_sim > 0.6:
                boost = (35.0 - kw_score_raw) * 0.15
                kw_score_raw += boost
    except Exception as sem_err:
        logger.warning("Semantic similarity booster skipped: %s", sem_err)

    # Apply job title multiplier
    target_role = ""
    target_match = re.search(r'(?:role|position|title):\s*([^\n]+)', job_description, re.IGNORECASE)
    if target_match:
        target_role = target_match.group(1).strip()
    resume_role = resume_data.get("headline") or resume_data.get("current_role") or ""

    title_mult = calculate_job_title_score(resume_role, target_role)
    keyword_score = round(min(35.0, kw_score_raw * title_mult), 1)

    if len(missing_kws) > 0:
        top_missing = missing_kws[:5]
        suggestions.append(f"Incorporate missing target keywords into your experience bullets: {', '.join(top_missing)}.")


    # 2. SECTION 2: PARSABILITY & FORMATTING (Max 25 points)
    # ───────────────────────────────────────────────────────
    fmt_score = 25
    fmt_issues = []

    text_to_check = resume_text or " ".join(bullets)
    text_lower = text_to_check.lower()

    if "[left column]" in text_lower or "[right column]" in text_lower:
        fmt_score -= 10
        fmt_issues.append("Multi-column layout detected. Ensure standard single-column order.")

    if text_to_check.count("|") >= 6:
        fmt_score -= 5
        fmt_issues.append("Excessive table markers (|) found. Use plain text formatting.")

    creative_icons = ["✉", "☎", "📞", "📧", "🔗", "🏠", "💼", "💻", "🎓", "🚀", "📱"]
    if any(icon in text_to_check for icon in creative_icons):
        fmt_score -= 5
        fmt_issues.append("Icon symbols detected. Use standard text labels.")

    # Creative role bonus (up to 6 points: 3 portfolio links + 3 case studies)
    is_creative = is_creative_role(job_description, resume_data)
    creative_bonus = 0
    if is_creative:
        # Check portfolio links
        personal = resume_data.get("personalInfo", {}) or {}
        has_link = bool(
            personal.get("portfolio") or personal.get("website") or personal.get("github") or
            any("http" in str(b) or "github" in str(b) or "behance" in str(b) or "dribbble" in str(b) for b in bullets)
        )
        if has_link:
            creative_bonus += 3

        # Check case study impact in bullets
        design_kws = ["case study", "user research", "wireframe", "prototype", "figma", "usability", "design system"]
        has_case_study = any(any(dk in b.lower() for dk in design_kws) for b in bullets)
        if has_case_study:
            creative_bonus += 3

        fmt_score = min(25, fmt_score + creative_bonus)

    formatting_score = round(max(0, fmt_score), 1)


    # 3. SECTION 3: CONTENT IMPACT & QUALITY (Max 20 points)
    # ──────────────────────────────────────────────────────
    impact_score = 20.0
    if not bullets:
        impact_score = 5.0
        suggestions.append("Add detailed bullet points under work experience entries.")
    else:
        # Action verb check
        verb_starts = 0
        quantified_count = 0
        for b in bullets:
            first_word = str(b).strip().split()[0].lower() if b.strip() else ""
            cleaned_word = re.sub(r'[^a-z]', '', first_word)
            if cleaned_word in ACTION_VERBS:
                verb_starts += 1
            if re.search(r'\d+%|\$\d+|\b\d+\s*(?:users|clients|projects|ms|sec|x)\b', str(b), re.IGNORECASE):
                quantified_count += 1

        action_verb_ratio = verb_starts / len(bullets)
        quantified_ratio = quantified_count / len(bullets)

        if action_verb_ratio < 0.5:
            impact_score -= 5.0
            suggestions.append("Begin more bullet points with strong action verbs (e.g., 'Architected', 'Optimized').")

        if quantified_ratio < 0.3:
            impact_score -= 5.0
            suggestions.append("Add measurable metrics to experience bullets (e.g., 'Reduced latency by [X]%').")

    content_impact_score = round(max(0.0, impact_score), 1)


    # 4. SECTION 4: CONTACT COMPLETENESS (Max 10 points)
    # ──────────────────────────────────────────────────
    contact_score = 0
    personal = resume_data.get("personalInfo", {}) or resume_data

    if personal.get("email"): contact_score += 3
    if personal.get("phone"): contact_score += 3
    if personal.get("location"): contact_score += 2
    if personal.get("linkedin") or personal.get("github") or personal.get("portfolio"): contact_score += 2

    contact_completeness_score = round(min(10.0, contact_score), 1)
    if contact_score < 10:
        suggestions.append("Ensure email, phone, location, and LinkedIn/portfolio links are fully completed.")


    # 5. SECTION 5: TIMELINE CONSISTENCY (Max 10 points)
    # ──────────────────────────────────────────────────
    timeline_score = 10.0
    experiences = resume_data.get("experience", []) or []
    if not experiences:
        timeline_score = 5.0
    else:
        # Check for missing dates
        missing_dates = 0
        for exp in experiences:
            if isinstance(exp, dict):
                if not exp.get("startDate") and not exp.get("dates"):
                    missing_dates += 1
        if missing_dates > 0:
            timeline_score -= 3.0
            suggestions.append("Provide start and end dates for all work experience entries.")

    timeline_consistency_score = round(max(0.0, timeline_score), 1)


    # OVERALL SCORE CALCULATION (Deterministic sum, capped at 100)
    # ────────────────────────────────────────────────────────────
    overall_score = round(min(100.0, (
        keyword_score +
        formatting_score +
        content_impact_score +
        contact_completeness_score +
        timeline_consistency_score
    )))

    # Legacy score fallback banner handling if present in resume_data
    legacy_score = resume_data.get("legacy_ats_score")
    migration_note = None
    if legacy_score is not None:
        migration_note = (
            f"Note: Score updated from legacy {legacy_score} to unified ATS score {overall_score} "
            "for improved transparency across all 5 evaluation criteria."
        )

    # Calculate Verdict
    if overall_score >= 90:
        verdict = "Excellent Match"
    elif overall_score >= 80:
        verdict = "Good Match"
    elif overall_score >= 60:
        verdict = "Fair Match"
    else:
        verdict = "Poor Match"

    categories = [
        {"name": "keyword_match", "display_name": "Keyword & Skill Match", "score": keyword_score, "max": 35},
        {"name": "formatting", "display_name": "Parsability & Formatting", "score": formatting_score, "max": 25},
        {"name": "content_impact", "display_name": "Content Impact & Metrics", "score": content_impact_score, "max": 20},
        {"name": "contact_completeness", "display_name": "Contact Information", "score": contact_completeness_score, "max": 10},
        {"name": "timeline_consistency", "display_name": "Timeline & Date Consistency", "score": timeline_consistency_score, "max": 10},
    ]

    return {
        "overall_score": overall_score,
        "score": overall_score,  # Alias for backward compatibility
        "verdict": verdict,
        "categories": categories,
        "matched_keywords": matched_kws[:20],
        "missing_keywords": missing_kws[:20],
        "suggestions": suggestions,
        "recommendations": suggestions,  # Alias
        "legacy_score": legacy_score,
        "migration_note": migration_note
    }
