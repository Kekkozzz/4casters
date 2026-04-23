"""Tests for quote types: content_hash determinism + ParsedQuote validation."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from scraper.quotes.types import (
    ParsedQuote,
    QuoteSource,
    content_hash,
    normalize_quote_text,
)


def test_hash_is_deterministic() -> None:
    assert content_hash("hello world") == content_hash("hello world")


def test_hash_is_case_and_whitespace_insensitive() -> None:
    assert content_hash("Hello World") == content_hash("  hello   world  ")


def test_hash_collapses_smart_quotes_and_unicode() -> None:
    # Smart quotes, fullwidth letters, NBSP all collapse to the plain form.
    assert content_hash('"winning is everything"') == content_hash("winning is everything")
    assert content_hash("WINNING IS EVERYTHING") == content_hash(
        "winning is everything"
    )


def test_hash_differentiates_different_quotes() -> None:
    assert content_hash("we played well") != content_hash("they played well")


def test_normalize_does_not_modify_original_text() -> None:
    original = "  We CRUSHED them.  "
    normalized = normalize_quote_text(original)
    assert normalized == "we crushed them."
    assert original == "  We CRUSHED them.  "  # input untouched


def test_parsed_quote_requires_speaker_and_source() -> None:
    with pytest.raises(ValidationError):
        ParsedQuote(
            speaker_id="",
            text="hi",
            source_url="https://example.com",
            source_type=QuoteSource.LIQUIPEDIA,
        )
    with pytest.raises(ValidationError):
        ParsedQuote(
            speaker_id="x",
            text="hi",
            source_url="",
            source_type=QuoteSource.LIQUIPEDIA,
        )


def test_parsed_quote_hash_matches_content_hash() -> None:
    q = ParsedQuote(
        speaker_id="itachi",
        text="We play for each other.",
        source_url="https://liquipedia.net/rocketleague/itachi#Quotes",
        source_type=QuoteSource.LIQUIPEDIA,
    )
    assert q.hash == content_hash("We play for each other.")


def test_source_type_accepts_string_value() -> None:
    q = ParsedQuote(
        speaker_id="itachi",
        text="x",
        source_url="https://example.com",
        source_type="liquipedia",  # type: ignore[arg-type]
    )
    assert q.source_type == QuoteSource.LIQUIPEDIA
