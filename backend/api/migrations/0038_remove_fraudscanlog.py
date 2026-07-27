"""
Migration to remove FraudScanLog model and clean up fraud_agent from AgentModelConfig.
"""
from django.db import migrations


def remove_fraud_agent_config(apps, schema_editor):
    """Remove fraud_agent row from agent_model_config if it exists."""
    AgentModelConfig = apps.get_model("api", "AgentModelConfig")
    AgentModelConfig.objects.filter(agent_name="fraud_agent").delete()


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0037_gemini_project_apikey_agent_config"),
    ]

    operations = [
        migrations.DeleteModel(
            name="FraudScanLog",
        ),
        migrations.RunPython(remove_fraud_agent_config, noop),
    ]
