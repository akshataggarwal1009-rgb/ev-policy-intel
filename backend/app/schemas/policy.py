from __future__ import annotations
from uuid import UUID
from datetime import date, datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, field_validator
from app.models.policy import PolicyStatus, JurisdictionType
from app.schemas.incentive import IncentiveResponse


class PolicyBase(BaseModel):
    jurisdiction: str
    jurisdiction_type: JurisdictionType
    title: str
    summary: str
    status: PolicyStatus = PolicyStatus.active
    confidence: float = 1.0
    source_url: Optional[str] = None
    effective_date: Optional[date] = None
    expiry_date: Optional[date] = None
    tags: List[str] = []


class PolicySummary(PolicyBase):
    """Lightweight list-view — no incentives, no raw_text."""
    id: UUID
    incentive_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PolicyDetail(PolicyBase):
    """Full detail view — includes incentives."""
    id: UUID
    raw_text: Optional[str] = None
    incentives: List[IncentiveResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class JurisdictionStats(BaseModel):
    jurisdiction: str
    jurisdiction_type: str
    policy_count: int
    active_count: int
    incentive_count: int


class PolicyStats(BaseModel):
    total_policies: int
    active_policies: int
    total_incentives: int
    by_jurisdiction_type: Dict[str, int]
    by_status: Dict[str, int]
    top_jurisdictions: List[JurisdictionStats]
