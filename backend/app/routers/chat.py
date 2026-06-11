import uuid as uuid_mod
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db, SessionLocal
from app.models.chat import ChatSession, ChatMessage
from app.schemas.chat import (
    ChatMessageCreate,
    ChatMessageResponse,
    ChatSessionCreate,
    ChatSessionResponse,
)
from app.services.rag import stream_rag_response

router = APIRouter(prefix="/chat", tags=["chat"])


# ── Session management ────────────────────────────────────────────────────────

def _get_or_create_session(db: Session, session_key: str, user_hint: Optional[str] = None) -> ChatSession:
    session = db.query(ChatSession).filter(ChatSession.session_key == session_key).first()
    if not session:
        session = ChatSession(
            id=uuid_mod.uuid4(),
            session_key=session_key,
            user_hint=user_hint,
        )
        db.add(session)
        db.commit()
        db.refresh(session)
    return session


@router.post("/sessions", response_model=ChatSessionResponse, status_code=201)
def create_session(body: ChatSessionCreate, db: Session = Depends(get_db)):
    key = body.session_key or str(uuid_mod.uuid4())
    session = _get_or_create_session(db, key, body.user_hint)
    count = db.query(ChatMessage).filter(ChatMessage.session_id == session.id).count()
    resp = ChatSessionResponse.model_validate(session)
    resp.message_count = count
    return resp


@router.get("/sessions/{session_key}", response_model=ChatSessionResponse)
def get_session(session_key: str, db: Session = Depends(get_db)):
    session = db.query(ChatSession).filter(ChatSession.session_key == session_key).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    count = db.query(ChatMessage).filter(ChatMessage.session_id == session.id).count()
    resp = ChatSessionResponse.model_validate(session)
    resp.message_count = count
    return resp


@router.delete("/sessions/{session_key}", status_code=204)
def delete_session(session_key: str, db: Session = Depends(get_db)):
    session = db.query(ChatSession).filter(ChatSession.session_key == session_key).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    db.delete(session)
    db.commit()


# ── Message history ───────────────────────────────────────────────────────────

@router.get("/sessions/{session_key}/messages", response_model=List[ChatMessageResponse])
def get_messages(
    session_key: str,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    session = db.query(ChatSession).filter(ChatSession.session_key == session_key).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session.id)
        .order_by(ChatMessage.created_at.asc())
        .limit(limit)
        .all()
    )
    return [ChatMessageResponse.model_validate(m) for m in messages]


# ── Streaming chat endpoint ───────────────────────────────────────────────────

@router.post("/sessions/{session_key}/messages")
async def send_message(
    session_key: str,
    body: ChatMessageCreate,
    jurisdiction_type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """
    Stream a RAG-augmented Claude response as Server-Sent Events.

    Event shape:
      data: {"type": "sources", "sources": {...}}   ← sent first
      data: {"type": "token",   "text": "..."}       ← one per chunk
      data: {"type": "done"}                         ← stream complete
      data: {"type": "error",   "message": "..."}    ← on failure
    """
    # Get or create session
    session = _get_or_create_session(db, session_key)

    # Save the user message now (before streaming) so history is complete
    user_msg = ChatMessage(
        id=uuid_mod.uuid4(),
        session_id=session.id,
        role="user",
        content=body.content,
    )
    db.add(user_msg)
    db.commit()

    # Fetch conversation history (excluding the message we just saved)
    history = (
        db.query(ChatMessage)
        .filter(
            ChatMessage.session_id == session.id,
            ChatMessage.id != user_msg.id,
        )
        .order_by(ChatMessage.created_at.asc())
        .all()
    )

    # db session will be closed by FastAPI after this function returns —
    # the streaming generator creates its own session via db_factory.
    return StreamingResponse(
        stream_rag_response(
            session_id=session.id,
            user_query=body.content,
            history=history,
            db_factory=SessionLocal,
            jurisdiction_type=jurisdiction_type,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )
