"""
Registry of EV policy sources to monitor.
"""
from typing import TypedDict, List


class PolicySource(TypedDict):
    name: str
    url: str
    jurisdiction: str
    jurisdiction_type: str
    tags: list
    check_interval_hours: int


SOURCES: List[PolicySource] = [
    {
        "name": "FAME II — MHI Portal",
        "url": "https://fame2.heavyindustries.gov.in/",
        "jurisdiction": "India (National)",
        "jurisdiction_type": "national_india",
        "tags": ["fame", "subsidy", "national"],
        "check_interval_hours": 24,
    },
    {
        "name": "Delhi EV Policy Portal",
        "url": "https://ev.delhi.gov.in/",
        "jurisdiction": "Delhi",
        "jurisdiction_type": "indian_ut",
        "tags": ["delhi", "ev-policy", "subsidy"],
        "check_interval_hours": 24,
    },
    {
        "name": "Maharashtra EV — MAHA EV",
        "url": "https://www.mahaevha.org/",
        "jurisdiction": "Maharashtra",
        "jurisdiction_type": "indian_state",
        "tags": ["maharashtra", "ev-policy", "subsidy"],
        "check_interval_hours": 48,
    },
    {
        "name": "Karnataka EV Policy — KREDL",
        "url": "https://kredl.kar.nic.in/",
        "jurisdiction": "Karnataka",
        "jurisdiction_type": "indian_state",
        "tags": ["karnataka", "ev-policy"],
        "check_interval_hours": 48,
    },
    {
        "name": "Rajasthan Energy Department",
        "url": "https://energy.rajasthan.gov.in/",
        "jurisdiction": "Rajasthan",
        "jurisdiction_type": "indian_state",
        "tags": ["rajasthan", "ev-policy"],
        "check_interval_hours": 48,
    },
    {
        "name": "Gujarat EV Policy — GEB",
        "url": "https://guj-epd.gujarat.gov.in/",
        "jurisdiction": "Gujarat",
        "jurisdiction_type": "indian_state",
        "tags": ["gujarat", "ev-policy", "subsidy"],
        "check_interval_hours": 48,
    },
    {
        "name": "Tamil Nadu EV Policy — TEDA",
        "url": "https://teda.in/",
        "jurisdiction": "Tamil Nadu",
        "jurisdiction_type": "indian_state",
        "tags": ["tamil-nadu", "ev-policy"],
        "check_interval_hours": 48,
    },
    {
        "name": "Uttar Pradesh EV Policy",
        "url": "https://upevpolicy.in/",
        "jurisdiction": "Uttar Pradesh",
        "jurisdiction_type": "indian_state",
        "tags": ["uttar-pradesh", "ev-policy", "subsidy"],
        "check_interval_hours": 48,
    },
]
