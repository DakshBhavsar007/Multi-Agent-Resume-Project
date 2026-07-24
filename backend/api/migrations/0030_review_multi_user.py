import django.db.models.deletion
from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ("api", "0029_review"),
    ]

    operations = [
        migrations.AlterField(
            model_name="review",
            name="seeker",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="reviews",
                to="api.jobseekeraccount",
            ),
        ),
        migrations.AddField(
            model_name="review",
            name="developer",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="reviews",
                to="api.developeraccount",
            ),
        ),
        migrations.AddField(
            model_name="review",
            name="recruiter",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="recruiter_reviews",
                to="api.company",
            ),
        ),
        migrations.AddField(
            model_name="review",
            name="user_type",
            field=models.CharField(
                choices=[("job_seeker", "Job Seeker"), ("developer", "Developer"), ("recruiter", "Recruiter")],
                default="job_seeker",
                max_length=20,
            ),
        ),
        migrations.AlterUniqueTogether(
            name="review",
            unique_together=set(),
        ),
    ]
