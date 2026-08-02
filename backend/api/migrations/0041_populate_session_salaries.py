from django.db import migrations

def populate_session_salaries(apps, schema_editor):
    Session = apps.get_model('api', 'Session')
    sessions = Session.objects.all()
    updated_count = 0
    for s in sessions:
        criteria = s.criteria or {}
        sal_min = s.min_salary if s.min_salary is not None else (criteria.get('salary_min') if isinstance(criteria, dict) else None)
        if sal_min is None and isinstance(criteria, dict):
            sal_min = criteria.get('min_salary')

        sal_max = s.max_salary if s.max_salary is not None else (criteria.get('salary_max') if isinstance(criteria, dict) else None)
        if sal_max is None and isinstance(criteria, dict):
            sal_max = criteria.get('max_salary')

        curr = s.salary_currency if s.salary_currency else (criteria.get('salary_currency') if isinstance(criteria, dict) else 'INR')
        if not curr:
            curr = 'INR'

        norm_min = None
        norm_max = None

        if sal_min is not None and sal_min != '':
            try:
                v = float(sal_min)
                if curr == 'INR' and v < 200:
                    norm_min = v * 100000.0
                elif curr != 'INR' and v < 1000:
                    norm_min = v * 1000.0
                else:
                    norm_min = v
            except (ValueError, TypeError):
                pass

        if sal_max is not None and sal_max != '':
            try:
                v = float(sal_max)
                if curr == 'INR' and v < 200:
                    norm_max = v * 100000.0
                elif curr != 'INR' and v < 1000:
                    norm_max = v * 1000.0
                else:
                    norm_max = v
            except (ValueError, TypeError):
                pass

        s.min_salary = norm_min
        s.max_salary = norm_max
        s.salary_currency = curr

        if isinstance(criteria, dict):
            criteria['salary_min'] = norm_min
            criteria['salary_max'] = norm_max
            criteria['salary_currency'] = curr
            s.criteria = criteria

        s.save(update_fields=['min_salary', 'max_salary', 'salary_currency', 'criteria'])
        updated_count += 1
    print(f"Successfully populated salary standards for {updated_count} database sessions.")

def reverse_func(apps, schema_editor):
    pass

class Migration(migrations.Migration):

    dependencies = [
        ('api', '0040_session_max_salary_session_min_salary_and_more'),
    ]

    operations = [
        migrations.RunPython(populate_session_salaries, reverse_func),
    ]
