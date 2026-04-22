"""Tests for the Liquipedia Infobox-player parser."""

from __future__ import annotations

from pathlib import Path

import pytest

from scraper.liquipedia.parsers.player import PlayerParseError, parse_player

FIXTURES = Path(__file__).parent / "fixtures"


def _load(name: str) -> str:
    return (FIXTURES / name).read_text(encoding="utf-8")


def test_parses_player_fixture() -> None:
    player = parse_player(
        _load("player_itachi.wikitext"),
        slug="itachi",
        liquipedia_url="https://liquipedia.net/rocketleague/itachi",
    )
    assert player.id == "itachi"
    assert player.name == "Noah Grünefeld"
    assert player.nationality == "Germany"
    assert player.current_team_id == "Halcyon_Esports"


def test_falls_back_to_team_when_no_team_link() -> None:
    wikitext = (
        "{{Infobox player\n"
        "|id=drop\n|name=Axel Van Remoortere\n|nationality=Belgium\n"
        "|team=The Ghost Org\n}}"
    )
    player = parse_player(
        wikitext,
        slug="drop",
        liquipedia_url="https://liquipedia.net/rocketleague/drop",
    )
    # No explicit team_link -> use the team name normalized into a slug.
    assert player.current_team_id == "The_Ghost_Org"


def test_team_retired_returns_null_team() -> None:
    wikitext = (
        "{{Infobox player\n|id=oldie\n|name=Old Player\n"
        "|nationality=France\n|team=Retired\n}}"
    )
    player = parse_player(
        wikitext,
        slug="oldie",
        liquipedia_url="https://liquipedia.net/rocketleague/oldie",
    )
    assert player.current_team_id is None


def test_missing_infobox_raises() -> None:
    with pytest.raises(PlayerParseError, match="Infobox player"):
        parse_player(
            "no template",
            slug="x",
            liquipedia_url="https://liquipedia.net/rocketleague/x",
        )


def test_missing_name_raises() -> None:
    with pytest.raises(PlayerParseError, match="name"):
        parse_player(
            "{{Infobox player\n|id=x\n|nationality=France\n}}",
            slug="x",
            liquipedia_url="https://liquipedia.net/rocketleague/x",
        )
