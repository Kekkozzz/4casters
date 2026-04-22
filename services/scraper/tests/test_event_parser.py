"""Tests for the Liquipedia Infobox-league event parser."""

from __future__ import annotations

from datetime import date
from pathlib import Path

import pytest

from scraper.liquipedia.parsers.event import EventParseError, parse_event

FIXTURES = Path(__file__).parent / "fixtures"


def _load(name: str) -> str:
    return (FIXTURES / name).read_text(encoding="utf-8")


def test_parses_rlcs_major_fixture() -> None:
    wikitext = _load("event_rlcs_2026_major_1.wikitext")
    event = parse_event(
        wikitext,
        slug="RLCS_2026/Major_1",
        liquipedia_url="https://liquipedia.net/rocketleague/RLCS_2026/Major_1",
    )
    assert event.id == "RLCS_2026/Major_1"
    assert event.name == "RLCS 2026 Major 1"
    assert event.tier == "1"
    assert event.tier_type == "Major"
    assert event.start_date == date(2026, 3, 14)
    assert event.end_date == date(2026, 3, 22)
    assert event.liquipedia_url.endswith("RLCS_2026/Major_1")


def test_missing_infobox_raises() -> None:
    with pytest.raises(EventParseError, match="Infobox league"):
        parse_event(
            "no template here at all",
            slug="X",
            liquipedia_url="https://liquipedia.net/rocketleague/X",
        )


def test_missing_required_field_raises() -> None:
    wikitext = "{{Infobox league\n|name=Stub\n}}"
    with pytest.raises(EventParseError, match="start_date"):
        parse_event(
            wikitext,
            slug="Stub",
            liquipedia_url="https://liquipedia.net/rocketleague/Stub",
        )


def test_accepts_tbd_end_date() -> None:
    wikitext = (
        "{{Infobox league\n"
        "|name=Open Qualifier\n"
        "|start_date=2026-05-01\n"
        "|end_date=TBD\n"
        "|liquipediatier=3\n"
        "|liquipediatiertype=Qualifier\n"
        "}}"
    )
    event = parse_event(
        wikitext,
        slug="Open_Qualifier",
        liquipedia_url="https://liquipedia.net/rocketleague/Open_Qualifier",
    )
    assert event.start_date == date(2026, 5, 1)
    assert event.end_date is None
    assert event.tier == "3"


def test_strips_wikilinks_from_name_if_present() -> None:
    wikitext = (
        "{{Infobox league\n"
        "|name=[[RLCS 2026|RLCS 2026 Fall Open]]\n"
        "|start_date=2026-09-01\n"
        "|end_date=2026-09-10\n"
        "|liquipediatier=2\n"
        "|liquipediatiertype=Regional\n"
        "}}"
    )
    event = parse_event(
        wikitext,
        slug="RLCS_2026/Fall/Open",
        liquipedia_url="https://liquipedia.net/rocketleague/RLCS_2026/Fall/Open",
    )
    assert event.name == "RLCS 2026 Fall Open"
