"""
Ingestion monitor service entry point.

Long-running service:
    python ingestion/main.py

One-shot run (all sources):
    python ingestion/main.py --once

One-shot run (specific source):
    python ingestion/main.py --once --source "FAME II — MHI Portal"

List available sources:
    python ingestion/main.py --list
"""
import argparse
import logging
import os
import signal
import sys
import time

# Allow importing backend modules when running standalone
_backend_path = os.path.join(os.path.dirname(__file__), "..", "backend")
if _backend_path not in sys.path:
    sys.path.insert(0, os.path.abspath(_backend_path))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


def main() -> None:
    parser = argparse.ArgumentParser(description="EV Policy Ingestion Monitor")
    parser.add_argument("--once", action="store_true", help="Run all sources once and exit")
    parser.add_argument("--source", help="Run only the named source (use with --once)")
    parser.add_argument("--list", action="store_true", help="List configured sources and exit")
    parser.add_argument(
        "--no-run-on-start",
        action="store_true",
        help="In scheduler mode, wait for first interval before running (default: run immediately)",
    )
    args = parser.parse_args()

    from ingestion.sources import SOURCES

    if args.list:
        for s in SOURCES:
            print(f"  {s['name']}  ({s['jurisdiction']})  every {s['check_interval_hours']}h")
        return

    if args.once:
        from ingestion.runner import run_source

        sources = SOURCES
        if args.source:
            sources = [s for s in SOURCES if s["name"] == args.source]
            if not sources:
                logger.error(
                    "Unknown source '%s'. Available:\n%s",
                    args.source,
                    "\n".join(f"  {s['name']}" for s in SOURCES),
                )
                sys.exit(1)

        for source in sources:
            logger.info("Running: %s", source["name"])
            result = run_source(source)
            logger.info("Done: %s", result)
        return

    # ── Long-running scheduler mode ─────────────────────────────────────────
    from ingestion.scheduler import start_scheduler, stop_scheduler

    scheduler = start_scheduler(run_on_start=not args.no_run_on_start)

    def _shutdown(signum, frame):  # noqa: ARG001
        logger.info("Shutting down...")
        stop_scheduler()
        sys.exit(0)

    signal.signal(signal.SIGINT, _shutdown)
    signal.signal(signal.SIGTERM, _shutdown)

    logger.info("Ingestion monitor running. Press Ctrl+C to stop.")
    while True:
        time.sleep(30)


if __name__ == "__main__":
    main()
