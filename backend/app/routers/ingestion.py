"""
Admin routes for ingestion run history, source listing, and manual triggers.
All endpoints require the X-Admin-Token header.
"""
import json
import logging
import os
import sys
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.analytics import IngestionRun
from app.routers.admin import require_admin

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin/ingestion", tags=["ingestion"])

# Ingestion package sits one level above the backend directory
_INGESTION_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ""))
_STATE_FILE = Path(_INGESTION_ROOT) / "ingestion" / "state" / "source_state.json"


def _ensure_ingestion_on_path() -> None:
    if _INGESTION_ROOT not in sys.path:
        sys.path.insert(0, _INGESTION_ROOT)


def _load_source_state() -> dict:
    if _STATE_FILE.exists():
        try:
            return json.loads(_STATE_FILE.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {}


@router.get("/runs", dependencies=[Depends(require_admin)])
def list_runs(
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """Paginated list of ingestion runs, newest first."""
    total = db.query(IngestionRun).count()
    runs = (
        db.query(IngestionRun)
        .order_by(desc(IngestionRun.started_at))
        .offset(offset)
        .limit(limit)
        .all()
    )
    return {
        "total": total,
        "runs": [
            {
                "id": str(r.id),
                "source_name": r.source_name,
                "source_url": r.source_url,
                "status": r.status,
                "policies_found": r.policies_found,
                "policies_updated": r.policies_updated,
                "error_message": r.error_message,
                "started_at": r.started_at.isoformat() if r.started_at else None,
                "finished_at": r.finished_at.isoformat() if r.finished_at else None,
                "duration_s": (
                    round((r.finished_at - r.started_at).total_seconds(), 1)
                    if r.finished_at and r.started_at
                    else None
                ),
            }
            for r in runs
        ],
    }


@router.get("/sources", dependencies=[Depends(require_admin)])
def list_sources():
    """List all configured monitor sources with their last-check state."""
    _ensure_ingestion_on_path()
    from ingestion.sources import SOURCES  # noqa: PLC0415

    state = _load_source_state()
    return {
        "count": len(SOURCES),
        "sources": [
            {
                "name": s["name"],
                "url": s["url"],
                "jurisdiction": s["jurisdiction"],
                "jurisdiction_type": s["jurisdiction_type"],
                "tags": s["tags"],
                "check_interval_hours": s["check_interval_hours"],
                "last_checked": state.get(s["name"], {}).get("last_checked"),
                "content_hash": state.get(s["name"], {}).get("content_hash"),
            }
            for s in SOURCES
        ],
    }


@router.post("/trigger/{source_name}", dependencies=[Depends(require_admin)])
def trigger_source(
    source_name: str,
    background_tasks: BackgroundTasks,
):
    """
    Manually trigger an ingestion run for the named source.
    Runs in the background; check /runs for results.
    """
    _ensure_ingestion_on_path()
    from ingestion.runner import run_source  # noqa: PLC0415
    from ingestion.sources import SOURCES  # noqa: PLC0415

    source = next((s for s in SOURCES if s["name"] == source_name), None)
    if source is None:
        # Try case-insensitive partial match
        source = next(
            (s for s in SOURCES if source_name.lower() in s["name"].lower()), None
        )
    if source is None:
        raise HTTPException(
            status_code=404,
            detail={
                "error": f"Source '{source_name}' not found",
                "available": [s["name"] for s in SOURCES],
            },
        )

    background_tasks.add_task(run_source, source)
    logger.info("Manual trigger queued for: %s", source["name"])
    return {"status": "triggered", "source": source["name"], "url": source["url"]}


@router.post("/trigger-all", dependencies=[Depends(require_admin)])
def trigger_all(background_tasks: BackgroundTasks):
    """Trigger an ingestion run for every configured source."""
    _ensure_ingestion_on_path()
    from ingestion.runner import run_source  # noqa: PLC0415
    from ingestion.sources import SOURCES  # noqa: PLC0415

    for source in SOURCES:
        background_tasks.add_task(run_source, source)

    logger.info("Manual trigger queued for all %d sources", len(SOURCES))
    return {"status": "triggered", "count": len(SOURCES), "sources": [s["name"] for s in SOURCES]}
