"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-06-10 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Enable pgvector extension
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    # policies
    op.create_table(
        "policies",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("jurisdiction", sa.String(120), nullable=False),
        sa.Column(
            "jurisdiction_type",
            sa.Enum("indian_state", "indian_ut", "national_india", "global_market", name="jurisdictiontype"),
            nullable=False,
        ),
        sa.Column("title", sa.String(300), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column(
            "status",
            sa.Enum("active", "draft", "expired", "under_review", name="policystatus"),
            nullable=False,
            server_default="active",
        ),
        sa.Column("confidence", sa.Float(), nullable=False, server_default="1.0"),
        sa.Column("source_url", sa.String(800)),
        sa.Column("effective_date", sa.Date()),
        sa.Column("expiry_date", sa.Date()),
        sa.Column("raw_text", sa.Text()),
        sa.Column("tags", postgresql.JSON(astext_type=sa.Text()), server_default="[]"),
        sa.Column("embedding", sa.Text()),  # stored as text; cast to vector in queries
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_policies_jurisdiction", "policies", ["jurisdiction"])
    op.create_index("ix_policies_jurisdiction_type", "policies", ["jurisdiction_type"])
    op.create_index("ix_policies_status", "policies", ["status"])

    # Replace text column with actual vector column
    op.execute("ALTER TABLE policies DROP COLUMN embedding")
    op.execute("ALTER TABLE policies ADD COLUMN embedding vector(1536)")

    # incentives
    op.create_table(
        "incentives",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("policy_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "category",
            sa.Enum(
                "purchase_subsidy", "tax_exemption", "registration_waiver",
                "charging_infra", "fleet_incentive", "scrappage", "rd_grant",
                "manufacturing_incentive", "other",
                name="incentivecategory",
            ),
            nullable=False,
        ),
        sa.Column("title", sa.String(300), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("value_text", sa.String(200)),
        sa.Column("value_amount", sa.Float()),
        sa.Column("value_unit", sa.String(50)),
        sa.Column(
            "vehicle_segment",
            sa.Enum("2w", "3w", "4w", "commercial", "bus", "all", name="vehiclesegment"),
            server_default="all",
        ),
        sa.Column("beneficiary", sa.String(100)),
        sa.Column("is_stackable", sa.Boolean(), server_default="false"),
        sa.Column("embedding", sa.Text()),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["policy_id"], ["policies.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_incentives_policy_id", "incentives", ["policy_id"])
    op.create_index("ix_incentives_category", "incentives", ["category"])

    op.execute("ALTER TABLE incentives DROP COLUMN embedding")
    op.execute("ALTER TABLE incentives ADD COLUMN embedding vector(1536)")

    # chat_sessions
    op.create_table(
        "chat_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("session_key", sa.String(64), nullable=False),
        sa.Column("user_hint", sa.String(200)),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("session_key"),
    )
    op.create_index("ix_chat_sessions_session_key", "chat_sessions", ["session_key"])

    # chat_messages
    op.create_table(
        "chat_messages",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("role", sa.String(20), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("token_count", sa.Integer()),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["session_id"], ["chat_sessions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_chat_messages_session_id", "chat_messages", ["session_id"])

    # usage_events
    op.create_table(
        "usage_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("event_type", sa.String(50), nullable=False),
        sa.Column("session_key", sa.String(64)),
        sa.Column("query", sa.Text()),
        sa.Column("endpoint", sa.String(200)),
        sa.Column("jurisdiction_filter", sa.String(120)),
        sa.Column("prompt_tokens", sa.Integer()),
        sa.Column("completion_tokens", sa.Integer()),
        sa.Column("latency_ms", sa.Integer()),
        sa.Column("metadata", postgresql.JSON(astext_type=sa.Text()), server_default="{}"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_usage_events_event_type", "usage_events", ["event_type"])
    op.create_index("ix_usage_events_created_at", "usage_events", ["created_at"])

    # ingestion_runs
    op.create_table(
        "ingestion_runs",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("source_name", sa.String(200), nullable=False),
        sa.Column("source_url", sa.String(800)),
        sa.Column("status", sa.String(30), nullable=False, server_default="pending"),
        sa.Column("policies_found", sa.Integer(), server_default="0"),
        sa.Column("policies_updated", sa.Integer(), server_default="0"),
        sa.Column("error_message", sa.Text()),
        sa.Column("started_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("finished_at", sa.DateTime()),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_ingestion_runs_source_name", "ingestion_runs", ["source_name"])
    op.create_index("ix_ingestion_runs_status", "ingestion_runs", ["status"])

    # IVFFlat index for ANN search (created after data load — placeholder comment)
    # op.execute("CREATE INDEX ON policies USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)")
    # op.execute("CREATE INDEX ON incentives USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)")


def downgrade() -> None:
    op.drop_table("ingestion_runs")
    op.drop_table("usage_events")
    op.drop_table("chat_messages")
    op.drop_table("chat_sessions")
    op.drop_table("incentives")
    op.drop_table("policies")
    op.execute("DROP TYPE IF EXISTS vehiclesegment")
    op.execute("DROP TYPE IF EXISTS incentivecategory")
    op.execute("DROP TYPE IF EXISTS policystatus")
    op.execute("DROP TYPE IF EXISTS jurisdictiontype")
    op.execute("DROP EXTENSION IF EXISTS vector")
