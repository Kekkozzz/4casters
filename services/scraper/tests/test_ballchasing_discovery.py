"""Tests for fuzzy event->group matching on ballchasing."""

from __future__ import annotations

from datetime import date
from typing import Any

import pytest

from scraper.ballchasing.discovery import GroupMatch, find_group_for_event
from scraper.liquipedia.parsers.event import ParsedEvent


def _event(**overrides: Any) -> ParsedEvent:
    defaults: dict[str, Any] = dict(
        id="RLCS_2026/Major_1",
        name="RLCS 2026 Major 1",
        tier="1",
        tier_type="Major",
        region=None,
        start_date=date(2026, 3, 14),
        end_date=date(2026, 3, 22),
        liquipedia_url="https://liquipedia.net/rocketleague/RLCS_2026/Major_1",
    )
    defaults.update(overrides)
    return ParsedEvent(**defaults)


class FakeClient:
    def __init__(self, groups: list[dict[str, Any]]) -> None:
        self._groups = groups
        self.searches: list[dict[str, Any]] = []

    async def search_groups(
        self,
        *,
        name: str | None = None,
        created_after: str | None = None,
        created_before: str | None = None,
        count: int = 25,
    ) -> list[dict[str, Any]]:
        self.searches.append(
            {
                "name": name,
                "created_after": created_after,
                "created_before": created_before,
            }
        )
        return self._groups


@pytest.mark.asyncio
async def test_returns_exact_name_match_high_confidence() -> None:
    client = FakeClient(
        groups=[
            {"id": "a", "name": "RLCS 2026 Major 1", "created": "2026-03-10T00:00:00Z"},
            {"id": "b", "name": "RLCS 2025 Fall Major", "created": "2025-10-01T00:00:00Z"},
        ]
    )
    result = await find_group_for_event(_event(), client=client)
    assert isinstance(result, GroupMatch)
    assert result.group_id == "a"
    assert result.confidence >= 0.9


@pytest.mark.asyncio
async def test_prefers_group_created_near_event_start() -> None:
    client = FakeClient(
        groups=[
            # Same name, wrong year (confusable)
            {"id": "old", "name": "RLCS 2026 Major 1", "created": "2023-03-10T00:00:00Z"},
            # Same name, near event date
            {"id": "correct", "name": "RLCS 2026 Major 1", "created": "2026-03-12T00:00:00Z"},
        ]
    )
    result = await find_group_for_event(_event(), client=client)
    assert result is not None
    assert result.group_id == "correct"


@pytest.mark.asyncio
async def test_returns_none_when_no_group_matches_date_window() -> None:
    client = FakeClient(
        groups=[
            {"id": "x", "name": "Totally Unrelated Event", "created": "2024-01-01T00:00:00Z"},
        ]
    )
    result = await find_group_for_event(_event(), client=client)
    assert result is None


@pytest.mark.asyncio
async def test_returns_none_when_search_yields_nothing() -> None:
    client = FakeClient(groups=[])
    result = await find_group_for_event(_event(), client=client)
    assert result is None


@pytest.mark.asyncio
async def test_uses_event_window_as_search_bounds() -> None:
    client = FakeClient(groups=[])
    await find_group_for_event(_event(), client=client)
    assert len(client.searches) >= 1
    s = client.searches[0]
    assert s["created_after"] is not None
    assert s["created_before"] is not None
    # Window should surround the event dates (start_date - margin .. end_date + margin)
    assert s["created_after"] <= "2026-03-14"
    assert s["created_before"] >= "2026-03-22"


@pytest.mark.asyncio
async def test_confidence_below_threshold_returns_none() -> None:
    client = FakeClient(
        groups=[
            # Only vague word overlap
            {"id": "q", "name": "RLCS Qualifier EU", "created": "2026-03-15T00:00:00Z"},
        ]
    )
    result = await find_group_for_event(
        _event(name="RLCS 2026 Major 1 Tournament Finals"), client=client
    )
    # Name dissimilarity should drop confidence below accept threshold (0.6)
    assert result is None
