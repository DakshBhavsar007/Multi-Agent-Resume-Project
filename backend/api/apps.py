from django.apps import AppConfig
from django.db.models.signals import post_migrate

def create_default_superuser(sender, **kwargs):
    import os
    try:
        from django.contrib.auth import get_user_model
        User = get_user_model()
        admin_email = os.getenv("ADMIN_EMAIL", "admin@between.com").strip().lower()
        admin_password = os.getenv("ADMIN_PASSWORD", "Admin@007")
        username = "admin"
        
        if not User.objects.filter(username=username).exists() and not User.objects.filter(email=admin_email).exists():
            User.objects.create_superuser(username=username, email=admin_email, password=admin_password)
            print(f"[INIT] Superuser '{username}' ({admin_email}) created successfully.")
    except Exception as e:
        pass

class ApiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'api'

    def ready(self):
        post_migrate.connect(create_default_superuser, sender=self)
