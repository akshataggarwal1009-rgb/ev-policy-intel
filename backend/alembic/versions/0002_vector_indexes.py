"""Add IVFFlat vector similarity indexes

Revision ID: 0002
Revises: 0001
Create Date: 2026-06-10 00:01:00.000000

NOTE: Run AFTER `python embed.py` has populated the embedding columns.
IVFFlat requires at least some rows to build; `IF NOT EXISTS` makes it safe
to re-run. The `lists` value here is suitable for the seed dataset (~37/109 rows).
Increase `lists` as the dataset grows (rule: round(sqrt(n_rows))).
"""
from typing import Sequence, Union
from alembic import op


revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # IVFFlat cosine-distance indexes for ANN search
    # Using lists=1 for small seed dataset (exact-equivalent at this scale)
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
