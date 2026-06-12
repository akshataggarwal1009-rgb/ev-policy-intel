"""
Admin-only routes — protected by ADMIN_TOKEN header.
Used for triggering embedding runs and viewing system status.
"""
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.config import settings
from app.models.policy import Policy, Incentive

router = APIRouter(prefix="/admin", tags=["admin"])


def require_admin(x_admin_token: str = Header(...)):
    if x_admin_token != settings.ADMIN_TOKEN:
        raise HTTPException(status_code=403, detail="Invalid admin token")


@router.get("/status", dependencies=[Depends(require_admin)])
def admin_status(db: Session = Depends(get_db)):
    policy_total = db.query(func.count(Policy.id)).scalar()
    policy_embedded = db.query(func.count(Policy.id)).filter(Policy.embedding.isnot(None)).scalar()
    incentive_total = db.query(func.count(Incentive.id)).scalar()
    incentive_embedded = db.query(func.count(Incentive.id)).filter(Incentive.embedding.isnot(None)).scalar()

    from app.services.embeddings import is_available
    return {
        "embedding_api_available": is_available(),
        "policies": {"total": policy_total, "embedded": policy_embedded, "missing": policy_total - policy_embedded},
        "incentives": {"total": incentive_total, "embedded": incentive_embedded, "missing": incentive_total - incentive_embedded},
    }


@router.post("/embed", dependencies=[Depends(require_admin)])
def trigger_embed(
    force: bool = False,
    db: Session = Depends(get_db),
):
    """Trigger embedding generation for records missing embeddings (or all if force=True)."""
    from app.services.embeddings import embed_texts, policy_text, incentive_text, is_available, BATCH_SIZE, RATE_LIMIT_SLEEP
    import time

    if not is_available():
        raise HTTPException(status_code=503, detail="VOYAGE_API_KEY not configured")

    results = {"policies_embedded": 0, "incentives_embedded": 0, "errors": []}

    # Policies
    q = db.query(Policy)
    if not force:
        q = q.filter(Policy.embedding.is_(None))
    policies = q.all()

    for i in range(0, len(policies), BATCH_SIZE):
        batch = policies[i: i + BATCH_SIZE]
        try:
            texts = [policy_text(p.jurisdiction, p.title, p.summary, p.tags or []) for p in batch]
            vectors = embed_texts(texts)
            for p, vec in zip(batch, vectors):
                p.embedding = vec
            db.commit()
            results["policies_embedded"] += len(batch)
        except Exception as e:
            db.rollback()
            results["errors"].append(str(e))
        time.sleep(RATE_LIMIT_SLEEP)

    # Incentives
    policy_map = {str(p.id): p for p in db.query(Policy).all()}
    q2 = db.query(Incentive)
    if not force:
        q2 = q2.filter(Incentive.embedding.is_(None))
    incentives = q2.all()

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
            results["incentives_embedded"] += len(batch)
        except Exception as e:
            db.rollback()
            results["errors"].append(str(e))
        time.sleep(RATE_LIMIT_SLEEP)

    return results
