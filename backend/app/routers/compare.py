"""
/compare — structured side-by-side data for 2-4 jurisdictions.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List, Optional

from app.database import get_db
from app.models.policy import Policy, Incentive, IncentiveCategory, VehicleSegment, PolicyStatus

router = APIRouter(prefix="/compare", tags=["compare"])


def _max_subsidy(incentives: list, segment: Optional[str] = None) -> Optional[float]:
    vals = [
        i.value_amount for i in incentives
        if i.category == IncentiveCategory.purchase_subsidy
        and i.value_amount is not None
        and (segment is None or i.vehicle_segment.value == segment or i.vehicle_segment == VehicleSegment.all_segments)
    ]
    return max(vals) if vals else None


def _has_category(incentives: list, category: IncentiveCategory) -> bool:
    return any(i.category == category for i in incentives)


def _best_value_text(incentives: list, category: IncentiveCategory) -> Optional[str]:
    items = [i for i in incentives if i.category == category and i.value_text]
    if not items:
        return None
    # Prefer item with highest value_amount; fall back to first
    items.sort(key=lambda i: i.value_amount or 0, reverse=True)
    return items[0].value_text


@router.get("")
def compare_jurisdictions(
    jurisdictions: str = Query(..., description="Comma-separated jurisdiction names, 2–4"),
    db: Session = Depends(get_db),
):
    names = [j.strip() for j in jurisdictions.split(",") if j.strip()]
    if len(names) < 2:
        raise HTTPException(status_code=400, detail="Provide at least 2 jurisdictions to compare")
    if len(names) > 4:
        raise HTTPException(status_code=400, detail="Maximum 4 jurisdictions per comparison")

    results = []
    for name in names:
        policies = (
            db.query(Policy)
            .options(joinedload(Policy.incentives))
            .filter(Policy.jurisdiction == name)
            .order_by(Policy.status.asc(), Policy.updated_at.desc())
            .all()
        )

        # Flatten all incentives across all this jurisdiction's policies
        all_incentives: list[Incentive] = []
        for p in policies:
            all_incentives.extend(p.incentives)

        active_policies = [p for p in policies if p.status == PolicyStatus.active]
        avg_confidence = (
            sum(p.confidence for p in policies) / len(policies) if policies else 0.0
        )

        # Per-segment max subsidies
        subsidy_2w = _max_subsidy(all_incentives, "2w")
        subsidy_3w = _max_subsidy(all_incentives, "3w")
        subsidy_4w = _max_subsidy(all_incentives, "4w")
        subsidy_commercial = _max_subsidy(all_incentives, "commercial")
        subsidy_bus = _max_subsidy(all_incentives, "bus")

        # Category presence and best value texts
        categories = {
            "purchase_subsidy":        IncentiveCategory.purchase_subsidy,
            "tax_exemption":           IncentiveCategory.tax_exemption,
            "registration_waiver":     IncentiveCategory.registration_waiver,
            "charging_infra":          IncentiveCategory.charging_infra,
            "fleet_incentive":         IncentiveCategory.fleet_incentive,
            "scrappage":               IncentiveCategory.scrappage,
            "rd_grant":                IncentiveCategory.rd_grant,
            "manufacturing_incentive": IncentiveCategory.manufacturing_incentive,
        }

        coverage = {
            key: {
                "present": _has_category(all_incentives, cat),
                "best_value": _best_value_text(all_incentives, cat),
            }
            for key, cat in categories.items()
        }

        # Top policy for display (prefer active, then most recent)
        primary_policy = active_policies[0] if active_policies else (policies[0] if policies else None)

        results.append({
            "jurisdiction": name,
            "jurisdiction_type": (
                primary_policy.jurisdiction_type.value if primary_policy else None
            ),
            "found": len(policies) > 0,
            "total_policies": len(policies),
            "active_policies": len(active_policies),
            "total_incentives": len(all_incentives),
            "avg_confidence": round(avg_confidence, 3),
            "primary_policy": {
                "id": str(primary_policy.id),
                "title": primary_policy.title,
                "status": primary_policy.status.value,
                "effective_date": (
                    primary_policy.effective_date.isoformat()
                    if primary_policy.effective_date else None
                ),
                "source_url": primary_policy.source_url,
                "summary": primary_policy.summary[:400] + "…"
                if primary_policy.summary and len(primary_policy.summary) > 400
                else primary_policy.summary,
            } if primary_policy else None,
            "subsidies": {
                "2w": subsidy_2w,
                "3w": subsidy_3w,
                "4w": subsidy_4w,
                "commercial": subsidy_commercial,
                "bus": subsidy_bus,
            },
            "coverage": coverage,
            "all_policy_ids": [str(p.id) for p in policies],
        })

    return {"jurisdictions": results, "count": len(results)}
