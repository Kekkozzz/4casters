"""End-to-end stats refresh pipeline tests."""

from __future__ import annotations

import json
from datetime import date
from pathlib import Path
from typing import Any

import pytest

from scraper.db.repo import LiquipediaRepo
from scraper.liquipedia.parsers.event import ParsedEvent
from scraper.pipeline_stats import refresh_event_stats

FIXTURES = Path(__file__).parent / "fixtures"


class FakeClient:
    def __init__(
        self,
        *,
        group_payload: dict[str, Any] | None = None,
        search_results: list[dict[str, Any]] | None = None,
    ) -> None:
        self._group_payload = group_payload or {}
        self._search_results = search_results or []
        self.get_group_calls: list[str] = []
        self.search_calls: list[dict[str, Any]] = []

    async def get_group(self, group_id: str) -> dict[str, Any]:
        self.get_group_calls.append(group_id)
        if self._group_payload.get("id") == group_id or "id" not in self._group_payload:
            return self._group_payload
        return self._group_payload

    async def search_groups(self, **kwargs: Any) -> list[dict[str, Any]]:
        self.search_calls.append(kwargs)
        return self._search_results


class FakeConn:
    def __init__(self, fetchrow_return: Any = None) -> None:
        self.executed: list[tuple[str, tuple[Any, ...]]] = []
        self.fetchrow_return = fetchrow_return

    async def execute(self, query: str, *args: Any) -> Any:
        self.executed.append((query, args))
        return "OK"

    async def fetchrow(self, query: str, *args: Any) -> Any:
        return self.fetchrow_return


class FakeLookup:
    def __init__(
        self,
        *,
        event: ParsedEvent | None,
        players: dict[str, str],
        teams: dict[str, str],
    ) -> None:
        self._event = event
        self._players = players
        self._teams = teams

    async def fetch_event(self, slug: str) -> ParsedEvent | None:
        return self._event

    async def fetch_player_name_slug_map(self, slug: str) -> dict[str, str]:
        return self._players

    async def fetch_team_name_slug_map(self, slug: str) -> dict[str, str]:
        return self._teams


def _event() -> ParsedEvent:
    return ParsedEvent(
        id="RLCS_2026/Major_1",
        name="RLCS 2026 Major 1 EU",
        tier="1",
        tier_type="Major",
        region=None,
        start_date=date(2026, 3, 14),
        end_date=date(2026, 3, 22),
        liquipedia_url="https://liquipedia.net/rocketleague/RLCS_2026/Major_1",
    )


def _group_payload() -> dict[str, Any]:
    return json.loads(
        (FIXTURES / "ballchasing_group_rlcs_major_1.json").read_text()
    )


@pytest.mark.asyncio
async def test_refresh_auto_links_and_upserts_stats() -> None:
    group = _group_payload()
    client = FakeClient(
        group_payload=group,
        search_results=[
            {"id": group["id"], "name": group["name"], "created": "2026-03-14T00:00:00Z"}
        ],
    )
    conn = FakeConn(fetchrow_return=None)  # no existing link
    repo = LiquipediaRepo(conn)
    lookup = FakeLookup(
        event=_event(),
        players={"itachi": "itachi", "Vatira": "Vatira"},
        teams={"Halcyon Esports": "Halcyon_Esports"},
    )

    report = await refresh_event_stats(
        "RLCS_2026/Major_1", client=client, repo=repo, lookup=lookup
    )

    assert report.group_id == group["id"]
    assert report.linked_via == "auto"
    assert report.player_stats_written == 2
    assert report.team_stats_written == 1
    assert report.errors == []


@pytest.mark.asyncio
async def test_refresh_uses_existing_group_link() -> None:
    group = _group_payload()
    client = FakeClient(group_payload=group)
    conn = FakeConn(fetchrow_return={"ballchasing_group_id": group["id"]})
    repo = LiquipediaRepo(conn)
    lookup = FakeLookup(
        event=_event(),
        players={"itachi": "itachi"},
        teams={"Halcyon Esports": "Halcyon_Esports"},
    )

    report = await refresh_event_stats(
        "RLCS_2026/Major_1", client=client, repo=repo, lookup=lookup
    )

    assert report.linked_via == "existing"
    # search should NOT have been called when we have an existing link
    assert client.search_calls == []


@pytest.mark.asyncio
async def test_refresh_errors_when_event_not_in_db() -> None:
    client = FakeClient()
    repo = LiquipediaRepo(FakeConn())
    lookup = FakeLookup(event=None, players={}, teams={})

    report = await refresh_event_stats(
        "Unknown", client=client, repo=repo, lookup=lookup
    )

    assert report.group_id is None
    assert any("not in DB" in e for e in report.errors)


@pytest.mark.asyncio
async def test_refresh_errors_when_no_group_matches() -> None:
    client = FakeClient(search_results=[])
    conn = FakeConn(fetchrow_return=None)
    repo = LiquipediaRepo(conn)
    lookup = FakeLookup(
        event=_event(),
        players={"itachi": "itachi"},
        teams={"Halcyon Esports": "Halcyon_Esports"},
    )

    report = await refresh_event_stats(
        "RLCS_2026/Major_1", client=client, repo=repo, lookup=lookup
    )

    assert report.group_id is None
    assert any("link manually" in e for e in report.errors)


@pytest.mark.asyncio
async def test_refresh_surfaces_unmapped_names() -> None:
    group = _group_payload()
    client = FakeClient(group_payload=group)
    conn = FakeConn(fetchrow_return={"ballchasing_group_id": group["id"]})
    repo = LiquipediaRepo(conn)
    lookup = FakeLookup(
        event=_event(),
        players={"itachi": "itachi"},  # Vatira unmapped
        teams={},  # Halcyon unmapped
    )

    report = await refresh_event_stats(
        "RLCS_2026/Major_1", client=client, repo=repo, lookup=lookup
    )

    assert "Vatira" in report.unmapped_players
    assert "Halcyon Esports" in report.unmapped_teams
    assert report.player_stats_written == 1
    assert report.team_stats_written == 0
