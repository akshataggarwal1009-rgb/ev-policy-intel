"""
HTTP fetcher with ETag/Last-Modified and content-hash change detection.
State is persisted to ingestion/state/source_state.json between runs.
"""
import hashlib
import json
import time
from pathlib import Path

import httpx

STATE_FILE = Path(__file__).parent / "state" / "source_state.json"
FETCH_TIMEOUT = 30
USER_AGENT = "EVPolicyBot/1.0 (+https://github.com/ev-policy-intel)"


def _load_state() -> dict:
    if STATE_FILE.exists():
        try:
            return json.loads(STATE_FILE.read_text(encoding="utf-8"))
        except Exception:
            return {}
    return {}


def _save_state(state: dict) -> None:
    STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    STATE_FILE.write_text(json.dumps(state, indent=2), encoding="utf-8")


def _content_hash(content: str) -> str:
    return hashlib.sha256(content.encode()).hexdigest()[:20]


def fetch_and_check(source_name: str, url: str) -> tuple[bool, str, dict]:
    """
    Fetch a URL and check if its content has changed since the last run.

    Returns (changed, content, response_headers).
    changed=False means content is identical — callers can skip processing.
    Raises RuntimeError on HTTP errors or network failures.
    """
    state = _load_state()
    source_state = state.get(source_name, {})

    headers = {"User-Agent": USER_AGENT}
    if source_state.get("etag"):
        headers["If-None-Match"] = source_state["etag"]
    if source_state.get("last_modified"):
        headers["If-Modified-Since"] = source_state["last_modified"]

    try:
        resp = httpx.get(url, headers=headers, timeout=FETCH_TIMEOUT, follow_redirects=True)
    except httpx.RequestError as exc:
        raise RuntimeError(f"Network error fetching {url}: {exc}") from exc

    if resp.status_code == 304:
        _touch_checked(state, source_name)
        return False, "", dict(resp.headers)

    if resp.status_code >= 400:
        raise RuntimeError(f"HTTP {resp.status_code} from {url}")

    content = resp.text
    new_hash = _content_hash(content)
    old_hash = source_state.get("content_hash")

    changed = new_hash != old_hash

    state[source_name] = {
        "etag": resp.headers.get("etag"),
        "last_modified": resp.headers.get("last-modified"),
        "content_hash": new_hash,
        "last_checked": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    _save_state(state)

    return changed, content, dict(resp.headers)


def _touch_checked(state: dict, source_name: str) -> None:
    entry = state.get(source_name, {})
    entry["last_checked"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    state[source_name] = entry
    _save_state(state)


def get_source_state(source_name: str) -> dict:
    return _load_state().get(source_name, {})


def get_all_states() -> dict:
    return _load_state()
