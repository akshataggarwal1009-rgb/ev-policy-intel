import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, Integer, Float, JSON
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class UsageEvent(Base):
    __tablename__ = "usage_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_type = Column(String(50), nullable=False, index=True)
    session_key = Column(String(64), index=True)
    query = Column(Text)
    endpoint = Column(String(200))
    jurisdiction_filter = Column(String(120))
    prompt_tokens = Column(Integer)
    completion_tokens = Column(Integer)
    latency_ms = Column(Integer)
    event_metadata = Column("metadata", JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)


class IngestionRun(Base):
    __tablename__ = "ingestion_runs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_name = Column(String(200), nullable=False, index=True)
    source_url = Column(String(800))
    status = Column(String(30), nullable=False, default="pending", index=True)
    policies_found = Column(Integer, default=0)
    policies_updated = Column(Integer, default=0)
    error_message = Column(Text)
    started_at = Column(DateTime, default=datetime.utcnow)
    finished_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
