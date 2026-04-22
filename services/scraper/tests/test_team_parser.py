"""Tests for the team + roster parser (Infobox team + SquadPlayer templates)."""

from __future__ import annotations

from datetime import date
from pathlib import Path

import pytest

from scraper.liquipedia.parsers.team import TeamParseError, parse_team

FIXTURES = Path(__file__).parent / "fixtures"


def _load(name: str) -> str:
    return (FIXTURES / name).read_text(encoding="utf-8")


def test_parses_team_header() -> None:
    wikitext = _load("team_halcyon_esports.wikitext")
    result = parse_team(
        wikitext,
        slug="Halcyon_Esports",
        liquipedia_url="https://liquipedia.net/rocketleague/Halcyon_Esports",
    )
    team = result.team
    assert team.id == "Halcyon_Esports"
    assert team.name == "Halcyon Esports"
    assert team.short == "HCN"
    assert team.region == "Europe"


def test_parses_active_and_former_roster() -> None:
    wikitext = _load("team_halcyon_esports.wikitext")
    result = parse_team(
        wikitext,
        slug="Halcyon_Esports",
        liquipedia_url="https://liquipedia.net/rocketleague/Halcyon_Esports",
    )
    by_player = {entry.player_id: entry for entry in result.roster}
    assert set(by_player) == {"itachi", "Seikoo", "Vatira", "drop", "Atomic"}

    itachi = by_player["itachi"]
    assert itachi.team_id == "Halcyon_Esports"
    assert itachi.role == "Captain"
    assert itachi.start_date == date(2024, 8, 1)
    assert itachi.end_date is None

    former = by_player["Atomic"]
    assert former.end_date == date(2024, 7, 31)
    assert former.start_date == date(2023, 9, 1)


def test_missing_infobox_raises() -> None:
    with pytest.raises(TeamParseError, match="Infobox team"):
        parse_team(
            "no template",
            slug="X",
            liquipedia_url="https://liquipedia.net/rocketleague/X",
        )


def test_missing_name_raises() -> None:
    with pytest.raises(TeamParseError, match="name"):
        parse_team(
            "{{Infobox team\n|shortname=X\n}}",
            slug="X",
            liquipedia_url="https://liquipedia.net/rocketleague/X",
        )


def test_team_without_roster_returns_empty_list() -> None:
    wikitext = (
        "{{Infobox team\n"
        "|name=Ghost Org\n"
        "|shortname=GST\n"
        "|region=North America\n"
        "}}\n"
        "No roster here at all."
    )
    result = parse_team(
        wikitext,
        slug="Ghost_Org",
        liquipedia_url="https://liquipedia.net/rocketleague/Ghost_Org",
    )
    assert result.team.name == "Ghost Org"
    assert result.roster == []


def test_skips_squadplayer_without_id() -> None:
    wikitext = (
        "{{Infobox team\n|name=T\n}}\n"
        "{{squad2\n"
        "|player1={{SquadPlayer|name=Unknown|join=2025-01-01|leave=}}\n"
        "|player2={{SquadPlayer|id=real|name=Real|join=2025-01-01|leave=}}\n"
        "}}"
    )
    result = parse_team(
        wikitext,
        slug="T",
        liquipedia_url="https://liquipedia.net/rocketleague/T",
    )
    assert [e.player_id for e in result.roster] == ["real"]
