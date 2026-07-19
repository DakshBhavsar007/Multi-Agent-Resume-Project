import os
import json
from django.test import TestCase, Client
from django.urls import reverse
from jose import jwt
from passlib.context import CryptContext
from api.models import Company, JobSeekerAccount, SupportTicket, AdminBanLog
from api.decorators import redis_client

JWT_SECRET = os.getenv("JWT_SECRET", "supersecret")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class AdminViewsTest(TestCase):
    def setUp(self):
        self.client = Client()
        # Set up environment variables for Admin Credentials
        os.environ["ADMIN_EMAIL"] = "admin@between.com"
        os.environ["ADMIN_PASSWORD"] = "Admin@007"

        # Create sample seeker with valid password hash
        self.seeker = JobSeekerAccount.objects.create(
            full_name="Daksh Bhavsar",
            email="daksh@example.com",
            password_hash=pwd_context.hash("validpassword"),
            is_banned=False
        )

        # Create sample company with valid password hash
        self.company = Company.objects.create(
            name="Recruiter Corp",
            email="recruiter@example.com",
            password_hash=pwd_context.hash("validpassword"),
            is_banned=False
        )

        # Generate mock admin JWT token
        payload = {
            "email": "admin@between.com",
            "is_admin": True,
            "exp": 9999999999
        }
        self.admin_jwt = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
        self.auth_headers = {
            "HTTP_AUTHORIZATION": f"Bearer {self.admin_jwt}"
        }

        # Generate mock seeker JWT token
        seeker_payload = {
            "seeker_id": str(self.seeker.id),
            "email": self.seeker.email,
            "exp": 9999999999
        }
        self.seeker_jwt = jwt.encode(seeker_payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
        self.seeker_headers = {
            "HTTP_AUTHORIZATION": f"Bearer {self.seeker_jwt}"
        }

        # Clear Redis rate limits and ban status cache for isolation
        try:
            redis_client.flushdb()
        except Exception:
            pass

    def test_submit_support_ticket(self):
        url = reverse("support-ticket-create")
        data = {
            "name": "Daksh Bhavsar",
            "email": "daksh@example.com",
            "subject": "Appeal Ban",
            "message": "Please unban me."
        }
        response = self.client.post(
            url,
            data=json.dumps(data),
            content_type="application/json"
        )
        self.assertEqual(response.status_code, 200)
        res_data = response.json()
        self.assertTrue(res_data["success"])
        
        # Verify stored ticket is raw/unescaped in the DB
        stored = SupportTicket.objects.filter(email="daksh@example.com").first()
        self.assertIsNotNone(stored)
        self.assertEqual(stored.subject, "Appeal Ban")

    def test_admin_login_success(self):
        # Admin logs in through dedicated admin login view
        url = reverse("admin-auth-login")
        data = {
            "email": "admin@between.com",
            "password": "Admin@007"
        }
        response = self.client.post(
            url,
            data=json.dumps(data),
            content_type="application/json"
        )
        self.assertEqual(response.status_code, 200)
        res_data = response.json()
        self.assertTrue(res_data["success"])
        self.assertTrue(res_data["data"]["is_admin"])
        self.assertIn("jwt_token", res_data["data"])

    def test_admin_login_failure(self):
        url = reverse("admin-auth-login")
        data = {
            "email": "admin@between.com",
            "password": "WrongPassword"
        }
        response = self.client.post(
            url,
            data=json.dumps(data),
            content_type="application/json"
        )
        self.assertEqual(response.status_code, 401)

    def test_standard_login_rejects_admin(self):
        # Admin credentials should not work on seeker or recruiter standard logins
        url = reverse("seeker-auth-login")
        data = {
            "email": "admin@between.com",
            "password": "Admin@007"
        }
        response = self.client.post(
            url,
            data=json.dumps(data),
            content_type="application/json"
        )
        self.assertEqual(response.status_code, 401)

        url = reverse("auth-login")
        response = self.client.post(
            url,
            data=json.dumps(data),
            content_type="application/json"
        )
        self.assertEqual(response.status_code, 401)

    def test_non_admin_cannot_access_dashboard(self):
        url = reverse("admin-dashboard")
        response = self.client.get(url, **self.seeker_headers)
        self.assertEqual(response.status_code, 403)

    def test_banned_user_login_rejection(self):
        self.seeker.is_banned = True
        self.seeker.save()

        # Clear Redis ban status cache
        try:
            redis_client.delete(f"ban_status:seeker:{self.seeker.id}")
        except Exception:
            pass

        url = reverse("seeker-auth-login")
        data = {
            "email": "daksh@example.com",
            "password": "validpassword"
        }
        response = self.client.post(
            url,
            data=json.dumps(data),
            content_type="application/json"
        )
        self.assertEqual(response.status_code, 403)
        res_data = response.json()
        self.assertIn("banned by admin", res_data["error"].lower())

    def test_banned_user_active_session_rejection(self):
        # Seeker is originally unbanned, token is valid
        url = reverse("seeker-billing-current")
        response = self.client.get(url, **self.seeker_headers)
        self.assertEqual(response.status_code, 200)

        # Seeker is banned mid-session
        url_ban = reverse("admin-users-ban")
        data_ban = {
            "type": "seeker",
            "id": str(self.seeker.id),
            "action": "ban"
        }
        response_ban = self.client.post(
            url_ban,
            data=json.dumps(data_ban),
            content_type="application/json",
            **self.auth_headers
        )
        self.assertEqual(response_ban.status_code, 200)

        # Same token is used, but should now get rejected with 403 (leverages Redis cache cleared on ban)
        response = self.client.get(url, **self.seeker_headers)
        self.assertEqual(response.status_code, 403)
        res_data = response.json()
        self.assertIn("banned by admin", res_data["error"].lower())

    def test_admin_self_ban_prevention(self):
        # Admin tries to ban another recruiter that has admin email
        fake_admin_company = Company.objects.create(
            name="Admin Recruiter",
            email="admin@between.com",
            password_hash=pwd_context.hash("validpassword")
        )

        url = reverse("admin-users-ban")
        data = {
            "type": "recruiter",
            "id": str(fake_admin_company.id),
            "action": "ban"
        }
        response = self.client.post(
            url,
            data=json.dumps(data),
            content_type="application/json",
            **self.auth_headers
        )
        self.assertEqual(response.status_code, 400)
        res_data = response.json()
        self.assertIn("cannot ban themselves", res_data["error"].lower())

    def test_ban_logs_generated(self):
        url = reverse("admin-users-ban")
        data = {
            "type": "seeker",
            "id": str(self.seeker.id),
            "action": "ban"
        }
        response = self.client.post(
            url,
            data=json.dumps(data),
            content_type="application/json",
            **self.auth_headers
        )
        self.assertEqual(response.status_code, 200)

        # Verify log entry exists
        log_entry = AdminBanLog.objects.filter(target_id=self.seeker.id).first()
        self.assertIsNotNone(log_entry)
        self.assertEqual(log_entry.action, "ban")
        self.assertEqual(log_entry.admin_email, "admin@between.com")

    def test_resolve_support_ticket(self):
        ticket = SupportTicket.objects.create(
            name="Daksh Bhavsar",
            email="daksh@example.com",
            subject="Bug Report",
            message="Something failed"
        )
        url = reverse("admin-tickets-resolve")
        data = {
            "id": str(ticket.id)
        }
        response = self.client.post(
            url,
            data=json.dumps(data),
            content_type="application/json",
            **self.auth_headers
        )
        self.assertEqual(response.status_code, 200)
        ticket.refresh_from_db()
        self.assertEqual(ticket.status, "resolved")
        self.assertIsNotNone(ticket.resolved_at)
        self.assertEqual(ticket.resolved_by, "admin@between.com")

    def test_admin_login_rate_limiting(self):
        url = reverse("admin-auth-login")
        data = {
            "email": "attacker@example.com",
            "password": "WrongPassword"
        }

        # Clear Redis rate limits for isolation
        try:
            redis_client.delete("rl:admin_login:127.0.0.1:attacker@example.com")
        except Exception:
            pass

        # Make 5 failed attempts
        for _ in range(5):
            response = self.client.post(
                url,
                data=json.dumps(data),
                content_type="application/json"
            )
            self.assertEqual(response.status_code, 401)

        # 6th attempt should trigger 429 Too Many Requests
        response = self.client.post(
            url,
            data=json.dumps(data),
            content_type="application/json"
        )
        self.assertEqual(response.status_code, 429)
        res_data = response.json()
        self.assertFalse(res_data["success"])
        self.assertIn("too many requests", res_data["error"].lower())
        self.assertIn("retry_after_seconds", res_data["data"])
