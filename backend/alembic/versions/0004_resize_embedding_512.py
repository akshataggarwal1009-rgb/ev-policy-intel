"""Resize embedding columns to 512-dim (voyage-3-lite actual output)

Revision ID: 0004
Revises: 0003
Create Date: 2026-06-12 00:01:00.000000
"""
from typing import Sequence, Union
from alembic import op

revision: str = "0004"
down_revision: Union[str, None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_policies_embedding_ivfflat")
    op.execute("DROP INDEX IF EXISTS idx_incentives_embedding_ivfflat")
    op.execute("UPDATE policies SET embedding = NULL")
    op.execute("UPDATE incentives SET embedding = NULL")
    op.execute("ALTER TABLE policies ALTER COLUMN embedding TYPE vector(512)")
    op.execute("ALTER TABLE incentives ALTER COLUMN embedding TYPE vector(512)")
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_policies_embedding_ivfflat
        ON policies USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 1)
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_incentives_embedding_ivfflat
        ON incentives USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 1)
    """)


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_policies_embedding_ivfflat")
    op.execute("DROP INDEX IF EXISTS idx_incentives_embedding_ivfflat")
    op.execute("UPDATE policies SET embedding = NULL")
    op.execute("UPDATE incentives SET embedding = NULL")
    op.execute("ALTER TABLE policies ALTER COLUMN embedding TYPE vector(1024)")
    op.execute("ALTER TABLE incentives ALTER COLUMN embedding TYPE vector(1024)")
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_policies_embedding_ivfflat
        ON policies USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 1)
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_incentives_embedding_ivfflat
        ON incentives USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 1)
    """)
