"""End-to-end tests for the YouTube quote ingestion pipeline."""

from __future__ import annotations

from typing import Any

import pytest

from scraper.db.repo import LiquipediaRepo
from scraper.pipeline_youtube_quotes import ingest_youtube_quotes
from scraper.quotes.youtube import ChannelConfig, TranscriptChunk, VideoMeta
from scraper.quotes.youtube_transcripts import YoutubeTranscriptUnavailable


class FakeConn:
    def __init__(self) -> None:
        self.inserted: set[str] = set()

    async def execute(self, query: str, *args: Any) -> Any:
        return "OK"

    async def fetchrow(self, query: str, *args: Any) -> Any:
        if "INSERT INTO quotes" in query:
            hash_ = args[5]
            if hash_ in self.inserted:
                return None
            self.inserted.add(hash_)
            return {"id": f"u-{len(self.inserted)}"}
        return None


def _feed_fetcher(
    per_channel: dict[str, list[VideoMeta]],
) -> Any:
    async def fetch(channel_id: str) -> list[VideoMeta]:
        return per_channel.get(channel_id, [])

    return fetch


def _transcript_fetcher(
    per_video: dict[str, list[TranscriptChunk] | Exception],
) -> Any:
    async def fetch(video_id: str) -> list[TranscriptChunk]:
        value = per_video.get(video_id, [])
        if isinstance(value, Exception):
            raise value
        return value

    return fetch


@pytest.mark.asyncio
async def test_ingests_channel_strategy_end_to_end() -> None:
    configs = [
        ChannelConfig(
            channel_id="UC_liefx",
            strategy="channel",
            default_speaker_id="Liefx",
        ),
    ]
    feeds = {
        "UC_liefx": [
            VideoMeta(video_id="v1", title="Take 1", published=None),
            VideoMeta(video_id="v2", title="Take 2", published=None),
        ]
    }
    transcripts = {
        "v1": [
            TranscriptChunk(text="Halcyon are the team to beat this Major.", start_seconds=0),
            TranscriptChunk(text="Short.", start_seconds=20),  # filtered out (< 5 words)
        ],
        "v2": [
            TranscriptChunk(
                text="Mechanics are overrated without team chemistry.",
                start_seconds=5,
            ),
        ],
    }
    repo = LiquipediaRepo(FakeConn())

    report = await ingest_youtube_quotes(
        configs,
        repo=repo,
        feed_fetcher=_feed_fetcher(feeds),
        transcript_fetcher=_transcript_fetcher(transcripts),
    )

    assert report.channels_processed == 1
    assert report.videos_processed == 2
    assert report.quotes_inserted == 2
    assert report.quotes_deduped == 0
    assert report.videos_skipped_no_transcript == []


@pytest.mark.asyncio
async def test_skips_video_when_transcript_unavailable() -> None:
    configs = [
        ChannelConfig(
            channel_id="UC_liefx",
            strategy="channel",
            default_speaker_id="Liefx",
        ),
    ]
    feeds = {
        "UC_liefx": [VideoMeta(video_id="dead", title="x", published=None)]
    }
    transcripts: dict[str, Any] = {
        "dead": YoutubeTranscriptUnavailable("disabled")
    }
    repo = LiquipediaRepo(FakeConn())

    report = await ingest_youtube_quotes(
        configs,
        repo=repo,
        feed_fetcher=_feed_fetcher(feeds),
        transcript_fetcher=_transcript_fetcher(transcripts),
    )

    assert "dead" in report.videos_skipped_no_transcript
    assert report.quotes_inserted == 0


@pytest.mark.asyncio
async def test_title_strategy_skips_videos_without_alias_match() -> None:
    configs = [
        ChannelConfig(
            channel_id="UC_rlcs",
            strategy="title",
            aliases={"itachi": "itachi", "vatira": "Vatira"},
        ),
    ]
    feeds = {
        "UC_rlcs": [
            VideoMeta(video_id="match", title="Interview: itachi postgame", published=None),
            VideoMeta(video_id="nomatch", title="Weekly Power Rankings", published=None),
        ]
    }
    transcripts = {
        "match": [
            TranscriptChunk(text="We played for each other tonight.", start_seconds=0),
        ],
        "nomatch": [
            TranscriptChunk(text="This will never be emitted due to no alias.", start_seconds=0),
        ],
    }
    repo = LiquipediaRepo(FakeConn())

    report = await ingest_youtube_quotes(
        configs,
        repo=repo,
        feed_fetcher=_feed_fetcher(feeds),
        transcript_fetcher=_transcript_fetcher(transcripts),
    )

    assert report.quotes_inserted == 1
    assert "nomatch" in report.videos_skipped_no_attribution


@pytest.mark.asyncio
async def test_dedups_same_quote_across_channels() -> None:
    configs = [
        ChannelConfig(channel_id="A", strategy="channel", default_speaker_id="itachi"),
        ChannelConfig(channel_id="B", strategy="channel", default_speaker_id="itachi"),
    ]
    same_line = TranscriptChunk(
        text="We play for each other every single game.",
        start_seconds=0,
    )
    feeds = {
        "A": [VideoMeta(video_id="va", title="x", published=None)],
        "B": [VideoMeta(video_id="vb", title="x", published=None)],
    }
    transcripts = {"va": [same_line], "vb": [same_line]}
    repo = LiquipediaRepo(FakeConn())

    report = await ingest_youtube_quotes(
        configs,
        repo=repo,
        feed_fetcher=_feed_fetcher(feeds),
        transcript_fetcher=_transcript_fetcher(transcripts),
    )

    assert report.quotes_inserted == 1
    assert report.quotes_deduped == 1


@pytest.mark.asyncio
async def test_max_videos_per_channel_caps_fetching() -> None:
    configs = [
        ChannelConfig(
            channel_id="UC_liefx",
            strategy="channel",
            default_speaker_id="Liefx",
        ),
    ]
    feeds = {
        "UC_liefx": [
            VideoMeta(video_id=f"v{i}", title="x", published=None) for i in range(10)
        ]
    }
    transcripts: dict[str, Any] = {
        f"v{i}": [TranscriptChunk(text="Long enough quote for the threshold.", start_seconds=0)]
        for i in range(10)
    }
    repo = LiquipediaRepo(FakeConn())

    report = await ingest_youtube_quotes(
        configs,
        repo=repo,
        feed_fetcher=_feed_fetcher(feeds),
        transcript_fetcher=_transcript_fetcher(transcripts),
        max_videos_per_channel=3,
    )

    assert report.videos_processed == 3
    assert report.quotes_inserted == 1  # same text across all 3 → dedup to 1
    assert report.quotes_deduped == 2
