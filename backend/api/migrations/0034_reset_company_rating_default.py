# Generated manually on 2026-07-24

from django.db import migrations, models


def reset_company_ratings(apps, schema_editor):
    Company = apps.get_model("api", "Company")
    Company.objects.all().update(rating=0.0)


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0033_add_company_notification_settings"),
    ]

    operations = [
        migrations.AlterField(
            model_name="company",
            name="rating",
            field=models.FloatField(default=0.0),
        ),
        migrations.RunPython(reset_company_ratings, reverse_code=migrations.RunPython.noop),
    ]
