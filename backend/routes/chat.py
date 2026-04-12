from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from typing import Optional, List, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from models.database import get_db, Company, Session, ChatHistory
from models.schemas import success_response, error_response
from dependencies import verify_api_key, check_rate_limit
from agents.chatbot_agent import RecruiterChatbotAgent

router = APIRouter()


class ChatRequest(BaseModel):
    message: str
    history: Optional[List[Dict[str, str]]] = []


@router.post("/{session_id}/chat")
async def chat(
    session_id: str,
    req: ChatRequest,
    company: Company = Depends(verify_api_key),
    db: AsyncSession = Depends(get_db),
    _rl=Depends(check_rate_limit("chat"))
):
    # Verify session ownership
    res = await db.execute(select(Session).where(Session.id == session_id))
    session = res.scalar_one_or_none()
    if not session:
        return error_response("Session not found")
    if str(session.company_id) != str(company.id):
        return error_response("Access denied")

    agent = RecruiterChatbotAgent()
    result = await agent.chat(req.message, session_id, req.history or [], db)

    return success_response(result)


@router.get("/{session_id}/chat/history")
async def get_chat_history(
    session_id: str,
    limit: int = Query(50, ge=1, le=200),
    company: Company = Depends(verify_api_key),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(ChatHistory)
        .where(ChatHistory.session_id == session_id)
        .order_by(ChatHistory.created_at.asc())
        .limit(limit)
    )
    messages = res.scalars().all()

    return success_response([
        {
            "id": str(m.id),
            "role": m.role,
            "content": m.content,
            "referenced_candidate_ids": m.referenced_candidate_ids,
            "created_at": m.created_at.isoformat() if m.created_at else None
        }
        for m in messages
    ])


@router.delete("/{session_id}/chat/history")
async def delete_chat_history(
    session_id: str,
    company: Company = Depends(verify_api_key),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(ChatHistory).where(ChatHistory.session_id == session_id)
    )
    messages = res.scalars().all()
    for m in messages:
        await db.delete(m)

    await db.commit()

    return success_response({"deleted": True})
