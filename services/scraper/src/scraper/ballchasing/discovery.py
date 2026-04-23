"""Fuzzy-match a Liquipedia event to a ballchasing group.

Ballchasing groups are user-created, so names drift. We score candidates
on two axes and require both to pass:

1. Name similarity (SequenceMatcher ratio) >= 0.6
2. Created date within event window ± MARGIN_DAYS

Score is the mean of the normalized name similarity and date proximity.
The highest-scoring candidate above the accept threshold wins; ties
are broken by name similarity.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta
from difflib import SequenceMatcher
from typing import Any, Protocol

from scraper.liquipedia.parsers.event import ParsedEvent

MARGIN_DAYS = 14
ACCEPT_THRESHOLD = 0.6
# Date proximity alone can't rescue a totally unrelated name — require a
# minimum baseline of name similarity before we consider a candidate.
MIN_NAME_SIMILARITY = 0.5


class _Searcher(Protocol):
    async def search_groups(
        self,
        *,
        name: str | None = None,
        created_after: str | None = None,
        created_before: str | None = None,
        count: int = 25,
    ) -> list[dict[str, Any]]: ...


@dataclass(frozen=True)
class GroupMatch:
    group_id: str
    group_name: str
    confidence: float  # 0..1


def _name_similarity(a: str, b: str) -> float:
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()


def _parse_iso_date(raw: str) -> date | None:
    try:
        return datetime.fromisoformat(raw.replace("Z", "+00:00")).date()
    except ValueError:
        return None


def _date_proximity(
    group_created: date, event_start: date, event_end: date
) -> float:
    """1.0 if created_within window, tapering to 0 at ±2 * MARGIN_DAYS outside."""
    if event_start <= group_created <= event_end:
        return 1.0
    if group_created < event_start:
        delta = (event_start - group_created).days
    else:
        delta = (group_created - event_end).days
    max_delta = MARGIN_DAYS * 2
    if delta >= max_delta:
        return 0.0
    return 1.0 - (delta / max_delta)


async def find_group_for_event(
    event: ParsedEvent, *, client: _Searcher
) -> GroupMatch | None:
    end_date = event.end_date or event.start_date
    # Ballchasing requires RFC3339 (with time + "Z"), not just a date.
    created_after = (
        (event.start_date - timedelta(days=MARGIN_DAYS)).isoformat()
        + "T00:00:00Z"
    )
    created_before = (
        (end_date + timedelta(days=MARGIN_DAYS)).isoformat() + "T23:59:59Z"
    )

    candidates = await client.search_groups(
        name=event.name,
        created_after=created_after,
        created_before=created_before,
    )
    if not candidates:
        return None

    best: GroupMatch | None = None
    for c in candidates:
        gid = c.get("id")
        gname = c.get("name", "")
        gcreated_raw = c.get("created", "")
        if not isinstance(gid, str) or not isinstance(gname, str):
            continue
        gcreated = _parse_iso_date(gcreated_raw) if isinstance(gcreated_raw, str) else None

        name_score = _name_similarity(event.name, gname)
        if name_score < MIN_NAME_SIMILARITY:
            continue
        if gcreated is None:
            date_score = 0.5  # unknown date: neutral
        else:
            date_score = _date_proximity(gcreated, event.start_date, end_date)

        confidence = (name_score + date_score) / 2
        if confidence < ACCEPT_THRESHOLD:
            continue
        if best is None or confidence > best.confidence:
            best = GroupMatch(
                group_id=gid, group_name=gname, confidence=confidence
            )

    return best
