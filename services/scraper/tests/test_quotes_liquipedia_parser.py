"""Tests for the Liquipedia player-page Quotes-section parser."""

from __future__ import annotations

from pathlib import Path

import pytest

from scraper.quotes.liquipedia_parser import QuotesParseError, parse_quotes_from_player
from scraper.quotes.types import QuoteSource

FIXTURES = Path(__file__).parent / "fixtures"


def _load(name: str) -> str:
    return (FIXTURES / name).read_text(encoding="utf-8")


def test_extracts_quote_templates() -> None:
    wikitext = _load("player_itachi_with_quotes.wikitext")
    quotes = parse_quotes_from_player(
        wikitext,
        speaker_id="itachi",
        liquipedia_url="https://liquipedia.net/rocketleague/itachi",
    )
    texts = [q.text for q in quotes]
    assert "We play for each other every single game." in texts
    assert "Mechanics are overrated without teamwork." in texts


def test_extracts_inline_quotes_with_em_dash_attribution() -> None:
    wikitext = _load("player_itachi_with_quotes.wikitext")
    quotes = parse_quotes_from_player(
        wikitext,
        speaker_id="itachi",
        liquipedia_url="https://liquipedia.net/rocketleague/itachi",
    )
    texts = [q.text for q in quotes]
    assert "I think we were the better team today." in texts


def test_every_quote_has_source_and_speaker() -> None:
    wikitext = _load("player_itachi_with_quotes.wikitext")
    quotes = parse_quotes_from_player(
        wikitext,
        speaker_id="itachi",
        liquipedia_url="https://liquipedia.net/rocketleague/itachi",
    )
    assert len(quotes) >= 3
    for q in quotes:
        assert q.speaker_id == "itachi"
        assert q.source_url.endswith("/itachi#Quotes")
        assert q.source_type == QuoteSource.LIQUIPEDIA


def test_returns_empty_when_no_quotes_section() -> None:
    wikitext = (
        "{{Infobox player\n|id=x\n|name=Player\n|nationality=France\n}}\n"
        "No quotes here."
    )
    quotes = parse_quotes_from_player(
        wikitext,
        speaker_id="x",
        liquipedia_url="https://liquipedia.net/rocketleague/x",
    )
    assert quotes == []


def test_deduplicates_within_single_page() -> None:
    wikitext = (
        "==Quotes==\n"
        "{{Quote|text=Same line repeated.|author=x|source=A}}\n"
        '"Same line repeated." — x, context B\n'
    )
    quotes = parse_quotes_from_player(
        wikitext,
        speaker_id="x",
        liquipedia_url="https://liquipedia.net/rocketleague/x",
    )
    assert len(quotes) == 1
    assert quotes[0].text == "Same line repeated."


def test_rejects_quote_with_empty_text() -> None:
    wikitext = "==Quotes==\n{{Quote|text=   |author=x|source=nowhere}}\n"
    quotes = parse_quotes_from_player(
        wikitext,
        speaker_id="x",
        liquipedia_url="https://liquipedia.net/rocketleague/x",
    )
    assert quotes == []


def test_raises_when_speaker_id_missing() -> None:
    with pytest.raises(QuotesParseError, match="speaker_id"):
        parse_quotes_from_player(
            "anything",
            speaker_id="",
            liquipedia_url="https://liquipedia.net/rocketleague/x",
        )
