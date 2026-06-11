"""
Embedding generation script — generates or refreshes OpenAI vector embeddings
for all policies and incentives in the database.

Usage:
    python embed.py                    # embed records missing embeddings
    python embed.py --force            # re-embed ALL records (overwrite existing)
    python embed.py --policies-only    # only embed policies
    python embed.py --incentives-only  # only embed incentives
    python embed.py --dry-run          # print counts without calling the API
"""

import argparse
import sys
import os
import time

sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.policy import Policy, Incentive
from app.services.embeddings import (
    embed_texts,
    policy_text,
    incentive_text,
    is_available,
    EMBEDDING_DIM,
    BATCH_SIZE,
)


def embed_policies(db: Session, force: bool = False, dry_run: bool = False) -> int:
    q = db.query(Policy)
    if not force:
        q = q.filter(Policy.embedding.is_(None))
    policies = q.all()

    if not policies:
        print("  Policies: nothing to embed.")
        return 0

    print(f"  Policies: {len(policies)} to embed (dim={EMBEDDING_DIM}, batch={BATCH_SIZE})")
    if dry_run:
        return len(policies)

    total = 0
    for i in range(0, len(policies), BATCH_SIZE):
        batch = policies[i: i + BATCH_SIZE]
        texts = [
            policy_text(
                p.jurisdiction,
                p.title,
                p.summary,
                p.tags or [],
            )
            for p in batch
        ]
        vectors = embed_texts(texts)
        for p, vec in zip(batch, vectors):
            p.embedding = vec
        db.commit()
        total += len(batch)
        print(f"    [{total}/{len(policies)}] policies embedded")

    return total


def embed_incentives(db: Session, force: bool = False, dry_run: bool = False) -> int:
    q = db.query(Incentive).join(Policy, Policy.id == Incentive.policy_id)
    if not force:
        q = q.filter(Incentive.embedding.is_(None))
    incentives = q.all()

    if not incentives:
        print("  Incentives: nothing to embed.")
        return 0

    print(f"  Incentives: {len(incentives)} to embed (dim={EMBEDDING_DIM}, batch={BATCH_SIZE})")
    if dry_run:
        return len(incentives)

    # Pre-load parent policy info to avoid N+1
    policy_map: dict[str, Policy] = {}
    for inc in incentives:
        pid = str(inc.policy_id)
        if pid not in policy_map:
            policy_map[pid] = db.query(Policy).filter(Policy.id == inc.policy_id).first()

    total = 0
    for i in range(0, len(incentives), BATCH_SIZE):
        batch = incentives[i: i + BATCH_SIZE]
        texts = []
        for inc in batch:
            parent = policy_map.get(str(inc.policy_id))
            texts.append(
                incentive_text(
                    policy_jurisdiction=parent.jurisdiction if parent else "",
                    policy_title=parent.title if parent else "",
                    title=inc.title,
                    description=inc.description,
                    category=inc.category.value,
                    vehicle_segment=inc.vehicle_segment.value,
                    value_text=inc.value_text,
                )
            )
        vectors = embed_texts(texts)
        for inc, vec in zip(batch, vectors):
            inc.embedding = vec
        db.commit()
        total += len(batch)
        print(f"    [{total}/{len(incentives)}] incentives embedded")

    return total


def build_vector_index(db: Session):
    """
    Create IVFFlat index for ANN search if not already present.
    Rule of thumb: lists = max(1, round(sqrt(n_rows))).
    Only beneficial above ~1,000 rows; skips if fewer.
    """
    policy_count = db.query(Policy).filter(Policy.embedding.isnot(None)).count()
    incentive_count = db.query(Incentive).filter(Incentive.embedding.isnot(None)).count()

    for table, count in [("policies", policy_count), ("incentives", incentive_count)]:
        if count < 100:
            print(f"  {table}: {count} embeddings — skipping IVFFlat index (too few rows, exact search is faster)")
            continue

        import math
        lists = max(1, round(math.sqrt(count)))
        idx_name = f"idx_{table}_embedding_ivfflat"
        from sqlalchemy import text as sa_text
        db.execute(sa_text(f"""
            CREATE INDEX IF NOT EXISTS {idx_name}
            ON {table} USING ivfflat (embedding vector_cosine_ops)
            WITH (lists = {lists})
        """))
        db.commit()
        print(f"  {table}: IVFFlat index created (lists={lists})")


def main():
    parser = argparse.ArgumentParser(description="Generate embeddings for EV Policy Intel DB")
    parser.add_argument("--force", action="store_true", help="Re-embed all records even if already embedded")
    parser.add_argument("--policies-only", action="store_true")
    parser.add_argument("--incentives-only", action="store_true")
    parser.add_argument("--no-index", action="store_true", help="Skip IVFFlat index creation")
    parser.add_argument("--dry-run", action="store_true", help="Show counts without calling the API")
    args = parser.parse_args()

    print("=== EV Policy Intel — Embedding Generator ===\n")

    if not is_available() and not args.dry_run:
        print("[ERROR] OPENAI_API_KEY is not set.")
        print("  Set it in your .env file: OPENAI_API_KEY=sk-...")
        print("  Or run with --dry-run to see what would be embedded.")
        sys.exit(1)

    if args.dry_run:
        print("[DRY RUN] No API calls will be made.\n")

    db: Session = SessionLocal()
    start = time.perf_counter()
    try:
        total_policies = 0
        total_incentives = 0

        if not args.incentives_only:
            print("Embedding policies...")
            total_policies = embed_policies(db, force=args.force, dry_run=args.dry_run)

        if not args.policies_only:
            print("Embedding incentives...")
            total_incentives = embed_incentives(db, force=args.force, dry_run=args.dry_run)

        if not args.no_index and not args.dry_run:
            print("Checking vector indexes...")
            build_vector_index(db)

        elapsed = time.perf_counter() - start
        print(f"\nDone in {elapsed:.1f}s — {total_policies} policies, {total_incentives} incentives embedded.")

        if args.dry_run:
            print("(Dry run — no embeddings written.)")

    except Exception as exc:
        db.rollback()
        print(f"\n[ERROR] {exc}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
