from django.apps import AppConfig
from django.db.models.signals import post_migrate

def ensure_default_superuser(sender=None, **kwargs):
    import os
    try:
        from django.contrib.auth import get_user_model
        User = get_user_model()
        admin_email = os.getenv("ADMIN_EMAIL", "admin@between.com").strip().lower()
        admin_password = os.getenv("ADMIN_PASSWORD", "Admin@007")
        username = os.getenv("ADMIN_USERNAME", "admin").strip()
        
        user = User.objects.filter(username=username).first() or User.objects.filter(email=admin_email).first()
        if not user:
            User.objects.create_superuser(username=username, email=admin_email, password=admin_password)
            print(f"[INIT] Superuser '{username}' ({admin_email}) created successfully.")
        else:
            user.username = username
            user.email = admin_email
            user.set_password(admin_password)
            user.is_staff = True
            user.is_superuser = True
            user.is_active = True
            user.save()
            print(f"[INIT] Superuser '{username}' ({admin_email}) password & permissions synced.")
    except Exception as e:
        print(f"[INIT] Superuser sync skipped: {e}")

class ApiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'api'

    def ready(self):
        post_migrate.connect(ensure_default_superuser, sender=self)
        try:
            ensure_default_superuser()
        except Exception:
            pass
