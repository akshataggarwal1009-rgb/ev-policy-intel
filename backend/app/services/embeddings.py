"""
Embedding service — wraps VoyageAI voyage-3-lite (1024-dim).

Falls back gracefully when VOYAGE_API_KEY is not set so the rest of the
app (browsing, filtering) keeps working without embeddings.
"""
import time
from typing import Optional
from app.config import settings

_client = None
EMBEDDING_MODEL = "voyage-3-lite"
EMBEDDING_DIM = 512
BATCH_SIZE = 40           # keeps batches under 10K tokens on free tier
RATE_LIMIT_SLEEP = 62     # free tier: 3 RPM / 10K TPM — wait >60s between batches


def _get_client():
    global _client
    if _client is None:
        import voyageai
        _client = voyageai.Client(api_key=settings.VOYAGE_API_KEY)
    return _client


def is_available() -> bool:
    return bool(settings.VOYAGE_API_KEY)


def embed_texts(texts: list[str], input_type: str = "document") -> list[list[float]]:
    """
    Embed a list of texts, returning one vector per text.
    Raises RuntimeError if VOYAGE_API_KEY is not set.
    input_type: "document" for indexing, "query" for search queries.
    """
    if not is_available():
        raise RuntimeError("VOYAGE_API_KEY is not configured — cannot generate embeddings.")

    client = _get_client()
    all_vectors: list[list[float]] = []

    for i in range(0, len(texts), BATCH_SIZE):
        batch = texts[i: i + BATCH_SIZE]
        cleaned = [t.replace("\n", " ").strip() for t in batch]
        resp = client.embed(cleaned, model=EMBEDDING_MODEL, input_type=input_type)
        all_vectors.extend(resp.embeddings)
        if i + BATCH_SIZE < len(texts):
            time.sleep(RATE_LIMIT_SLEEP)

    return all_vectors


def embed_one(text: str, input_type: str = "query") -> list[float]:
    """Embed a single piece of text (defaults to query mode for search).
    Retries up to 3 times on rate limit errors with 22-second backoff."""
    if not is_available():
        raise RuntimeError("VOYAGE_API_KEY is not configured — cannot generate embeddings.")
    client = _get_client()
    cleaned = text.replace("\n", " ").strip()
    for attempt in range(3):
        try:
            resp = client.embed([cleaned], model=EMBEDDING_MODEL, input_type=input_type)
            return resp.embeddings[0]
        except Exception as e:
            if attempt < 2 and "rate" in str(e).lower():
                time.sleep(22)  # 3 RPM = 1 call per 20s
                continue
            raise


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
