from __future__ import annotations
from uuid import UUID
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
import uuid


class ChatMessageCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=4000)


class ChatMessageResponse(BaseModel):
    id: UUID
    session_id: UUID
    role: str
    content: str
    token_count: Optional[int] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ChatSessionCreate(BaseModel):
    session_key: Optional[str] = None
    user_hint: Optional[str] = None


class ChatSessionResponse(BaseModel):
    id: UUID
    session_key: str
    user_hint: Optional[str] = None
    message_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PolicySource(BaseModel):
    jurisdiction: str
    title: str
    source_url: Optional[str] = None
    status: str


class ChatSource(BaseModel):
    policies: List[PolicySource] = []
    incentive_count: int = 0
    retrieval_mode: str = "vector"  # "vector" | "keyword" | "none"
