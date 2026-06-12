"""Switch embedding columns from OpenAI 1536-dim to VoyageAI 1024-dim

Revision ID: 0003
Revises: 0002
Create Date: 2026-06-12 00:00:00.000000
"""
from typing import Sequence, Union
from alembic import op

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop dimension-specific IVFFlat indexes before resizing columns
    op.execute("DROP INDEX IF EXISTS idx_policies_embedding_ivfflat")
    op.execute("DROP INDEX IF EXISTS idx_incentives_embedding_ivfflat")

    # Clear existing embeddings (1536-dim vectors are incompatible with 1024-dim)
    op.execute("UPDATE policies SET embedding = NULL")
    op.execute("UPDATE incentives SET embedding = NULL")

    # Resize columns to voyage-3-lite dimension
    op.execute("ALTER TABLE policies ALTER COLUMN embedding TYPE vector(1024)")
    op.execute("ALTER TABLE incentives ALTER COLUMN embedding TYPE vector(1024)")

    # Recreate IVFFlat indexes for new dimension
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
    op.execute("ALTER TABLE policies ALTER COLUMN embedding TYPE vector(1536)")
    op.execute("ALTER TABLE incentives ALTER COLUMN embedding TYPE vector(1536)")
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
