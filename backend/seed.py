"""
Seed script — loads JSON data into the database and optionally generates embeddings.

Usage:
    python seed.py                  # seed data only (no embeddings)
    python seed.py --embeddings     # seed + generate embeddings (requires OPENAI_API_KEY)
    python seed.py --reset          # drop all rows first, then reseed
"""

import json
import sys
import os
import argparse
from datetime import date
from pathlib import Path

# Make app importable from backend root
sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy.orm import Session
from app.database import SessionLocal, engine, Base
from app.models import Policy, Incentive, PolicyStatus, JurisdictionType, IncentiveCategory, VehicleSegment

DATA_DIR = Path(__file__).parent.parent / "data"

CATEGORY_MAP = {
    "purchase_subsidy": IncentiveCategory.purchase_subsidy,
    "tax_exemption": IncentiveCategory.tax_exemption,
    "registration_waiver": IncentiveCategory.registration_waiver,
    "charging_infra": IncentiveCategory.charging_infra,
    "fleet_incentive": IncentiveCategory.fleet_incentive,
    "scrappage": IncentiveCategory.scrappage,
    "rd_grant": IncentiveCategory.rd_grant,
    "manufacturing_incentive": IncentiveCategory.manufacturing_incentive,
    "other": IncentiveCategory.other,
}

SEGMENT_MAP = {
    "2w": VehicleSegment.two_wheeler,
    "3w": VehicleSegment.three_wheeler,
    "4w": VehicleSegment.four_wheeler,
    "commercial": VehicleSegment.commercial,
    "bus": VehicleSegment.bus,
    "all": VehicleSegment.all_segments,
}

JURISDICTION_MAP = {
    "indian_state": JurisdictionType.indian_state,
    "indian_ut": JurisdictionType.indian_ut,
    "national_india": JurisdictionType.national_india,
    "global_market": JurisdictionType.global_market,
}

STATUS_MAP = {
    "active": PolicyStatus.active,
    "draft": PolicyStatus.draft,
    "expired": PolicyStatus.expired,
    "under_review": PolicyStatus.under_review,
}


def parse_date(s):
    if not s:
        return None
    return date.fromisoformat(s)


def load_json(filename: str) -> list:
    path = DATA_DIR / filename
    if not path.exists():
        print(f"  [WARN] {path} not found, skipping.")
        return []
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def seed_policies(db: Session, records: list, reset: bool = False) -> tuple[int, int]:
    inserted = 0
    updated = 0

    for rec in records:
        existing = (
            db.query(Policy)
            .filter(
                Policy.jurisdiction == rec["jurisdiction"],
                Policy.title == rec["title"],
            )
            .first()
        )

        if existing and not reset:
            # Update mutable fields
            existing.summary = rec["summary"]
            existing.status = STATUS_MAP.get(rec.get("status", "active"), PolicyStatus.active)
            existing.confidence = rec.get("confidence", 1.0)
            existing.source_url = rec.get("source_url")
            existing.tags = rec.get("tags", [])
            existing.effective_date = parse_date(rec.get("effective_date"))
            existing.expiry_date = parse_date(rec.get("expiry_date"))
            policy = existing
            updated += 1
        else:
            if existing and reset:
                db.delete(existing)
                db.flush()

            policy = Policy(
                jurisdiction=rec["jurisdiction"],
                jurisdiction_type=JURISDICTION_MAP[rec["jurisdiction_type"]],
                title=rec["title"],
                summary=rec["summary"],
                status=STATUS_MAP.get(rec.get("status", "active"), PolicyStatus.active),
                confidence=rec.get("confidence", 1.0),
                source_url=rec.get("source_url"),
                effective_date=parse_date(rec.get("effective_date")),
                expiry_date=parse_date(rec.get("expiry_date")),
                raw_text=rec.get("raw_text"),
                tags=rec.get("tags", []),
            )
            db.add(policy)
            db.flush()  # get the ID
            inserted += 1

        # Sync incentives: delete old ones and recreate
        db.query(Incentive).filter(Incentive.policy_id == policy.id).delete()
        for inc in rec.get("incentives", []):
            incentive = Incentive(
                policy_id=policy.id,
                category=CATEGORY_MAP.get(inc["category"], IncentiveCategory.other),
                title=inc["title"],
                description=inc["description"],
                value_text=inc.get("value_text"),
                value_amount=inc.get("value_amount"),
                value_unit=inc.get("value_unit"),
                vehicle_segment=SEGMENT_MAP.get(inc.get("vehicle_segment", "all"), VehicleSegment.all_segments),
                beneficiary=inc.get("beneficiary"),
                is_stackable=inc.get("is_stackable", False),
            )
            db.add(incentive)

    db.commit()
    return inserted, updated


def generate_embeddings(db: Session):
    """Delegate to the embed.py script logic via the shared embedding service."""
    from app.services.embeddings import is_available
    if not is_available():
        print("  [SKIP] OPENAI_API_KEY not set — run `python embed.py` separately once key is configured.")
        return
    # Import and run the embed script helpers directly
    import importlib.util, pathlib
    spec = importlib.util.spec_from_file_location("embed", pathlib.Path(__file__).parent / "embed.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    mod.embed_policies(db, force=False, dry_run=False)
    mod.embed_incentives(db, force=False, dry_run=False)


def main():
    parser = argparse.ArgumentParser(description="Seed EV Policy Intelligence database")
    parser.add_argument("--embeddings", action="store_true", help="Generate embeddings after seeding")
    parser.add_argument("--reset", action="store_true", help="Delete all existing records before seeding")
    args = parser.parse_args()

    print("=== EV Policy Intel — Seed Script ===\n")

    db: Session = SessionLocal()
    try:
        # Load data files
        files = {
            "national_india.json": "National India policies",
            "indian_states.json": "Indian state policies",
            "global_benchmarks.json": "Global benchmark policies",
        }

        total_inserted = 0
        total_updated = 0

        for filename, label in files.items():
            records = load_json(filename)
            if not records:
                continue
            print(f"Seeding {label} ({len(records)} records)...")
            ins, upd = seed_policies(db, records, reset=args.reset)
            total_inserted += ins
            total_updated += upd
            print(f"  ✓  {ins} inserted, {upd} updated\n")

        # Summary
        policy_count = db.query(Policy).count()
        incentive_count = db.query(Incentive).count()
        print(f"Database totals: {policy_count} policies, {incentive_count} incentives")
        print(f"Session:         {total_inserted} inserted, {total_updated} updated\n")

        if args.embeddings:
            print("Generating embeddings...")
            generate_embeddings(db)
            print("Embeddings complete.\n")

        print("=== Seed complete ===")

    except Exception as exc:
        db.rollback()
        print(f"\n[ERROR] Seed failed: {exc}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
