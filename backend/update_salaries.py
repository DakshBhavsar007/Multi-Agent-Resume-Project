import os
import django

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'vishleshan_backend.settings')
django.setup()

from api.models import Session

def parse_salary_from_description(salary_str, title):
    if not salary_str or salary_str.lower() == "competitive":
        return get_default_salary(title)
        
    # Detect currency
    currency = "USD"
    if "₹" in salary_str or "lpa" in salary_str.lower() or "inr" in salary_str.lower():
        currency = "INR"
    elif "£" in salary_str or "gbp" in salary_str.lower():
        currency = "GBP"
    elif "€" in salary_str or "eur" in salary_str.lower():
        currency = "EUR"
        
    # Parse numbers
    import re
    clean_str = salary_str.replace(",", "")
    pattern = re.compile(r'([0-9.]+)\s*([a-zA-Z\s]*)')
    matches = pattern.findall(clean_str)
    values = []
    
    for m in matches:
        num_str, suffix = m
        try:
            num = float(num_str)
            suffix_clean = suffix.lower().strip()
            val = num
            
            if currency == "INR":
                if "k" in suffix_clean:
                    val = (num * 1000) / 100000
                elif num >= 1000:
                    val = num / 100000
            else:
                if "k" in suffix_clean:
                    val = num
                elif num >= 1000:
                    val = num / 1000
            values.append(val)
        except ValueError:
            continue
            
    if not values:
        return get_default_salary(title)
        
    min_val = values[0]
    max_val = values[1] if len(values) > 1 else min_val
    return min_val, max_val, currency

def get_default_salary(title):
    title_lower = title.lower()
    # 1. Interns
    if "intern" in title_lower:
        # e.g. 2 - 4 LPA or 20k - 35k USD
        if any(w in title_lower for w in ["india", "mumbai", "bengaluru", "pune", "delhi", "ahmedabad"]):
            return 2, 4, "INR"
        return 20, 35, "USD"
    # 2. Software Developers/Engineers
    elif any(w in title_lower for w in ["software", "developer", "engineer", "full stack", "frontend", "backend", "data", "ai", "ml"]):
        if any(w in title_lower for w in ["india", "mumbai", "bengaluru", "pune", "delhi", "ahmedabad", "yuvraj"]):
            return 12, 18, "INR"
        return 80, 120, "USD"
    # 3. Defaults
    else:
        if any(w in title_lower for w in ["india", "mumbai", "bengaluru", "pune", "delhi", "ahmedabad"]):
            return 8, 12, "INR"
        return 60, 90, "USD"

def main():
    print("Database URL:", os.getenv("DATABASE_URL"))
    sessions = Session.objects.all()
    print(f"Total sessions found: {len(sessions)}")
    
    updated_count = 0
    for s in sessions:
        criteria = s.criteria or {}
        salary_min = criteria.get("salary_min")
        salary_max = criteria.get("salary_max")
        
        # Check if salary is already properly specified (non-null and greater than 0)
        if salary_min is not None and salary_max is not None:
            # Already specified, skip
            continue
            
        # Parse from description
        from api.views.seeker_jobs import _parse_job_description_meta
        meta = _parse_job_description_meta(s.job_description)
        salary_range_str = meta.get("salary_range", "Competitive")
        
        min_val, max_val, currency = parse_salary_from_description(salary_range_str, s.job_title)
        
        criteria["salary_min"] = min_val
        criteria["salary_max"] = max_val
        criteria["salary_currency"] = currency
        
        s.criteria = criteria
        s.save(update_fields=["criteria"])
        updated_count += 1
        print(f"Updated Session '{s.name}' ({s.job_title}) to: {min_val} - {max_val} {currency}")
        
    print(f"Update complete! {updated_count} sessions updated.")

if __name__ == "__main__":
    main()
