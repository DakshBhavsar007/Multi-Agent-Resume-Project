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

            html_snippet = f"""<div id="between-panel"></div>
<script src="https://api.between.indevs.in/embed.js"></script>
<script>
Between.init({{
  token: "{token_value}",
  container: "#between-panel",
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
def serve_embed_js(request):
    """Serves the Between Javascript SDK loader snippet for web integration."""
    api_host = request.get_host()
    if "localhost" in api_host or "127.0.0.1" in api_host:
        frontend_url = "http://localhost:5173"
    else:
        frontend_url = "https://between.indevs.in"

    js_content = f"""(function() {{
  window.Between = {{
    init: function(config) {{
      if (!config.token) {{
        console.error('[Between Embed] Missing required token.');
        return;
      }}
      var container = config.container || '#between-panel';
      var theme = config.theme || 'light';
      var el = typeof container === 'string' ? document.querySelector(container) : container;
      if (!el) {{
        console.error('[Between Embed] Container element not found:', container);
        return;
      }}
      var baseUrl = '{frontend_url}/developer/portal/embed/widget';
      var iframe = document.createElement('iframe');
      iframe.src = baseUrl + '?token=' + encodeURIComponent(config.token) + '&theme=' + encodeURIComponent(theme);
      iframe.style.width = config.width || '100%';
      iframe.style.height = config.height || '550px';
      iframe.style.border = 'none';
      iframe.style.borderRadius = '16px';
      iframe.style.boxShadow = '0 10px 30px -5px rgba(0,0,0,0.12)';
      el.innerHTML = '';
      el.appendChild(iframe);
      console.log('[Between Embed] Widget initialized successfully.');
    }}
  }};
}})();"""
    from django.http import HttpResponse
    return HttpResponse(js_content, content_type="application/javascript")

@csrf_exempt
def validate_embed_token(request):
    if request.method != "GET":
        return JsonResponse(error_response("Method not allowed"), status=405)
    try:
        embed_token = request.headers.get("X-Embed-Token") or request.GET.get("token")
        origin = request.headers.get("Origin", "") or request.headers.get("Referer", "")

        if not embed_token:
            return JsonResponse(error_response("Missing X-Embed-Token header or token parameter"), status=400)

        token = EmbedToken.objects.filter(token=embed_token, is_active=True).first()
        if not token:
            return JsonResponse(error_response("Invalid or revoked embed token"), status=401)

        # Extract domain from origin/referer
        if origin:
            parsed = urlparse(origin)
            request_domain = (parsed.hostname or "").lower()
        else:
            request_domain = ""

        # Validate domain if domain restriction is set (allow *, localhost, 127.0.0.1, or exact host match)
        allowed = (token.allowed_domain or "").lower()
        if allowed and allowed != "*":
            if request_domain and request_domain not in ["localhost", "127.0.0.1"] and allowed not in request_domain:
                return JsonResponse(error_response("Domain not authorized for this embed token"), status=403)

        # Generate short-lived JWT (1 hour) for widget iframe
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
            "allowed_domain": token.allowed_domain,
            "expires_in": 3600
        }))
    except Exception as e:
        return JsonResponse(error_response(f"Server error: {str(e)}"), status=500)
