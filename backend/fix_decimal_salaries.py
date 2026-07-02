import os
import django

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'vishleshan_backend.settings')
django.setup()

from api.models import Session

def main():
    print("Database URL:", os.getenv("DATABASE_URL"))
    sessions = Session.objects.all()
    updated_count = 0
    for s in sessions:
        criteria = s.criteria or {}
        if criteria.get("salary_currency") == "INR":
            min_val = criteria.get("salary_min")
            max_val = criteria.get("salary_max")
            
            # If the database value is a decimal like 0.18 or 0.2, multiply by 100 to make it 18 and 20
            if min_val is not None and min_val < 1.0:
                old_min = min_val
                old_max = max_val
                criteria["salary_min"] = round(min_val * 100, 2)
                if max_val is not None:
                    criteria["salary_max"] = round(max_val * 100, 2)
                s.criteria = criteria
                s.save(update_fields=["criteria"])
                updated_count += 1
                print(f"Updated Session '{s.name}' ({s.job_title}) INR salary from {old_min}-{old_max} to: {criteria['salary_min']}-{criteria['salary_max']}")
                
    print(f"Update complete! {updated_count} sessions updated.")

if __name__ == "__main__":
    main()
