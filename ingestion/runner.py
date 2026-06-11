"""
Core ingestion runner — fetch → extract → upsert → notify for one source.
Can be called directly or scheduled via APScheduler.
"""
import logging
import os
import sys
from datetime import datetime

# Allow importing from backend when running ingestion standalone
_backend_path = os.path.join(os.path.dirname(__file__), "..", "backend")
if _backend_path not in sys.path:
    sys.path.insert(0, os.path.abspath(_backend_path))

from app.database import SessionLocal
from app.models.analytics import IngestionRun
from ingestion.extractor import extract_policies
from ingestion.fetcher import fetch_and_check
from ingestion.notifier import notify
from ingestion.upsert import upsert_policies

logger = logging.getLogger(__name__)


def run_source(source: dict) -> dict:
    """
    Run the full ingestion pipeline for one source dict.
    Records the run in ingestion_runs and returns a summary dict.
    """
    db = SessionLocal()
    run = IngestionRun(
        source_name=source["name"],
        source_url=source["url"],
        status="running",
        started_at=datetime.utcnow(),
    )
    db.add(run)
    db.commit()

    summary = {
        "source": source["name"],
        "changed": False,
        "policies_found": 0,
        "policies_updated": 0,
        "error": None,
    }

    try:
        changed, content, _ = fetch_and_check(source["name"], source["url"])

        if not changed:
            run.status = "no_change"
            run.finished_at = datetime.utcnow()
            db.commit()
            logger.info("[%s] No changes detected", source["name"])
            return summary

        logger.info("[%s] Content changed — extracting policies", source["name"])
        summary["changed"] = True

        policies = extract_policies(
            html_content=content,
            source_name=source["name"],
            source_url=source["url"],
            jurisdiction=source["jurisdiction"],
            jurisdiction_type=source["jurisdiction_type"],
            tags=source["tags"],
        )
        logger.info("[%s] Extracted %d policies", source["name"], len(policies))

        if policies:
            created, updated = upsert_policies(db, policies)
            summary["policies_found"] = created
            summary["policies_updated"] = updated

            if created + updated > 0:
                notify(
                    source_name=source["name"],
                    jurisdiction=source["jurisdiction"],
                    policies_found=created,
                    policies_updated=updated,
                    notify_email=os.environ.get("NOTIFY_EMAIL"),
                    notify_webhook=os.environ.get("NOTIFY_WEBHOOK"),
                    sendgrid_api_key=os.environ.get("SENDGRID_API_KEY"),
                )

        run.status = "success"
        run.policies_found = summary["policies_found"]
        run.policies_updated = summary["policies_updated"]

    except Exception as exc:
        summary["error"] = str(exc)
        run.status = "error"
        run.error_message = str(exc)
        logger.exception("[%s] Ingestion failed", source["name"])

    finally:
        run.finished_at = datetime.utcnow()
        try:
            db.commit()
        except Exception:
            pass
        db.close()

    return summary
