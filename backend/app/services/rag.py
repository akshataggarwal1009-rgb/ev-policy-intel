"""
RAG pipeline — retrieves relevant policy context, builds Claude prompt, streams response.
"""
from __future__ import annotations
import json
from typing import AsyncGenerator, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.config import settings
from app.models.policy import Policy, Incentive, PolicyStatus
from app.models.chat import ChatMessage
from app.schemas.chat import ChatSource, PolicySource

# ── System prompt ─────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are an expert EV (Electric Vehicle) policy analyst specialising in India's subnational and national EV policy landscape, with deep knowledge of global benchmarks.

Your role is to help policymakers, researchers, and analysts understand, compare, and navigate EV policies and incentives.

## Guidelines
- Answer PRIMARILY from the RETRIEVED POLICY CONTEXT provided — it contains verified, structured data from official sources.
- Cite specific jurisdictions, policy names, and incentive values from the context. Use exact figures (₹ amounts, percentages, timelines).
- When comparing across states or countries, be structured: use bullet points or tables where helpful.
- If the context does not contain enough information, say so explicitly — never fabricate policy details.
- For questions about states not in the context, state that their data may not be in the current database.
- Highlight where policies are stackable, time-limited, or budget-capped.
- Keep answers clear and concise. Use Markdown headings and bullets for structure.
- Stay focused on EV policy topics. Politely decline off-topic requests."""

# ── Context builder ────────────────────────────────────────────────────────────

def format_context(policies: list[Policy], extra_incentives: list[Incentive]) -> str:
    """Convert retrieved DB objects into a structured text block for the LLM."""
    if not policies and not extra_incentives:
        return ""

    lines: list[str] = ["=== RETRIEVED POLICY CONTEXT ===\n"]

    for idx, p in enumerate(policies, 1):
        eff = p.effective_date.isoformat() if p.effective_date else "—"
        exp = p.expiry_date.isoformat() if p.expiry_date else "ongoing"
        lines.append(
            f"[{idx}] {p.title}\n"
            f"    Jurisdiction: {p.jurisdiction} | Type: {p.jurisdiction_type.value} | "
            f"Status: {p.status.value} | Confidence: {round(p.confidence * 100)}%\n"
            f"    Period: {eff} → {exp}"
        )
        if p.source_url:
            lines.append(f"    Source: {p.source_url}")
        lines.append(f"    Summary: {p.summary}")

        # Load incentives for this policy (may already be loaded via joinedload)
        inc_list = p.incentives if hasattr(p, "incentives") and p.incentives else []
        if inc_list:
            lines.append("    Incentives:")
            for inc in inc_list:
                stackable = " [stackable]" if inc.is_stackable else ""
                val = f" — {inc.value_text}" if inc.value_text else ""
                seg = inc.vehicle_segment.value if inc.vehicle_segment else "all"
                benef = f", {inc.beneficiary}" if inc.beneficiary else ""
                lines.append(
                    f"      • [{inc.category.value}] {inc.title}{val}"
                    f" ({seg}{benef}){stackable}"
                )
        lines.append("")

    if extra_incentives:
        lines.append("--- Additional relevant incentives ---")
        for inc in extra_incentives:
            val = f" — {inc.value_text}" if inc.value_text else ""
            lines.append(f"  • {inc.title}{val} (category: {inc.category.value})")
        lines.append("")

    lines.append("=== END CONTEXT ===")
    return "\n".join(lines)


# ── Retrieval ──────────────────────────────────────────────────────────────────

def keyword_search(db: Session, query: str, limit: int = 5) -> list[Policy]:
    """Fallback keyword search when embeddings are unavailable."""
    stop_words = {"what", "how", "does", "the", "and", "for", "with", "that", "this", "are", "have", "from"}
    terms = [t.strip("?.,!") for t in query.lower().split() if len(t) > 3 and t not in stop_words]

    if not terms:
        return db.query(Policy).filter(Policy.status == PolicyStatus.active).limit(limit).all()

    conditions = [
        or_(
            Policy.title.ilike(f"%{t}%"),
            Policy.summary.ilike(f"%{t}%"),
            Policy.jurisdiction.ilike(f"%{t}%"),
        )
        for t in terms[:6]
    ]
    return db.query(Policy).filter(or_(*conditions)).limit(limit).all()


def retrieve_context(
    db: Session,
    query: str,
    policy_limit: int = 5,
    incentive_limit: int = 8,
) -> tuple[list[Policy], list[Incentive], str]:
    """
    Returns (policies, extra_incentives, retrieval_mode).
    Tries vector search first; falls back to keyword search.
    """
    from app.services.embeddings import is_available
    from app.services.vector_search import search_combined
    from sqlalchemy.orm import joinedload

    retrieval_mode = "none"

    if is_available():
        try:
            result = search_combined(db, query, policy_limit=policy_limit, incentive_limit=incentive_limit)
            policies_raw = result["policies"]
            incentives_raw = result["incentives"]

            if policies_raw or incentives_raw:
                # Reload policies with incentives eagerly
                policy_ids = [p.id for p in policies_raw]
                policies = (
                    db.query(Policy)
                    .options(joinedload(Policy.incentives))
                    .filter(Policy.id.in_(policy_ids))
                    .all()
                )
                # Preserve similarity order
                order = {str(p.id): i for i, p in enumerate(policies_raw)}
                policies.sort(key=lambda p: order.get(str(p.id), 999))
                return policies, incentives_raw, "vector"
        except Exception:
            pass  # fall through to keyword

    # Keyword fallback
    policies = (
        db.query(Policy)
        .options(joinedload(Policy.incentives))
        .filter(
            or_(
                *[
                    or_(
                        Policy.title.ilike(f"%{t}%"),
                        Policy.summary.ilike(f"%{t}%"),
                        Policy.jurisdiction.ilike(f"%{t}%"),
                    )
                    for t in _extract_terms(query)
                ]
            )
            if _extract_terms(query)
            else Policy.status == PolicyStatus.active
        )
        .limit(policy_limit)
        .all()
    )
    return policies, [], "keyword" if policies else "none"


def _extract_terms(query: str) -> list[str]:
    stop = {"what", "how", "does", "the", "and", "for", "with", "that", "this", "are", "have", "from", "give", "tell", "show"}
    return [t.strip("?.,!") for t in query.lower().split() if len(t) > 3 and t not in stop][:6]


# ── Message builder ────────────────────────────────────────────────────────────

def build_messages(
    history: list[ChatMessage],
    context_text: str,
    user_query: str,
    max_history_turns: int = 8,
) -> list[dict]:
    """
    Constructs the messages array for the Anthropic API.
    Injects retrieved context as a prefix in the latest user turn.
    """
    messages: list[dict] = []

    # Include last N turns of history (excluding the current message)
    tail = history[-(max_history_turns * 2):]
    for msg in tail:
        messages.append({"role": msg.role, "content": msg.content})

    # Latest user message with context injected
    if context_text:
        full_user_content = (
            f"{context_text}\n\n"
            f"---\n"
            f"User question: {user_query}"
        )
    else:
        full_user_content = (
            f"[No specific policy context was retrieved for this query — "
            f"answer from general knowledge, clearly noting this.]\n\n"
            f"User question: {user_query}"
        )

    messages.append({"role": "user", "content": full_user_content})
    return messages


# ── Streaming generator ────────────────────────────────────────────────────────

async def stream_rag_response(
    session_id: str,
    user_query: str,
    history: list[ChatMessage],
    db_factory,  # callable() -> Session (not the session itself)
    jurisdiction_type: Optional[str] = None,
) -> AsyncGenerator[str, None]:
    """
    Async SSE generator. Yields `data: {...}\n\n` events.
    Creates its own DB session for the final message save so it outlives
    the request-scoped session.

    Event types:
      {"type": "token",   "text": "..."}
      {"type": "sources", "sources": {...}}
      {"type": "done"}
      {"type": "error",   "message": "..."}
    """
    if not settings.ANTHROPIC_API_KEY:
        yield _sse({"type": "error", "message": "ANTHROPIC_API_KEY is not configured."})
        return

    # ── Retrieval (uses existing request-scoped session) ────────────────────
    retrieval_db = db_factory()
    try:
        policies, extra_incentives, retrieval_mode = retrieve_context(
            retrieval_db, user_query,
        )
        context_text = format_context(policies, extra_incentives)
        sources = ChatSource(
            policies=[
                PolicySource(
                    jurisdiction=p.jurisdiction,
                    title=p.title,
                    source_url=p.source_url,
                    status=p.status.value,
                )
                for p in policies
            ],
            incentive_count=sum(len(p.incentives) for p in policies) + len(extra_incentives),
            retrieval_mode=retrieval_mode,
        )
    finally:
        retrieval_db.close()

    # Send sources before streaming begins so the UI can render them immediately
    yield _sse({"type": "sources", "sources": sources.model_dump()})

    # ── Claude streaming call ───────────────────────────────────────────────
    from anthropic import AsyncAnthropic

    client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
    messages = build_messages(history, context_text, user_query)

    full_text: list[str] = []
    prompt_tokens = 0
    completion_tokens = 0

    try:
        async with client.messages.stream(
            model="claude-sonnet-4-6",
            max_tokens=2048,
            system=SYSTEM_PROMPT,
            messages=messages,
        ) as stream:
            async for text in stream.text_stream:
                full_text.append(text)
                yield _sse({"type": "token", "text": text})

            # Capture usage from the final message
            final = await stream.get_final_message()
            prompt_tokens = final.usage.input_tokens
            completion_tokens = final.usage.output_tokens

    except Exception as exc:
        yield _sse({"type": "error", "message": str(exc)})
        return

    # ── Persist assistant message ───────────────────────────────────────────
    assistant_content = "".join(full_text)
    save_db = db_factory()
    try:
        from app.models.chat import ChatMessage as ChatMsg
        import uuid
        msg = ChatMsg(
            id=uuid.uuid4(),
            session_id=session_id,
            role="assistant",
            content=assistant_content,
            token_count=completion_tokens,
        )
        save_db.add(msg)

        # Log usage event
        from app.models.analytics import UsageEvent
        save_db.add(UsageEvent(
            event_type="chat_message",
            session_key=str(session_id),
            query=user_query[:500],
            endpoint="/chat",
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            event_metadata={"retrieval_mode": retrieval_mode, "sources_count": len(sources.policies)},
        ))
        save_db.commit()
    except Exception:
        save_db.rollback()
    finally:
        save_db.close()

    yield _sse({"type": "done"})


def _sse(data: dict) -> str:
    return f"data: {json.dumps(data)}\n\n"
