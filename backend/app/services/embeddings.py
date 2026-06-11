"""
Embedding service — wraps OpenAI text-embedding-3-small (1536-dim).

Falls back gracefully when OPENAI_API_KEY is not set so the rest of the
app (browsing, filtering) keeps working without embeddings.
"""
import time
from typing import Optional
from app.config import settings

_client = None
EMBEDDING_MODEL = "text-embedding-3-small"
EMBEDDING_DIM = 1536
BATCH_SIZE = 100          # OpenAI allows up to 2048 inputs per request
RATE_LIMIT_SLEEP = 0.3    # seconds between batches


def _get_client():
    global _client
    if _client is None:
        from openai import OpenAI
        _client = OpenAI(api_key=settings.OPENAI_API_KEY)
    return _client


def is_available() -> bool:
    return bool(settings.OPENAI_API_KEY)


def embed_texts(texts: list[str]) -> list[list[float]]:
    """
    Embed a list of texts, returning one vector per text.
    Raises RuntimeError if OPENAI_API_KEY is not set.
    """
    if not is_available():
        raise RuntimeError("OPENAI_API_KEY is not configured — cannot generate embeddings.")

    client = _get_client()
    all_vectors: list[list[float]] = []

    for i in range(0, len(texts), BATCH_SIZE):
        batch = texts[i: i + BATCH_SIZE]
        # Replace newlines — OpenAI recommends this for embedding quality
        cleaned = [t.replace("\n", " ").strip() for t in batch]
        resp = client.embeddings.create(model=EMBEDDING_MODEL, input=cleaned)
        all_vectors.extend([item.embedding for item in resp.data])
        if i + BATCH_SIZE < len(texts):
            time.sleep(RATE_LIMIT_SLEEP)

    return all_vectors


def embed_one(text: str) -> list[float]:
    """Embed a single piece of text."""
    return embed_texts([text])[0]


def policy_text(jurisdiction: str, title: str, summary: str, tags: list[str]) -> str:
    tag_str = ", ".join(tags) if tags else ""
    parts = [f"{jurisdiction} — {title}", summary]
    if tag_str:
        parts.append(f"Tags: {tag_str}")
    return "\n".join(parts)


def incentive_text(
    policy_jurisdiction: str,
    policy_title: str,
    title: str,
    description: str,
    category: str,
    vehicle_segment: str,
    value_text: Optional[str],
) -> str:
    parts = [
        f"{policy_jurisdiction} › {policy_title}",
        f"{title}",
        description,
        f"Category: {category}  Segment: {vehicle_segment}",
    ]
    if value_text:
        parts.append(f"Value: {value_text}")
    return "\n".join(parts)
