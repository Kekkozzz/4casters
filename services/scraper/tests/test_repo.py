"""Unit tests for LiquipediaRepo against a fake executor."""

from __future__ import annotations

from datetime import UTC, date, datetime
from typing import Any

import pytest

from scraper.db.repo import LiquipediaRepo
from scraper.liquipedia.parsers.event import ParsedEvent
from scraper.liquipedia.parsers.match import ParsedMatch
from scraper.liquipedia.parsers.player import ParsedPlayer
from scraper.liquipedia.parsers.team import ParsedRosterEntry, ParsedTeam


class FakeConn:
    def __init__(self) -> None:
        self.calls: list[tuple[str, tuple[Any, ...]]] = []

    async def execute(self, query: str, *args: Any) -> Any:
        self.calls.append((query, args))
        return "OK"


@pytest.mark.asyncio
async def test_upsert_team_binds_params_in_order() -> None:
    conn = FakeConn()
    repo = LiquipediaRepo(conn)
    await repo.upsert_team(
        ParsedTeam(
            id="Halcyon_Esports",
            name="Halcyon Esports",
            short="HCN",
            region="Europe",
            liquipedia_url="https://liquipedia.net/rocketleague/Halcyon_Esports",
        )
    )
    assert len(conn.calls) == 1
    query, args = conn.calls[0]
    assert "INSERT INTO teams" in query
    assert "ON CONFLICT (id) DO UPDATE" in query
    assert args == (
        "Halcyon_Esports",
        "Halcyon Esports",
        "HCN",
        "Europe",
        "https://liquipedia.net/rocketleague/Halcyon_Esports",
    )


@pytest.mark.asyncio
async def test_upsert_player_handles_null_team() -> None:
    conn = FakeConn()
    repo = LiquipediaRepo(conn)
    await repo.upsert_player(
        ParsedPlayer(
            id="oldie",
            name="Old Player",
            nationality="France",
            current_team_id=None,
            liquipedia_url="https://liquipedia.net/rocketleague/oldie",
        )
    )
    _, args = conn.calls[0]
    assert args[3] is None


@pytest.mark.asyncio
async def test_upsert_event_passes_dates() -> None:
    conn = FakeConn()
    repo = LiquipediaRepo(conn)
    await repo.upsert_event(
        ParsedEvent(
            id="RLCS_2026/Major_1",
            name="RLCS 2026 Major 1",
            tier="1",
            tier_type="Major",
            region=None,
            start_date=date(2026, 3, 14),
            end_date=date(2026, 3, 22),
            liquipedia_url="https://liquipedia.net/rocketleague/RLCS_2026/Major_1",
        )
    )
    _, args = conn.calls[0]
    assert args[4] == date(2026, 3, 14)
    assert args[5] == date(2026, 3, 22)


@pytest.mark.asyncio
async def test_upsert_match_full_payload() -> None:
    conn = FakeConn()
    repo = LiquipediaRepo(conn)
    await repo.upsert_match(
        ParsedMatch(
            id="RLCS_2026/Major_1:QF:Halcyon_Esports-vs-Verdant_GG",
            event_id="RLCS_2026/Major_1",
            team_a_id="Halcyon_Esports",
            team_b_id="Verdant_GG",
            scheduled_at=datetime(2026, 3, 20, 18, 0, tzinfo=UTC),
            stage="Quarterfinal 1",
            format="Bo5",
            score_a=3,
            score_b=2,
            liquipedia_url=None,
        )
    )
    _, args = conn.calls[0]
    assert args[0] == "RLCS_2026/Major_1:QF:Halcyon_Esports-vs-Verdant_GG"
    assert args[7] == 3
    assert args[8] == 2


@pytest.mark.asyncio
async def test_upsert_roster_skips_when_start_date_missing() -> None:
    conn = FakeConn()
    repo = LiquipediaRepo(conn)
    written = await repo.upsert_roster_entry(
        ParsedRosterEntry(
            player_id="itachi",
            team_id="Halcyon_Esports",
            role="Captain",
            start_date=None,
            end_date=None,
            source_url="https://liquipedia.net/rocketleague/Halcyon_Esports",
        )
    )
    assert written == 0
    assert conn.calls == []


@pytest.mark.asyncio
async def test_upsert_roster_writes_valid_entry() -> None:
    conn = FakeConn()
    repo = LiquipediaRepo(conn)
    written = await repo.upsert_roster_entry(
        ParsedRosterEntry(
            player_id="itachi",
            team_id="Halcyon_Esports",
            role="Captain",
            start_date=date(2024, 8, 1),
            end_date=None,
            source_url="https://liquipedia.net/rocketleague/Halcyon_Esports",
        )
    )
    assert written == 1
    query, args = conn.calls[0]
    assert "INSERT INTO roster_history" in query
    assert args[2] == date(2024, 8, 1)
    assert args[3] is None
