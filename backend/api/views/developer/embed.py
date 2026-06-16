import json
import secrets
from urllib.parse import urlparse
from datetime import datetime, timedelta
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from jose import jwt

from api.models import DeveloperAccount, EmbedToken
from api.decorators import require_developer_jwt, JWT_SECRET, JWT_ALGORITHM
from models.schemas import success_response, error_response

@csrf_exempt
@require_developer_jwt
def tokens_root(request):
    """Handles GET /tokens (list) and POST /tokens (create)"""
    dev = request.developer
    
    if dev.tier not in ["business", "enterprise"]:
        return JsonResponse(error_response("Embed widget requires Business plan or above. Please upgrade."), status=403)

    if request.method == "GET":
        try:
            tokens = EmbedToken.objects.filter(developer_id=dev.id, is_active=True)
            result = [
                {
                    "id": str(t.id),
                    "token": t.token,
                    "allowed_domain": t.allowed_domain,
                    "permissions": t.permissions,
                    "is_active": t.is_active,
                    "created_at": t.created_at.isoformat() if t.created_at else None
                }
                for t in tokens
            ]
            return JsonResponse(success_response(result))
        except Exception as e:
            return JsonResponse(error_response(f"Server error: {str(e)}"), status=500)

    elif request.method == "POST":
        try:
            data = json.loads(request.body)
            allowed_domain = data.get("allowed_domain")
            if not allowed_domain:
                return JsonResponse(error_response("allowed_domain is required"), status=400)

            permissions = data.get("permissions", ["view_candidates", "chat"])

            domain = allowed_domain.strip()
            domain = domain.replace("http://", "").replace("https://", "")
            domain = domain.rstrip("/")

            token_value = "vish_embed_" + secrets.token_urlsafe(32)

            embed_token = EmbedToken.objects.create(
                developer=dev,
                token=token_value,
                allowed_domain=domain,
                permissions=permissions,
                is_active=True
            )

            html_snippet = f"""<div id="vishleshan-panel"></div>
<script src="https://cdn.vishleshan.ai/embed.js"></script>
<script>
Vishleshan.init({{
  token: "{token_value}",
  container: "#vishleshan-panel",
  theme: "light"
}});
</script>"""

            return JsonResponse(success_response({
                "id": str(embed_token.id),
                "token": token_value,
                "allowed_domain": domain,
                "permissions": permissions,
                "html_snippet": html_snippet
            }))
        except Exception as e:
            return JsonResponse(error_response(f"Server error: {str(e)}"), status=500)
    else:
        return JsonResponse(error_response("Method not allowed"), status=405)

@csrf_exempt
@require_developer_jwt
def revoke_embed_token(request, token_id):
    if request.method != "DELETE":
        return JsonResponse(error_response("Method not allowed"), status=405)
    dev = request.developer
    try:
        token = EmbedToken.objects.filter(id=token_id, developer_id=dev.id).first()
        if not token:
            return JsonResponse(error_response("Embed token not found"), status=404)

        token.is_active = False
        token.save(update_fields=['is_active'])

        return JsonResponse(success_response({"message": "Embed token revoked"}))
    except Exception as e:
        return JsonResponse(error_response(f"Server error: {str(e)}"), status=500)

@csrf_exempt
def validate_embed_token(request):
    if request.method != "GET":
        return JsonResponse(error_response("Method not allowed"), status=405)
    try:
        embed_token = request.headers.get("X-Embed-Token")
        origin = request.headers.get("Origin", "")

        if not embed_token:
            return JsonResponse(error_response("Missing X-Embed-Token header"), status=400)

        token = EmbedToken.objects.filter(token=embed_token, is_active=True).first()
        if not token:
            return JsonResponse(error_response("Invalid or revoked embed token"), status=401)

        # Extract domain from origin
        if origin:
            parsed = urlparse(origin)
            request_domain = parsed.hostname or ""
        else:
            request_domain = ""

        # Validate domain
        if token.allowed_domain and token.allowed_domain not in request_domain:
            return JsonResponse(error_response("Domain not authorized for this embed token"), status=403)

        # Generate short-lived JWT (1 hour)
        payload = {
            "developer_id": str(token.developer_id),
            "embed_token_id": str(token.id),
            "permissions": token.permissions,
            "exp": datetime.utcnow() + timedelta(hours=1)
        }
        short_jwt = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

        return JsonResponse(success_response({
            "valid": True,
            "jwt": short_jwt,
            "permissions": token.permissions,
            "expires_in": 3600
        }))
    except Exception as e:
        return JsonResponse(error_response(f"Server error: {str(e)}"), status=500)
