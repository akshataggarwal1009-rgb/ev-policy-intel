"""
DB upsert — create or update Policy rows and regenerate embeddings for changed records.
"""
import logging
import time
from datetime import date
from typing import Optional

from sqlalchemy.orm import Session

from app.models.policy import (
    Incentive, IncentiveCategory, JurisdictionType, Policy, PolicyStatus, VehicleSegment,
)
from app.services.embeddings import (
    BATCH_SIZE, embed_texts, incentive_text, is_available, policy_text,
)

logger = logging.getLogger(__name__)


def _parse_date(val: Optional[str]) -> Optional[date]:
    if not val:
        return None
    try:
        return date.fromisoformat(val)
    except (ValueError, TypeError):
        return None


def _jtype(val: str) -> JurisdictionType:
    try:
        return JurisdictionType(val)
    except ValueError:
        return JurisdictionType.indian_state


def _status(val: str) -> PolicyStatus:
    try:
        return PolicyStatus(val)
    except ValueError:
        return PolicyStatus.active


def _category(val: str) -> IncentiveCategory:
    try:
        return IncentiveCategory(val)
    except ValueError:
        return IncentiveCategory.other


_SEGMENT_MAP = {
    "2w": VehicleSegment.two_wheeler,
    "3w": VehicleSegment.three_wheeler,
    "4w": VehicleSegment.four_wheeler,
    "commercial": VehicleSegment.commercial,
    "bus": VehicleSegment.bus,
    "all": VehicleSegment.all_segments,
}


def _segment(val: str) -> VehicleSegment:
    return _SEGMENT_MAP.get(val, VehicleSegment.all_segments)


def upsert_policies(db: Session, policies: list[dict]) -> tuple[int, int]:
    """
    Upsert a list of extracted policy dicts into the DB.
    Returns (created_count, updated_count).
    Clears embeddings on updated records so they get regenerated.
    """
    created, updated = 0, 0

    for p_data in policies:
        incentives_data = p_data.pop("incentives", [])

        existing = _find_existing(db, p_data)

        if existing:
            _apply_update(existing, p_data)
            policy_obj = existing
            updated += 1
            logger.info("Updated policy: %s / %s", p_data["jurisdiction"], p_data["title"])
        else:
            policy_obj = _create_policy(p_data)
            db.add(policy_obj)
            created += 1
            logger.info("Created policy: %s / %s", p_data["jurisdiction"], p_data["title"])

        db.flush()

        if incentives_data:
            db.query(Incentive).filter(Incentive.policy_id == policy_obj.id).delete()
            for inc_data in incentives_data:
                db.add(Incentive(
                    policy_id=policy_obj.id,
                    category=_category(inc_data.get("category", "other")),
                    title=inc_data.get("title", ""),
                    description=inc_data.get("description", ""),
                    value_text=inc_data.get("value_text"),
                    value_amount=inc_data.get("value_amount"),
                    value_unit=inc_data.get("value_unit"),
                    vehicle_segment=_segment(inc_data.get("vehicle_segment", "all")),
                    beneficiary=inc_data.get("beneficiary"),
                ))

    db.commit()

    if is_available():
        _regen_embeddings(db)

    return created, updated


def _find_existing(db: Session, p_data: dict) -> Optional[Policy]:
    source_url = p_data.get("source_url")
    jurisdiction = p_data["jurisdiction"]

    if source_url:
        match = (
            db.query(Policy)
            .filter(Policy.jurisdiction == jurisdiction, Policy.source_url == source_url)
            .first()
        )
        if match:
            return match

    return (
        db.query(Policy)
        .filter(Policy.jurisdiction == jurisdiction, Policy.title == p_data["title"])
        .first()
    )


def _apply_update(policy: Policy, data: dict) -> None:
    policy.title = data.get("title", policy.title)
    policy.summary = data.get("summary", policy.summary)
    policy.status = _status(data.get("status", policy.status.value))
    policy.confidence = data.get("confidence", policy.confidence)
    policy.effective_date = _parse_date(data.get("effective_date")) or policy.effective_date
    policy.expiry_date = _parse_date(data.get("expiry_date")) or policy.expiry_date
    policy.tags = data.get("tags", policy.tags)
    policy.embedding = None  # force regen


def _create_policy(data: dict) -> Policy:
    return Policy(
        jurisdiction=data["jurisdiction"],
        jurisdiction_type=_jtype(data.get("jurisdiction_type", "indian_state")),
        title=data["title"],
        summary=data.get("summary", ""),
        status=_status(data.get("status", "active")),
        confidence=data.get("confidence", 0.7),
        source_url=data.get("source_url"),
        effective_date=_parse_date(data.get("effective_date")),
        expiry_date=_parse_date(data.get("expiry_date")),
        tags=data.get("tags", []),
    )


def _regen_embeddings(db: Session) -> None:
    policies = db.query(Policy).filter(Policy.embedding.is_(None)).all()
    for i in range(0, len(policies), BATCH_SIZE):
        batch = policies[i: i + BATCH_SIZE]
        try:
            texts = [policy_text(p.jurisdiction, p.title, p.summary, p.tags or []) for p in batch]
            vectors = embed_texts(texts)
            for p, vec in zip(batch, vectors):
                p.embedding = vec
            db.commit()
            logger.info("Embedded %d policies", len(batch))
        except Exception as exc:
            db.rollback()
            logger.warning("Embedding batch failed: %s", exc)
        time.sleep(0.3)

    policy_map = {str(p.id): p for p in db.query(Policy).all()}
    incentives = db.query(Incentive).filter(Incentive.embedding.is_(None)).all()
    for i in range(0, len(incentives), BATCH_SIZE):
        batch = incentives[i: i + BATCH_SIZE]
        try:
            texts = [
                incentive_text(
                    policy_map.get(str(inc.policy_id), Policy()).jurisdiction or "",
                    policy_map.get(str(inc.policy_id), Policy()).title or "",
                    inc.title,
                    inc.description,
                    inc.category.value,
                    inc.vehicle_segment.value,
                    inc.value_text,
                )
                for inc in batch
            ]
            vectors = embed_texts(texts)
            for inc, vec in zip(batch, vectors):
                inc.embedding = vec
            db.commit()
            logger.info("Embedded %d incentives", len(batch))
        except Exception as exc:
            db.rollback()
            logger.warning("Incentive embedding batch failed: %s", exc)
        time.sleep(0.3)
