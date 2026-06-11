from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.policy import Incentive, Policy, IncentiveCategory, VehicleSegment
from app.schemas.incentive import IncentiveResponse, IncentiveWithPolicy
from app.schemas.common import PaginatedResponse
from app.services.analytics import log_event

router = APIRouter(prefix="/incentives", tags=["incentives"])


@router.get("", response_model=PaginatedResponse[IncentiveWithPolicy])
def list_incentives(
    policy_id: Optional[UUID] = Query(None),
    jurisdiction: Optional[str] = Query(None, description="Filter by parent policy jurisdiction"),
    category: Optional[str] = Query(
        None,
        description="Comma-separated IncentiveCategory values, e.g. purchase_subsidy,tax_exemption",
    ),
    vehicle_segment: Optional[str] = Query(
        None, description="Comma-separated VehicleSegment values, e.g. 2w,4w"
    ),
    beneficiary: Optional[str] = Query(None, description="consumer | manufacturer | fleet"),
    is_stackable: Optional[bool] = Query(None),
    min_value: Optional[float] = Query(None, description="Minimum value_amount"),
    search: Optional[str] = Query(None, description="Search on title and description"),
    sort_by: str = Query("title", enum=["title", "category", "value_amount", "updated_at"]),
    sort_dir: str = Query("asc", enum=["asc", "desc"]),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    log_event(db, "list_incentives", endpoint="/incentives", query=search)

    q = db.query(Incentive).join(Policy, Policy.id == Incentive.policy_id)

    if policy_id:
        q = q.filter(Incentive.policy_id == policy_id)
    if jurisdiction:
        q = q.filter(Policy.jurisdiction.ilike(f"%{jurisdiction}%"))
    if category:
        cats = [c.strip() for c in category.split(",") if c.strip()]
        q = q.filter(Incentive.category.in_([IncentiveCategory(c) for c in cats]))
    if vehicle_segment:
        segs = [s.strip() for s in vehicle_segment.split(",") if s.strip()]
        q = q.filter(
            or_(
                Incentive.vehicle_segment.in_([VehicleSegment(s) for s in segs]),
                Incentive.vehicle_segment == VehicleSegment.all_segments,
            )
        )
    if beneficiary:
        q = q.filter(Incentive.beneficiary.ilike(f"%{beneficiary}%"))
    if is_stackable is not None:
        q = q.filter(Incentive.is_stackable == is_stackable)
    if min_value is not None:
        q = q.filter(Incentive.value_amount >= min_value)
    if search:
        term = f"%{search}%"
        q = q.filter(
            or_(Incentive.title.ilike(term), Incentive.description.ilike(term))
        )

    total = q.count()

    sort_col = {
        "title": Incentive.title,
        "category": Incentive.category,
        "value_amount": Incentive.value_amount,
        "updated_at": Incentive.updated_at,
    }[sort_by]
    q = q.order_by(sort_col.desc() if sort_dir == "desc" else sort_col.asc())

    offset = (page - 1) * page_size
    incentives = q.options(joinedload(Incentive.policy)).offset(offset).limit(page_size).all()

    items = []
    for inc in incentives:
        data = IncentiveWithPolicy.model_validate(inc)
        data.policy_jurisdiction = inc.policy.jurisdiction
        data.policy_title = inc.policy.title
        data.policy_status = inc.policy.status.value
        items.append(data)

    return PaginatedResponse.build(items=items, total=total, page=page, page_size=page_size)


@router.get("/categories", response_model=List[str])
def list_categories(db: Session = Depends(get_db)):
    rows = (
        db.query(Incentive.category)
        .distinct()
        .order_by(Incentive.category)
        .all()
    )
    return [r[0].value for r in rows]


@router.get("/summary", response_model=List[dict])
def incentives_summary(db: Session = Depends(get_db)):
    """Aggregate incentive counts by category."""
    rows = (
        db.query(Incentive.category, func.count(Incentive.id).label("count"))
        .group_by(Incentive.category)
        .order_by(func.count(Incentive.id).desc())
        .all()
    )
    return [{"category": r[0].value, "count": r[1]} for r in rows]


@router.get("/{incentive_id}", response_model=IncentiveWithPolicy)
def get_incentive(incentive_id: UUID, db: Session = Depends(get_db)):
    inc = (
        db.query(Incentive)
        .options(joinedload(Incentive.policy))
        .filter(Incentive.id == incentive_id)
        .first()
    )
    if not inc:
        raise HTTPException(status_code=404, detail="Incentive not found")

    data = IncentiveWithPolicy.model_validate(inc)
    data.policy_jurisdiction = inc.policy.jurisdiction
    data.policy_title = inc.policy.title
    data.policy_status = inc.policy.status.value
    return data
