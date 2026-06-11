"""
Claude-powered extraction of structured EV policy data from raw HTML/text.
"""
import json
import re
from typing import Optional

import anthropic

_client: Optional[anthropic.Anthropic] = None

EXTRACTION_MODEL = "claude-sonnet-4-6"
MAX_CONTENT_CHARS = 10_000


def _get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        import os
        _client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY", ""))
    return _client


def _strip_html(html: str) -> str:
    text = re.sub(r"<style[^>]*>.*?</style>", " ", html, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r"<script[^>]*>.*?</script>", " ", text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def extract_policies(
    html_content: str,
    source_name: str,
    source_url: str,
    jurisdiction: str,
    jurisdiction_type: str,
    tags: list,
) -> list[dict]:
    """
    Use Claude to extract structured EV policy data from a page's HTML content.
    Returns a list of policy dicts ready for upsert (may be empty if nothing found).
    """
    snippet = _strip_html(html_content)[:MAX_CONTENT_CHARS]

    prompt = f"""You are an EV policy data extraction agent for India. Extract structured EV (electric vehicle) policy information from the following webpage content.

Source: {source_name}
URL: {source_url}
Jurisdiction: {jurisdiction}
Jurisdiction type: {jurisdiction_type}

Webpage content:
---
{snippet}
---

Extract any EV policies, incentive schemes, or subsidy programs. Return a JSON array.
Each element in the array must have these exact fields:
- "title": string — official policy/scheme name
- "summary": string — 2-4 sentence description of scope and key provisions
- "status": one of "active" | "draft" | "expired" | "under_review"
- "confidence": float 0.0–1.0 — your confidence in the accuracy of extracted data
- "effective_date": "YYYY-MM-DD" or null
- "expiry_date": "YYYY-MM-DD" or null
- "tags": string[] — subset of: subsidy, charging-infra, tax-exemption, registration, scrappage, manufacturing, fleet, rd
- "incentives": array of objects, each with:
  - "category": one of purchase_subsidy | tax_exemption | registration_waiver | charging_infra | fleet_incentive | scrappage | rd_grant | manufacturing_incentive | other
  - "title": string
  - "description": string
  - "value_text": string or null (e.g. "₹15,000/kWh" or "100% road tax waiver")
  - "value_amount": number or null (numeric value only)
  - "value_unit": string or null (e.g. "INR per kWh")
  - "vehicle_segment": one of 2w | 3w | 4w | commercial | bus | all
  - "beneficiary": string or null (e.g. "consumer", "manufacturer", "fleet operator")

Rules:
- Only extract genuine EV-related policy content. Ignore generic navigation, footers, contact pages.
- If the page has no EV policy content, return [].
- Keep incentives array empty [] if no specific incentives are listed.
- Return ONLY valid JSON — no markdown fences, no explanations."""

    client = _get_client()
    msg = client.messages.create(
        model=EXTRACTION_MODEL,
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = msg.content[0].text.strip()

    # Strip markdown code fences if present
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)

    # Extract the outermost JSON array
    match = re.search(r"\[.*\]", raw, re.DOTALL)
    if match:
        raw = match.group(0)

    extracted: list[dict] = json.loads(raw)

    for policy in extracted:
        policy["jurisdiction"] = jurisdiction
        policy["jurisdiction_type"] = jurisdiction_type
        policy["source_url"] = source_url
        merged_tags = list(set(policy.get("tags", []) + tags))
        policy["tags"] = merged_tags

    return extracted
