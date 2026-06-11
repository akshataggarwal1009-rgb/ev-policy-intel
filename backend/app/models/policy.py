import uuid
from datetime import date, datetime
from sqlalchemy import (
    Column, String, Text, Float, Date, DateTime, ForeignKey,
    Enum as SAEnum, Integer, Boolean, JSON
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector
from app.database import Base
import enum


class JurisdictionType(str, enum.Enum):
    indian_state = "indian_state"
    indian_ut = "indian_ut"
    national_india = "national_india"
    global_market = "global_market"


class PolicyStatus(str, enum.Enum):
    active = "active"
    draft = "draft"
    expired = "expired"
    under_review = "under_review"


class Policy(Base):
    __tablename__ = "policies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    jurisdiction = Column(String(120), nullable=False, index=True)
    jurisdiction_type = Column(SAEnum(JurisdictionType), nullable=False, index=True)
    title = Column(String(300), nullable=False)
    summary = Column(Text, nullable=False)
    status = Column(SAEnum(PolicyStatus), nullable=False, default=PolicyStatus.active, index=True)
    confidence = Column(Float, nullable=False, default=1.0)
    source_url = Column(String(800))
    effective_date = Column(Date)
    expiry_date = Column(Date)
    raw_text = Column(Text)
    tags = Column(JSON, default=list)
    embedding = Column(Vector(1536))
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    incentives = relationship("Incentive", back_populates="policy", cascade="all, delete-orphan")


class VehicleSegment(str, enum.Enum):
    two_wheeler = "2w"
    three_wheeler = "3w"
    four_wheeler = "4w"
    commercial = "commercial"
    bus = "bus"
    all_segments = "all"


class IncentiveCategory(str, enum.Enum):
    purchase_subsidy = "purchase_subsidy"
    tax_exemption = "tax_exemption"
    registration_waiver = "registration_waiver"
    charging_infra = "charging_infra"
    fleet_incentive = "fleet_incentive"
    scrappage = "scrappage"
    rd_grant = "rd_grant"
    manufacturing_incentive = "manufacturing_incentive"
    other = "other"


class Incentive(Base):
    __tablename__ = "incentives"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    policy_id = Column(UUID(as_uuid=True), ForeignKey("policies.id", ondelete="CASCADE"), nullable=False, index=True)
    category = Column(SAEnum(IncentiveCategory), nullable=False, index=True)
    title = Column(String(300), nullable=False)
    description = Column(Text, nullable=False)
    value_text = Column(String(200))
    value_amount = Column(Float)
    value_unit = Column(String(50))
    vehicle_segment = Column(SAEnum(VehicleSegment), default=VehicleSegment.all_segments)
    beneficiary = Column(String(100))
    is_stackable = Column(Boolean, default=False)
    embedding = Column(Vector(1536))
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    policy = relationship("Policy", back_populates="incentives")
