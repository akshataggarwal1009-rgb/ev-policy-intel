"""
Lightweight analytics logger — writes UsageEvent rows.
Called synchronously but uses try/except so failures never break API responses.
"""
from typing import Optional
from sqlalchemy.orm import Session
from app.models.analytics import UsageEvent


def log_event(
    db: Session,
    event_type: str,
    *,
    session_key: Optional[str] = None,
    query: Optional[str] = None,
    endpoint: Optional[str] = None,
    jurisdiction_filter: Optional[str] = None,
    prompt_tokens: Optional[int] = None,
    completion_tokens: Optional[int] = None,
    latency_ms: Optional[int] = None,
    metadata: Optional[dict] = None,
) -> None:
    try:
        event = UsageEvent(
            event_type=event_type,
            session_key=session_key,
            query=query,
            endpoint=endpoint,
            jurisdiction_filter=jurisdiction_filter,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            latency_ms=latency_ms,
            event_metadata=metadata or {},
        )
        db.add(event)
        db.commit()
    except Exception:
        db.rollback()
