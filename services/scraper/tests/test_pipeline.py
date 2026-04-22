"""End-to-end backfill pipeline tests with a fake LiquipediaClient."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import pytest

from scraper.db.repo import LiquipediaRepo
from scraper.liquipedia.client import LiquipediaNotFoundError
from scraper.pipeline import backfill_event

FIXTURES = Path(__file__).parent / "fixtures"


def _load(name: str) -> str:
    return (FIXTURES / name).read_text(encoding="utf-8")


class FakeClient:
    """Stand-in for LiquipediaClient: returns canned wikitext per page, or 404s."""

    def __init__(self, pages: dict[str, str]) -> None:
        self._pages = pages
        self.calls: list[str] = []

    async def get_wikitext(self, page: str) -> str:
        self.calls.append(page)
        if page not in self._pages:
            raise LiquipediaNotFoundError(f"no fake page for {page}")
        return self._pages[page]


class FakeConn:
    def __init__(self) -> None:
        self.statements: list[tuple[str, tuple[Any, ...]]] = []

    async def execute(self, query: str, *args: Any) -> Any:
        self.statements.append((query, args))
        return "OK"


@pytest.mark.asyncio
async def test_backfill_event_happy_path() -> None:
    event_wt = (
        _load("event_rlcs_2026_major_1.wikitext")
        + "\n"
        + _load("event_matches_sample.wikitext")
    )
    client = FakeClient(
        pages={
            "RLCS_2026/Major_1": event_wt,
            "Halcyon_Esports": _load("team_halcyon_esports.wikitext"),
            "Verdant_GG": (
                "{{Infobox team\n|name=Verdant GG\n|shortname=VRD\n"
                "|region=Europe\n}}"
            ),
            "Northbyte": "{{Infobox team\n|name=Northbyte\n|region=Europe\n}}",
            "Mirage": "{{Infobox team\n|name=Mirage\n|region=Europe\n}}",
            "itachi": _load("player_itachi.wikitext"),
            "Seikoo": (
                "{{Infobox player\n|id=Seikoo\n|name=Maello Ernst\n"
                "|nationality=France\n|team_link=Halcyon_Esports\n}}"
            ),
            "Vatira": (
                "{{Infobox player\n|id=Vatira\n|name=Alexandre Carré\n"
                "|nationality=France\n|team_link=Halcyon_Esports\n}}"
            ),
            "drop": (
                "{{Infobox player\n|id=drop\n|name=Axel Van Remoortere\n"
                "|nationality=Belgium\n|team_link=Halcyon_Esports\n}}"
            ),
            "Atomic": (
                "{{Infobox player\n|id=Atomic\n|name=Otto Schmidt\n"
                "|nationality=Sweden\n|team=Retired\n}}"
            ),
        }
    )
    conn = FakeConn()
    repo = LiquipediaRepo(conn)

    report = await backfill_event(
        "RLCS_2026/Major_1", client=client, repo=repo
    )

    assert report.event_written is True
    assert report.teams_written == 4
    assert report.matches_written == 3
    assert report.players_written == 5
    assert report.roster_entries_written == 5
    assert report.errors == []
    assert report.teams_skipped == []


@pytest.mark.asyncio
async def test_backfill_event_missing_event_returns_error() -> None:
    client = FakeClient(pages={})
    repo = LiquipediaRepo(FakeConn())
    report = await backfill_event("Nope", client=client, repo=repo)
    assert report.event_written is False
    assert any("not found" in e for e in report.errors)


@pytest.mark.asyncio
async def test_backfill_skips_team_missing_from_liquipedia() -> None:
    event_wt = (
        _load("event_rlcs_2026_major_1.wikitext")
        + "\n{{MatchList|id=m|title=QF|bestof=5\n"
        "|match1={{Match\n"
        "|opponent1={{TeamOpponent|Halcyon Esports|score=}}\n"
        "|opponent2={{TeamOpponent|Ghost Team|score=}}\n"
        "|date=2026-03-20 18:00 CET\n"
        "}}\n}}"
    )
    client = FakeClient(
        pages={
            "RLCS_2026/Major_1": event_wt,
            "Halcyon_Esports": _load("team_halcyon_esports.wikitext"),
            "itachi": _load("player_itachi.wikitext"),
            "Seikoo": (
                "{{Infobox player\n|id=Seikoo\n|name=x\n"
                "|team_link=Halcyon_Esports\n}}"
            ),
            "Vatira": (
                "{{Infobox player\n|id=Vatira\n|name=x\n"
                "|team_link=Halcyon_Esports\n}}"
            ),
            "drop": (
                "{{Infobox player\n|id=drop\n|name=x\n"
                "|team_link=Halcyon_Esports\n}}"
            ),
            "Atomic": (
                "{{Infobox player\n|id=Atomic\n|name=x\n|team=Retired\n}}"
            ),
            # Ghost_Team page intentionally missing.
        }
    )
    repo = LiquipediaRepo(FakeConn())

    report = await backfill_event(
        "RLCS_2026/Major_1", client=client, repo=repo
    )

    assert "Ghost_Team" in report.teams_skipped
    # The match referencing Ghost_Team must NOT be written (FK would fail).
    assert report.matches_written == 0
    assert report.event_written is True
