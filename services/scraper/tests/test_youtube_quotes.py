"""Tests for YouTube RSS discovery + transcript → ParsedQuote extraction."""

from __future__ import annotations

from pathlib import Path

import httpx
import pytest
import respx

from scraper.quotes.types import QuoteSource
from scraper.quotes.youtube import (
    ChannelConfig,
    TranscriptChunk,
    VideoMeta,
    parse_channel_feed,
    quotes_from_transcript,
    resolve_speaker_from_title,
)

FIXTURES = Path(__file__).parent / "fixtures"


def _load(name: str) -> str:
    return (FIXTURES / name).read_text(encoding="utf-8")


def test_parses_rss_feed_to_video_metas() -> None:
    videos = parse_channel_feed(_load("youtube_channel_liefx.xml"))
    assert [v.video_id for v in videos] == ["abc12345678", "def12345678", "ghi12345678"]
    assert videos[0].title.startswith("RLCS Recap")
    assert all(isinstance(v, VideoMeta) for v in videos)
    assert videos[0].published.year == 2026


def test_channel_strategy_attributes_all_quotes_to_single_player() -> None:
    config = ChannelConfig(
        channel_id="UCL6JmiMXKoXS6bpP1D3bk8g",
        strategy="channel",
        default_speaker_id="Liefx",
    )
    video = VideoMeta(
        video_id="abc12345678",
        title="Random Liefx take",
        published=None,
    )
    chunks = [
        TranscriptChunk(text="Mechanics are overrated without teamwork.", start_seconds=30),
        TranscriptChunk(text="Halcyon are the team to beat this Major.", start_seconds=120),
    ]
    quotes = quotes_from_transcript(config, video, chunks)
    assert len(quotes) == 2
    assert {q.speaker_id for q in quotes} == {"Liefx"}
    assert quotes[0].source_url == "https://youtu.be/abc12345678?t=30"
    assert quotes[1].source_url == "https://youtu.be/abc12345678?t=120"
    assert all(q.source_type == QuoteSource.YOUTUBE for q in quotes)


def test_title_strategy_attributes_by_player_alias() -> None:
    config = ChannelConfig(
        channel_id="RLCS_OFFICIAL",
        strategy="title",
        aliases={"itachi": "itachi", "vatira": "Vatira"},
    )
    video = VideoMeta(
        video_id="def12345678",
        title="RLCS Interview: itachi after Halcyon's 3-0 win",
        published=None,
    )
    chunks = [
        TranscriptChunk(text="We played for each other tonight.", start_seconds=12),
    ]
    quotes = quotes_from_transcript(config, video, chunks)
    assert quotes[0].speaker_id == "itachi"


def test_title_strategy_drops_quotes_when_no_alias_match() -> None:
    config = ChannelConfig(
        channel_id="RLCS_OFFICIAL",
        strategy="title",
        aliases={"itachi": "itachi"},
    )
    video = VideoMeta(
        video_id="ghi12345678",
        title="RLCS Weekly Power Rankings",
        published=None,
    )
    chunks = [TranscriptChunk(text="Some commentary text.", start_seconds=5)]
    assert quotes_from_transcript(config, video, chunks) == []


def test_chunks_under_min_words_are_dropped() -> None:
    config = ChannelConfig(
        channel_id="c",
        strategy="channel",
        default_speaker_id="Liefx",
    )
    video = VideoMeta(video_id="x", title="x", published=None)
    chunks = [
        TranscriptChunk(text="Yeah.", start_seconds=0),
        TranscriptChunk(
            text="This is a long enough sentence to qualify as a quote.",
            start_seconds=5,
        ),
    ]
    quotes = quotes_from_transcript(config, video, chunks)
    assert len(quotes) == 1
    assert "long enough sentence" in quotes[0].text


def test_resolve_speaker_from_title_is_case_and_word_boundary_safe() -> None:
    aliases = {"itachi": "itachi", "vatira": "Vatira", "atomic": "Atomic"}
    # Word boundary: "itachi's" still hits.
    assert (
        resolve_speaker_from_title("Interview: itachi's post-match", aliases)
        == "itachi"
    )
    # No false positive inside "atomically" — word boundary rules should prevent it.
    assert resolve_speaker_from_title("Atomically destroyed", aliases) is None
    # Case-insensitive.
    assert resolve_speaker_from_title("ITACHI vs VATIRA", aliases) == "itachi"


def test_channel_config_requires_consistent_strategy_fields() -> None:
    with pytest.raises(ValueError, match="default_speaker_id"):
        ChannelConfig(channel_id="c", strategy="channel")
    with pytest.raises(ValueError, match="aliases"):
        ChannelConfig(channel_id="c", strategy="title")


@pytest.mark.asyncio
@respx.mock
async def test_fetch_channel_feed_http_uses_rss_endpoint() -> None:
    from scraper.quotes.youtube import fetch_channel_feed

    respx.get("https://www.youtube.com/feeds/videos.xml").mock(
        return_value=httpx.Response(200, text=_load("youtube_channel_liefx.xml"))
    )
    videos = await fetch_channel_feed("UCL6JmiMXKoXS6bpP1D3bk8g")
    assert len(videos) == 3
    assert videos[0].video_id == "abc12345678"
