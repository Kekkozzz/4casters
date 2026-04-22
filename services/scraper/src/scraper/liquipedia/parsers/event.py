"""Parse a Liquipedia {{Infobox league}} into a typed event record."""

from __future__ import annotations

from datetime import date

from pydantic import BaseModel, Field

from ._common import (
    clean_value,
    extract_infobox_body,
    parse_optional_date,
    split_infobox_fields,
)


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


def parse_event(wikitext: str, *, slug: str, liquipedia_url: str) -> ParsedEvent:
    body = extract_infobox_body(wikitext, "Infobox league")
    if body is None:
        raise EventParseError("no {{Infobox league}} template found in wikitext")
    fields = split_infobox_fields(body)

    name = clean_value(fields.get("name", ""))
    if not name:
        raise EventParseError("Infobox league is missing required 'name' field")

    start_raw = fields.get("start_date") or fields.get("sdate")
    if not start_raw:
        raise EventParseError("Infobox league is missing required 'start_date' field")
    try:
        start_date = parse_optional_date(start_raw)
    except ValueError as exc:
        raise EventParseError(str(exc)) from exc
    if start_date is None:
        raise EventParseError(f"start_date cannot be TBD (got {start_raw!r})")

    end_raw = fields.get("end_date") or fields.get("edate") or ""
    try:
        end_date = parse_optional_date(end_raw) if end_raw else None
    except ValueError as exc:
        raise EventParseError(str(exc)) from exc

    return ParsedEvent(
        id=slug,
        name=name,
        tier=(clean_value(fields.get("liquipediatier", "")) or None),
        tier_type=(clean_value(fields.get("liquipediatiertype", "")) or None),
        region=(clean_value(fields.get("region", "")) or None),
        start_date=start_date,
        end_date=end_date,
        liquipedia_url=liquipedia_url,
    )
