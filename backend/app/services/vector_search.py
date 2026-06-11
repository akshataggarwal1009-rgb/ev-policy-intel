"""
Vector similarity search helpers used by the RAG pipeline (Step 6).

Uses pgvector's <=> (cosine distance) operator via SQLAlchemy.
Falls back to empty results when embeddings are unavailable.
"""
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import text as sa_text

from app.models.policy import Policy, Incentive
from app.services.embeddings import embed_one, is_available


def _cosine_query(
    db: Session,
    table: str,
    query_vector: list[float],
    limit: int,
    extra_filter: str = "",
) -> list[dict]:
    """
    Raw SQL cosine similarity query — returns rows ordered by closest vector.
    pgvector <=> is cosine distance (lower = more similar).
    """
    vec_literal = "[" + ",".join(str(x) for x in query_vector) + "]"
    filter_clause = f"AND {extra_filter}" if extra_filter else ""
    sql = sa_text(f"""
        SELECT id, 1 - (embedding <=> '{vec_literal}'::vector) AS similarity
        FROM {table}
        WHERE embedding IS NOT NULL
        {filter_clause}
        ORDER BY embedding <=> '{vec_literal}'::vector
        LIMIT :limit
    """)
    rows = db.execute(sql, {"limit": limit}).fetchall()
    return [{"id": str(r[0]), "similarity": float(r[1])} for r in rows]


def search_policies(
    db: Session,
    query: str,
    limit: int = 6,
    min_similarity: float = 0.30,
    jurisdiction_type: Optional[str] = None,
) -> list[Policy]:
    """Return the most semantically relevant policies for a query string."""
    if not is_available():
        return []

    vec = embed_one(query)
    extra = f"jurisdiction_type = '{jurisdiction_type}'" if jurisdiction_type else ""
    hits = _cosine_query(db, "policies", vec, limit, extra)

    relevant_ids = [h["id"] for h in hits if h["similarity"] >= min_similarity]
    if not relevant_ids:
        return []

    policies = db.query(Policy).filter(Policy.id.in_(relevant_ids)).all()
    # Re-order by similarity rank
    order = {pid: i for i, pid in enumerate(relevant_ids)}
    return sorted(policies, key=lambda p: order.get(str(p.id), 999))


def search_incentives(
    db: Session,
    query: str,
    limit: int = 10,
    min_similarity: float = 0.30,
) -> list[Incentive]:
    """Return the most semantically relevant incentives for a query string."""
    if not is_available():
        return []

    vec = embed_one(query)
    hits = _cosine_query(db, "incentives", vec, limit)

    relevant_ids = [h["id"] for h in hits if h["similarity"] >= min_similarity]
    if not relevant_ids:
        return []

    incentives = db.query(Incentive).filter(Incentive.id.in_(relevant_ids)).all()
    order = {iid: i for i, iid in enumerate(relevant_ids)}
    return sorted(incentives, key=lambda i: order.get(str(i.id), 999))


def search_combined(
    db: Session,
    query: str,
    policy_limit: int = 5,
    incentive_limit: int = 8,
    min_similarity: float = 0.28,
) -> dict:
    """
    Returns both policies and incentives relevant to a query.
    Used as the retrieval step in the RAG pipeline.
    """
    policies = search_policies(db, query, limit=policy_limit, min_similarity=min_similarity)
    incentives = search_incentives(db, query, limit=incentive_limit, min_similarity=min_similarity)

    # Deduplicate: drop incentives whose parent policy is already in the result set
    policy_ids = {str(p.id) for p in policies}
    unique_incentives = [i for i in incentives if str(i.policy_id) not in policy_ids]

    return {"policies": policies, "incentives": unique_incentives}
