"""
Notification sender — HTTP webhook and SendGrid email.
Both are fire-and-forget; failures are logged but never re-raised.
"""
import json
import logging
from typing import Optional

import httpx

logger = logging.getLogger(__name__)


def notify(
    source_name: str,
    jurisdiction: str,
    policies_found: int,
    policies_updated: int,
    notify_email: Optional[str] = None,
    notify_webhook: Optional[str] = None,
    sendgrid_api_key: Optional[str] = None,
) -> None:
    if not notify_email and not notify_webhook:
        return

    subject = f"EV Policy Update: {source_name}"
    body = (
        f"Changes detected in monitored source: {source_name}\n"
        f"Jurisdiction: {jurisdiction}\n"
        f"New policies added: {policies_found}\n"
        f"Existing policies updated: {policies_updated}\n"
    )

    if notify_webhook:
        _send_webhook(notify_webhook, source_name, jurisdiction, policies_found, policies_updated, body)

    if notify_email and sendgrid_api_key:
        _send_email(sendgrid_api_key, notify_email, subject, body)


def _send_webhook(
    webhook_url: str,
    source_name: str,
    jurisdiction: str,
    policies_found: int,
    policies_updated: int,
    text: str,
) -> None:
    payload = {
        "text": text,
        "source": source_name,
        "jurisdiction": jurisdiction,
        "policies_found": policies_found,
        "policies_updated": policies_updated,
    }
    try:
        resp = httpx.post(webhook_url, json=payload, timeout=10)
        resp.raise_for_status()
        logger.info("Webhook notification sent to %s", webhook_url)
    except Exception as exc:
        logger.warning("Webhook notification failed: %s", exc)


def _send_email(
    api_key: str,
    to_email: str,
    subject: str,
    body: str,
) -> None:
    payload = {
        "personalizations": [{"to": [{"email": to_email}]}],
        "from": {"email": "noreply@ev-policy-intel.app", "name": "EV Policy Monitor"},
        "subject": subject,
        "content": [{"type": "text/plain", "value": body}],
    }
    try:
        resp = httpx.post(
            "https://api.sendgrid.com/v3/mail/send",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            content=json.dumps(payload),
            timeout=15,
        )
        resp.raise_for_status()
        logger.info("Email notification sent to %s", to_email)
    except Exception as exc:
        logger.warning("Email notification failed: %s", exc)
