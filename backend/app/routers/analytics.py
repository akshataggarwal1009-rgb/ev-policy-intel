"""
Admin analytics endpoints — aggregated usage metrics from usage_events.
"""
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func, distinct
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.analytics import UsageEvent
from app.routers.admin import require_admin

router = APIRouter(prefix="/admin/analytics", tags=["analytics"])


def _days_ago(n: int) -> datetime:
    return datetime.utcnow() - timedelta(days=n)


@router.get("/summary", dependencies=[Depends(require_admin)])
def analytics_summary(db: Session = Depends(get_db)):
    ago7 = _days_ago(7)
    ago30 = _days_ago(30)

    # Total event counts
    events_7d = db.query(func.count(UsageEvent.id)).filter(UsageEvent.created_at >= ago7).scalar() or 0
    events_30d = db.query(func.count(UsageEvent.id)).filter(UsageEvent.created_at >= ago30).scalar() or 0

    # Chat-specific counts
    chat_7d = (
        db.query(func.count(UsageEvent.id))
        .filter(UsageEvent.event_type == "chat_message", UsageEvent.created_at >= ago7)
        .scalar() or 0
    )
    chat_30d = (
        db.query(func.count(UsageEvent.id))
        .filter(UsageEvent.event_type == "chat_message", UsageEvent.created_at >= ago30)
        .scalar() or 0
    )

    # Unique sessions (non-null session_key)
    sessions_7d = (
        db.query(func.count(distinct(UsageEvent.session_key)))
        .filter(UsageEvent.created_at >= ago7, UsageEvent.session_key.isnot(None))
        .scalar() or 0
    )
    sessions_30d = (
        db.query(func.count(distinct(UsageEvent.session_key)))
        .filter(UsageEvent.created_at >= ago30, UsageEvent.session_key.isnot(None))
        .scalar() or 0
    )

    # Token totals (chat only, all time)
    token_row = (
        db.query(
            func.sum(UsageEvent.prompt_tokens),
            func.sum(UsageEvent.completion_tokens),
        )
        .filter(UsageEvent.event_type == "chat_message")
        .one()
    )
    total_prompt_tokens = int(token_row[0] or 0)
    total_completion_tokens = int(token_row[1] or 0)

    # Avg chat latency (all time, only rows that have latency)
    avg_latency = (
        db.query(func.avg(UsageEvent.latency_ms))
        .filter(UsageEvent.event_type == "chat_message", UsageEvent.latency_ms.isnot(None))
        .scalar()
    )

    # Event type breakdown — last 30 days
    breakdown_rows = (
        db.query(UsageEvent.event_type, func.count(UsageEvent.id).label("n"))
        .filter(UsageEvent.created_at >= ago30)
        .group_by(UsageEvent.event_type)
        .order_by(func.count(UsageEvent.id).desc())
        .all()
    )
    event_breakdown = {r.event_type: r.n for r in breakdown_rows}

    # Top chat queries — last 30 days
    query_rows = (
        db.query(UsageEvent.query, func.count(UsageEvent.id).label("n"))
        .filter(
            UsageEvent.event_type == "chat_message",
            UsageEvent.query.isnot(None),
            UsageEvent.created_at >= ago30,
        )
        .group_by(UsageEvent.query)
        .order_by(func.count(UsageEvent.id).desc())
        .limit(10)
        .all()
    )
    top_queries = [{"query": r.query, "count": r.n} for r in query_rows]

    # Top jurisdiction filters — last 30 days
    jur_rows = (
        db.query(UsageEvent.jurisdiction_filter, func.count(UsageEvent.id).label("n"))
        .filter(
            UsageEvent.jurisdiction_filter.isnot(None),
            UsageEvent.created_at >= ago30,
        )
        .group_by(UsageEvent.jurisdiction_filter)
        .order_by(func.count(UsageEvent.id).desc())
        .limit(10)
        .all()
    )
    top_jurisdictions = [{"jurisdiction": r.jurisdiction_filter, "count": r.n} for r in jur_rows]

    # Daily event counts — last 30 days (using SQLite-compatible approach)
    daily_rows = (
        db.query(
            func.date(UsageEvent.created_at).label("day"),
            func.count(UsageEvent.id).label("n"),
        )
        .filter(UsageEvent.created_at >= ago30)
        .group_by(func.date(UsageEvent.created_at))
        .order_by(func.date(UsageEvent.created_at).asc())
        .all()
    )
    # Fill in zeros for days with no events
    daily_map = {str(r.day): r.n for r in daily_rows}
    daily_events = []
    for i in range(30, -1, -1):
        d = (datetime.utcnow() - timedelta(days=i)).strftime("%Y-%m-%d")
        daily_events.append({"date": d, "count": daily_map.get(d, 0)})

    return {
        "events_7d": events_7d,
        "events_30d": events_30d,
        "chat_7d": chat_7d,
        "chat_30d": chat_30d,
        "unique_sessions_7d": sessions_7d,
        "unique_sessions_30d": sessions_30d,
        "total_prompt_tokens": total_prompt_tokens,
        "total_completion_tokens": total_completion_tokens,
        "avg_chat_latency_ms": round(avg_latency, 0) if avg_latency else None,
        "event_breakdown_30d": event_breakdown,
        "top_queries_30d": top_queries,
        "top_jurisdictions_30d": top_jurisdictions,
        "daily_events_30d": daily_events,
    }
