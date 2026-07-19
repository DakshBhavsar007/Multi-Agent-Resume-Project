from django.db import migrations
from django.core.cache import cache

def update_prices(apps, schema_editor):
    SubscriptionPlan = apps.get_model('api', 'SubscriptionPlan')
    
    # Update seeker_pro_monthly
    plan_pro = SubscriptionPlan.objects.filter(id="seeker_pro_monthly").first()
    if plan_pro:
        plan_pro.price = 299.0
        plan_pro.currency = "INR"
        plan_pro.save()

    # Update seeker_premium
    plan_premium = SubscriptionPlan.objects.filter(id="seeker_premium").first()
    if plan_premium:
        plan_premium.price = 299.0
        plan_premium.currency = "INR"
        plan_premium.save()
        
    # Clear the cache to invalidate dynamic_data_seeker_plans and seeker_billing_plans
    try:
        cache.delete('dynamic_data_seeker_plans')
        cache.delete('seeker_billing_plans')
    except Exception:
        pass

def rollback_prices(apps, schema_editor):
    pass

class Migration(migrations.Migration):

    dependencies = [
        ('api', '0026_adminbanlog_developeraccount_is_banned_and_more'),
    ]

    operations = [
        migrations.RunPython(update_prices, rollback_prices),
    ]
