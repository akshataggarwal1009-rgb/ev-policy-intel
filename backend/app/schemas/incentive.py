from __future__ import annotations
from uuid import UUID
from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from app.models.policy import IncentiveCategory, VehicleSegment


class IncentiveBase(BaseModel):
    category: IncentiveCategory
    title: str
    description: str
    value_text: Optional[str] = None
    value_amount: Optional[float] = None
    value_unit: Optional[str] = None
    vehicle_segment: Optional[VehicleSegment] = VehicleSegment.all_segments
    beneficiary: Optional[str] = None
    is_stackable: bool = False


class IncentiveResponse(IncentiveBase):
    id: UUID
    policy_id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class IncentiveWithPolicy(IncentiveResponse):
    policy_jurisdiction: str
    policy_title: str
    policy_status: str

    model_config = {"from_attributes": True}
