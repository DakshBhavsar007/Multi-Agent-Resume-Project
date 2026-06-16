import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from api.models import Session, ChatHistory
from api.decorators import require_api_key, check_rate_limit
from models.schemas import success_response, error_response
from agents.chatbot_agent import RecruiterChatbotAgent

@csrf_exempt
@require_api_key
@check_rate_limit("chat")
def chat(request, session_id):
    if request.method != "POST":
        return JsonResponse(error_response("Method not allowed"), status=405)
    try:
        session = Session.objects.filter(id=session_id).first()
        if not session:
            return JsonResponse(error_response("Session not found"), status=404)
            
        if str(session.company_id) != str(request.company.id):
            return JsonResponse(error_response("Access denied"), status=403)

        data = json.loads(request.body)
        message = data.get("message")
        if not message:
            return JsonResponse(error_response("message is required"), status=400)

        history = data.get("history", [])

        agent = RecruiterChatbotAgent()
        result = agent.chat(message, session_id, history)

        return JsonResponse(success_response(result))
    except Exception as e:
        return JsonResponse(error_response(f"Server error: {str(e)}"), status=500)

@csrf_exempt
@require_api_key
def get_chat_history(request, session_id):
    if request.method != "GET":
        return JsonResponse(error_response("Method not allowed"), status=405)
    try:
        limit = int(request.GET.get("limit", 50))
        messages = ChatHistory.objects.filter(session_id=session_id).order_by("created_at")[:limit]

        result = [
            {
                "id": str(m.id),
                "role": m.role,
                "content": m.content,
                "referenced_candidate_ids": m.referenced_candidate_ids,
                "created_at": m.created_at.isoformat() if m.created_at else None
            }
            for m in messages
        ]

        return JsonResponse(success_response(result))
    except Exception as e:
        return JsonResponse(error_response(f"Server error: {str(e)}"), status=500)

@csrf_exempt
@require_api_key
def delete_chat_history(request, session_id):
    if request.method != "DELETE":
        return JsonResponse(error_response("Method not allowed"), status=405)
    try:
        ChatHistory.objects.filter(session_id=session_id).delete()
        return JsonResponse(success_response({"deleted": True}))
    except Exception as e:
        return JsonResponse(error_response(f"Server error: {str(e)}"), status=500)
