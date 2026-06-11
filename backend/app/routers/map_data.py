"""
/map/data — aggregated per-jurisdiction statistics used by the choropleth map.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.policy import Policy, Incentive, IncentiveCategory, JurisdictionType, PolicyStatus

router = APIRouter(prefix="/map", tags=["map"])


@router.get("/data")
def map_data(db: Session = Depends(get_db)):
    """
    Returns one record per jurisdiction with aggregated stats for choropleth colouring.
    Only Indian jurisdictions are returned (states, UTs, national).
    """

    # Base counts per jurisdiction
    policy_counts = {
        r[0]: r[1]
        for r in db.query(Policy.jurisdiction, func.count(Policy.id))
        .filter(Policy.jurisdiction_type.in_([
            JurisdictionType.indian_state,
            JurisdictionType.indian_ut,
            JurisdictionType.national_india,
        ]))
        .group_by(Policy.jurisdiction)
        .all()
    }

    active_counts = {
        r[0]: r[1]
        for r in db.query(Policy.jurisdiction, func.count(Policy.id))
        .filter(
            Policy.status == PolicyStatus.active,
            Policy.jurisdiction_type.in_([
                JurisdictionType.indian_state,
                JurisdictionType.indian_ut,
                JurisdictionType.national_india,
            ]),
        )
        .group_by(Policy.jurisdiction)
        .all()
    }

    incentive_counts = {
        r[0]: r[1]
        for r in db.query(Policy.jurisdiction, func.count(Incentive.id))
        .join(Incentive, Incentive.policy_id == Policy.id)
        .filter(Policy.jurisdiction_type.in_([
            JurisdictionType.indian_state,
            JurisdictionType.indian_ut,
            JurisdictionType.national_india,
        ]))
        .group_by(Policy.jurisdiction)
        .all()
    }

    # Max purchase subsidy per jurisdiction
    max_subsidy = {
        r[0]: r[1]
        for r in db.query(Policy.jurisdiction, func.max(Incentive.value_amount))
        .join(Incentive, Incentive.policy_id == Policy.id)
        .filter(
            Incentive.category == IncentiveCategory.purchase_subsidy,
            Incentive.value_amount.isnot(None),
        )
        .group_by(Policy.jurisdiction)
        .all()
    }

    # Which jurisdictions have each incentive category
    category_presence: dict[str, set[str]] = {}
    rows = (
        db.query(Policy.jurisdiction, Incentive.category)
        .join(Incentive, Incentive.policy_id == Policy.id)
        .filter(Policy.jurisdiction_type.in_([
            JurisdictionType.indian_state,
            JurisdictionType.indian_ut,
        ]))
        .distinct()
        .all()
    )
    for jurisdiction, category in rows:
        category_presence.setdefault(jurisdiction, set()).add(category.value)

    # Jurisdiction type lookup
    jtype = {
        r[0]: r[1].value
        for r in db.query(Policy.jurisdiction, Policy.jurisdiction_type)
        .filter(Policy.jurisdiction_type.in_([
            JurisdictionType.indian_state,
            JurisdictionType.indian_ut,
            JurisdictionType.national_india,
        ]))
        .distinct(Policy.jurisdiction)
        .all()
    }

    states = [
        {
            "jurisdiction": j,
            "jurisdiction_type": jtype.get(j, "indian_state"),
            "policy_count": policy_counts.get(j, 0),
            "active_count": active_counts.get(j, 0),
            "incentive_count": incentive_counts.get(j, 0),
            "max_subsidy_inr": max_subsidy.get(j),
            "has_purchase_subsidy": "purchase_subsidy" in category_presence.get(j, set()),
            "has_road_tax_waiver": "registration_waiver" in category_presence.get(j, set()),
            "has_charging_infra": "charging_infra" in category_presence.get(j, set()),
            "has_manufacturing": "manufacturing_incentive" in category_presence.get(j, set()),
        }
        for j in policy_counts
    ]

    # Sort by incentive count desc for the legend
    states.sort(key=lambda s: -s["incentive_count"])

    return {
        "states": states,
        "meta": {
            "total_jurisdictions": len(states),
            "max_incentive_count": max(s["incentive_count"] for s in states) if states else 0,
            "max_policy_count": max(s["policy_count"] for s in states) if states else 0,
        },
    }
