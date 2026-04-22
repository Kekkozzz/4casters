"""Parse a Liquipedia {{Infobox league}} into a typed event record.

We deliberately do NOT use a full mwparserfromhell here — Liquipedia's
Infobox syntax in Rocket League is regular enough that a targeted regex
+ field splitter keeps the dependency surface small and the failure mode
obvious. If/when we hit a template we cannot handle, we fail loudly via
EventParseError so the ingestion job stops instead of writing garbage.
"""

from __future__ import annotations

import re
from datetime import date, datetime
from typing import Final

from pydantic import BaseModel, Field


class EventParseError(ValueError):
    """Raised when the wikitext does not conform to the expected infobox shape."""


class ParsedEvent(BaseModel):
    id: str
    name: str
    tier: str | None = None
    tier_type: str | None = None
    region: str | None = None
    start_date: date
    end_date: date | None = None
    liquipedia_url: str = Field(..., min_length=1)


_INFOBOX_RE: Final = re.compile(
    r"\{\{\s*Infobox\s+league\s*\n(?P<body>.*?)\n\}\}",
    re.IGNORECASE | re.DOTALL,
)
_WIKILINK_RE: Final = re.compile(r"\[\[(?:[^|\]]*\|)?([^\]]+)\]\]")
_TBD_VALUES: Final = frozenset({"", "tbd", "tba", "n/a", "?", "unknown"})


def _extract_fields(body: str) -> dict[str, str]:
    """Split an Infobox body into a {key: value} dict."""
    fields: dict[str, str] = {}
    current_key: str | None = None
    buffer: list[str] = []

    def flush() -> None:
        if current_key is not None:
            fields[current_key] = "\n".join(buffer).strip()

    for raw_line in body.splitlines():
        line = raw_line.rstrip()
        if line.startswith("|") and "=" in line:
            flush()
            key, _, value = line[1:].partition("=")
            current_key = key.strip().lower()
            buffer = [value.strip()]
        else:
            buffer.append(line.strip())
    flush()
    return fields


def _clean(value: str) -> str:
    """Strip wikilinks and collapse whitespace."""
    value = _WIKILINK_RE.sub(lambda m: m.group(1), value)
    value = re.sub(r"<!--.*?-->", "", value, flags=re.DOTALL)
    return value.strip()


def _parse_date(raw: str) -> date | None:
    value = _clean(raw).lower()
    if value in _TBD_VALUES:
        return None
    for fmt in ("%Y-%m-%d", "%Y/%m/%d", "%B %d, %Y"):
        try:
            return datetime.strptime(_clean(raw), fmt).date()
        except ValueError:
            continue
    raise EventParseError(f"could not parse date {raw!r}")


def parse_event(wikitext: str, *, slug: str, liquipedia_url: str) -> ParsedEvent:
    match = _INFOBOX_RE.search(wikitext)
    if not match:
        raise EventParseError("no {{Infobox league}} template found in wikitext")
    fields = _extract_fields(match.group("body"))

    name = _clean(fields.get("name", ""))
    if not name:
        raise EventParseError("Infobox league is missing required 'name' field")

    start_raw = fields.get("start_date") or fields.get("sdate")
    if not start_raw:
        raise EventParseError("Infobox league is missing required 'start_date' field")
    start_date = _parse_date(start_raw)
    if start_date is None:
        raise EventParseError(f"start_date cannot be TBD (got {start_raw!r})")

    end_raw = fields.get("end_date") or fields.get("edate") or ""
    end_date = _parse_date(end_raw) if end_raw else None

    tier = _clean(fields.get("liquipediatier", "")) or None
    tier_type = _clean(fields.get("liquipediatiertype", "")) or None
    region = _clean(fields.get("region", "")) or None

    return ParsedEvent(
        id=slug,
        name=name,
        tier=tier,
        tier_type=tier_type,
        region=region,
        start_date=start_date,
        end_date=end_date,
        liquipedia_url=liquipedia_url,
    )
