from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, and_
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.policy import Policy, Incentive, JurisdictionType, PolicyStatus
from app.schemas.policy import PolicySummary, PolicyDetail, PolicyStats, JurisdictionStats
from app.schemas.common import PaginatedResponse
from app.services.analytics import log_event

router = APIRouter(prefix="/policies", tags=["policies"])


def _apply_filters(query, jurisdiction, jurisdiction_type, status, tags, search):
    if jurisdiction:
        query = query.filter(Policy.jurisdiction.ilike(f"%{jurisdiction}%"))
    if jurisdiction_type:
        query = query.filter(Policy.jurisdiction_type == jurisdiction_type)
    if status:
        query = query.filter(Policy.status == status)
    if tags:
        tag_list = [t.strip() for t in tags.split(",") if t.strip()]
        for tag in tag_list:
            query = query.filter(Policy.tags.cast("text").ilike(f'%"{tag}"%'))
    if search:
        term = f"%{search}%"
        query = query.filter(
            or_(
                Policy.title.ilike(term),
                Policy.summary.ilike(term),
                Policy.jurisdiction.ilike(term),
            )
        )
    return query


@router.get("", response_model=PaginatedResponse[PolicySummary])
def list_policies(
    jurisdiction: Optional[str] = Query(None, description="Filter by jurisdiction name (partial match)"),
    jurisdiction_type: Optional[JurisdictionType] = Query(None),
    status: Optional[PolicyStatus] = Query(None),
    tags: Optional[str] = Query(None, description="Comma-separated tags to filter by"),
    search: Optional[str] = Query(None, description="Full-text search on title, summary, jurisdiction"),
    sort_by: str = Query("jurisdiction", enum=["jurisdiction", "title", "updated_at", "confidence"]),
    sort_dir: str = Query("asc", enum=["asc", "desc"]),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    log_event(db, "list_policies", endpoint="/policies", jurisdiction_filter=jurisdiction, query=search)

    q = db.query(Policy)
    q = _apply_filters(q, jurisdiction, jurisdiction_type, status, tags, search)

    total = q.count()

    sort_col = {
        "jurisdiction": Policy.jurisdiction,
        "title": Policy.title,
        "updated_at": Policy.updated_at,
        "confidence": Policy.confidence,
    }[sort_by]
    q = q.order_by(sort_col.desc() if sort_dir == "desc" else sort_col.asc())

    offset = (page - 1) * page_size
    policies = q.offset(offset).limit(page_size).all()

    # Attach incentive counts
    policy_ids = [p.id for p in policies]
    counts = {}
    if policy_ids:
        rows = (
            db.query(Incentive.policy_id, func.count(Incentive.id))
            .filter(Incentive.policy_id.in_(policy_ids))
            .group_by(Incentive.policy_id)
            .all()
        )
        counts = {r[0]: r[1] for r in rows}

    items = []
    for p in policies:
        d = PolicySummary.model_validate(p)
        d.incentive_count = counts.get(p.id, 0)
        items.append(d)

    return PaginatedResponse.build(items=items, total=total, page=page, page_size=page_size)


@router.get("/stats", response_model=PolicyStats)
def get_stats(db: Session = Depends(get_db)):
    total_policies = db.query(func.count(Policy.id)).scalar()
    active_policies = (
        db.query(func.count(Policy.id)).filter(Policy.status == PolicyStatus.active).scalar()
    )
    total_incentives = db.query(func.count(Incentive.id)).scalar()

    by_jtype = (
        db.query(Policy.jurisdiction_type, func.count(Policy.id))
        .group_by(Policy.jurisdiction_type)
        .all()
    )
    by_status = (
        db.query(Policy.status, func.count(Policy.id))
        .group_by(Policy.status)
        .all()
    )

    # Per-jurisdiction aggregates (three separate simple queries)
    policy_by_j = {
        r[0]: r[1]
        for r in db.query(Policy.jurisdiction, func.count(Policy.id))
        .group_by(Policy.jurisdiction)
        .all()
    }
    active_by_j = {
        r[0]: r[1]
        for r in db.query(Policy.jurisdiction, func.count(Policy.id))
        .filter(Policy.status == PolicyStatus.active)
        .group_by(Policy.jurisdiction)
        .all()
    }
    inc_by_j = {
        r[0]: r[1]
        for r in db.query(Policy.jurisdiction, func.count(Incentive.id))
        .join(Incentive, Incentive.policy_id == Policy.id)
        .group_by(Policy.jurisdiction)
        .all()
    }

    # Jurisdiction type lookup (one row per jurisdiction)
    jtype_by_j = {
        r[0]: r[1]
        for r in db.query(Policy.jurisdiction, Policy.jurisdiction_type)
        .distinct(Policy.jurisdiction)
        .all()
    }

    top_jurisdictions = [
        JurisdictionStats(
            jurisdiction=j,
            jurisdiction_type=jtype_by_j[j].value,
            policy_count=cnt,
            active_count=active_by_j.get(j, 0),
            incentive_count=inc_by_j.get(j, 0),
        )
        for j, cnt in sorted(policy_by_j.items(), key=lambda x: -x[1])[:10]
    ]

    return PolicyStats(
        total_policies=total_policies,
        active_policies=active_policies,
        total_incentives=total_incentives,
        by_jurisdiction_type={r[0].value: r[1] for r in by_jtype},
        by_status={r[0].value: r[1] for r in by_status},
        top_jurisdictions=top_jurisdictions,
    )


@router.get("/jurisdictions", response_model=List[str])
def list_jurisdictions(
    jurisdiction_type: Optional[JurisdictionType] = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(Policy.jurisdiction).distinct()
    if jurisdiction_type:
        q = q.filter(Policy.jurisdiction_type == jurisdiction_type)
    rows = q.order_by(Policy.jurisdiction).all()
    return [r[0] for r in rows]


@router.get("/{policy_id}", response_model=PolicyDetail)
def get_policy(policy_id: UUID, db: Session = Depends(get_db)):
    policy = (
        db.query(Policy)
        .options(joinedload(Policy.incentives))
        .filter(Policy.id == policy_id)
        .first()
    )
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
    log_event(db, "view_policy", endpoint=f"/policies/{policy_id}")
    return PolicyDetail.model_validate(policy)
