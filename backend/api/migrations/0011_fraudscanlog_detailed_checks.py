from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ("api", "0010_resumeversion"),
    ]

    operations = [
        migrations.AddField(
            model_name="fraudscanlog",
            name="detailed_checks",
            field=models.JSONField(default=dict),
        ),
    ]
