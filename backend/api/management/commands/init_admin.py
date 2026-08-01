import os
import logging
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Creates or updates the Django admin superuser automatically from environment variables.'

    def handle(self, *args, **options):
        username = os.getenv("ADMIN_USERNAME", "admin").strip('"\'')
        email = os.getenv("ADMIN_EMAIL", "admin@between.com").strip('"\'')
        password = os.getenv("ADMIN_PASSWORD", "Between@Admin#2026").strip('"\'')

        try:
            user, created = User.objects.get_or_create(username=username, defaults={"email": email})
            user.email = email
            user.set_password(password)
            user.is_staff = True
            user.is_superuser = True
            user.save()

            if created:
                self.stdout.write(self.style.SUCCESS(f"Superuser '{username}' created successfully!"))
                logger.info(f"Superuser '{username}' created.")
            else:
                self.stdout.write(self.style.SUCCESS(f"Superuser '{username}' refreshed successfully!"))
                logger.info(f"Superuser '{username}' updated.")
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error creating/updating superuser: {e}"))
            logger.error(f"Error creating superuser: {e}")
