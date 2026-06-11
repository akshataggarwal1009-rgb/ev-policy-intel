"""
APScheduler setup — one job per source at its configured interval.
"""
import logging
from datetime import datetime

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

from ingestion.runner import run_source
from ingestion.sources import SOURCES

logger = logging.getLogger(__name__)

_scheduler: BackgroundScheduler | None = None


def get_scheduler() -> BackgroundScheduler:
    global _scheduler
    if _scheduler is None:
        _scheduler = BackgroundScheduler(timezone="UTC")
    return _scheduler


def start_scheduler(run_on_start: bool = True) -> BackgroundScheduler:
    scheduler = get_scheduler()

    for source in SOURCES:
        scheduler.add_job(
            run_source,
            trigger=IntervalTrigger(hours=source["check_interval_hours"]),
            args=[source],
            id=f"ingest__{source['name']}",
            name=f"Monitor: {source['name']}",
            replace_existing=True,
            next_run_time=datetime.utcnow() if run_on_start else None,
        )
        logger.info(
            "Scheduled '%s' every %dh", source["name"], source["check_interval_hours"]
        )

    scheduler.start()
    logger.info("Ingestion scheduler started with %d sources", len(SOURCES))
    return scheduler


def stop_scheduler() -> None:
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("Ingestion scheduler stopped")
    _scheduler = None
