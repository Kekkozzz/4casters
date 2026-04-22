"""Tests for the match-list parser (MatchList/Match templates)."""

from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path

import pytest

from scraper.liquipedia.parsers.match import MatchParseError, parse_matches

FIXTURES = Path(__file__).parent / "fixtures"


def _load(name: str) -> str:
    return (FIXTURES / name).read_text(encoding="utf-8")


def test_parses_all_matches_from_fixture() -> None:
    matches = parse_matches(
        _load("event_matches_sample.wikitext"),
        event_slug="RLCS_2026/Major_1",
    )
    assert len(matches) == 3

    first = matches[0]
    assert first.event_id == "RLCS_2026/Major_1"
    assert first.team_a_id == "Halcyon_Esports"
    assert first.team_b_id == "Verdant_GG"
    assert first.format == "Bo5"
    assert first.score_a == 3
    assert first.score_b == 2
    assert first.scheduled_at is not None
    assert first.scheduled_at.year == 2026
    assert first.scheduled_at.month == 3
    assert first.scheduled_at.day == 20

    second = matches[1]
    assert second.team_a_id == "Northbyte"
    assert second.team_b_id == "Mirage"
    assert second.score_a is None
    assert second.score_b is None


def test_scheduled_at_is_timezone_aware() -> None:
    matches = parse_matches(
        _load("event_matches_sample.wikitext"),
        event_slug="RLCS_2026/Major_1",
    )
    for m in matches:
        assert m.scheduled_at is None or m.scheduled_at.tzinfo is not None


def test_match_id_is_stable_and_unique() -> None:
    matches = parse_matches(
        _load("event_matches_sample.wikitext"),
        event_slug="RLCS_2026/Major_1",
    )
    ids = [m.id for m in matches]
    assert len(set(ids)) == len(ids)
    assert all(m.id.startswith("RLCS_2026/Major_1:") for m in matches)


def test_match_without_two_opponents_is_skipped() -> None:
    wikitext = (
        "{{MatchList|id=s|title=Stub|bestof=3\n"
        "|match1={{Match\n"
        "|opponent1={{TeamOpponent|Solo|score=}}\n"
        "|date=2026-05-01 12:00 CET\n"
        "}}\n"
        "}}"
    )
    matches = parse_matches(wikitext, event_slug="Stub_Event")
    assert matches == []


def test_invalid_date_raises() -> None:
    wikitext = (
        "{{MatchList|id=s|title=Stub|bestof=3\n"
        "|match1={{Match\n"
        "|opponent1={{TeamOpponent|A|score=}}\n"
        "|opponent2={{TeamOpponent|B|score=}}\n"
        "|date=nonsense\n"
        "}}\n"
        "}}"
    )
    with pytest.raises(MatchParseError, match="date"):
        parse_matches(wikitext, event_slug="Stub_Event")


def test_uses_utc_when_timezone_missing() -> None:
    wikitext = (
        "{{MatchList|id=s|title=Stub|bestof=3\n"
        "|match1={{Match\n"
        "|opponent1={{TeamOpponent|A|score=}}\n"
        "|opponent2={{TeamOpponent|B|score=}}\n"
        "|date=2026-05-01 12:00\n"
        "}}\n"
        "}}"
    )
    matches = parse_matches(wikitext, event_slug="Stub_Event")
    assert matches[0].scheduled_at == datetime(2026, 5, 1, 12, 0, tzinfo=UTC)
