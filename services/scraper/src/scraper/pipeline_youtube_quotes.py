"""YouTube quote ingestion pipeline (Phase B of SP5).

Walks every configured channel, lists recent videos via RSS, fetches
transcripts, attributes speakers, upserts quotes with content_hash
dedup. All sources (RSS fetcher + transcript fetcher) are pluggable
for testability.
"""

from __future__ import annotations

import logging
from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field

from scraper.db.repo import LiquipediaRepo
from scraper.quotes.types import ParsedQuote
from scraper.quotes.youtube import (
    ChannelConfig,
    TranscriptChunk,
    VideoMeta,
    quotes_from_transcript,
)
from scraper.quotes.youtube_transcripts import YoutubeTranscriptUnavailable

logger = logging.getLogger(__name__)

FeedFetcher = Callable[[str], Awaitable[list[VideoMeta]]]
TranscriptFetcher = Callable[[str], Awaitable[list[TranscriptChunk]]]


@dataclass
class YoutubeIngestReport:
    channels_processed: int = 0
    videos_processed: int = 0
    quotes_inserted: int = 0
    quotes_deduped: int = 0
    videos_skipped_no_transcript: list[str] = field(default_factory=list)
    videos_skipped_no_attribution: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)


async def ingest_youtube_quotes_for_channel(
    config: ChannelConfig,
    *,
    repo: LiquipediaRepo,
    feed_fetcher: FeedFetcher,
    transcript_fetcher: TranscriptFetcher,
    report: YoutubeIngestReport,
    max_videos: int | None = None,
) -> None:
    try:
        videos = await feed_fetcher(config.channel_id)
    except Exception as exc:
        report.errors.append(f"{config.channel_id}: feed fetch failed: {exc}")
        return

    if max_videos is not None:
        videos = videos[:max_videos]

    for video in videos:
        try:
            chunks = await transcript_fetcher(video.video_id)
        except YoutubeTranscriptUnavailable:
            report.videos_skipped_no_transcript.append(video.video_id)
            continue
        except Exception as exc:
            report.errors.append(
                f"{config.channel_id}/{video.video_id}: transcript error: {exc}"
            )
            continue

        quotes: list[ParsedQuote] = quotes_from_transcript(config, video, chunks)
        if not quotes:
            report.videos_skipped_no_attribution.append(video.video_id)
            continue

        for q in quotes:
            try:
                written = await repo.upsert_quote(q)
            except Exception as exc:
                report.errors.append(
                    f"{config.channel_id}/{video.video_id}: db upsert: {exc}"
                )
                continue
            if written:
                report.quotes_inserted += 1
            else:
                report.quotes_deduped += 1

        report.videos_processed += 1

    report.channels_processed += 1


async def ingest_youtube_quotes(
    configs: list[ChannelConfig],
    *,
    repo: LiquipediaRepo,
    feed_fetcher: FeedFetcher,
    transcript_fetcher: TranscriptFetcher,
    max_videos_per_channel: int | None = None,
) -> YoutubeIngestReport:
    report = YoutubeIngestReport()
    for config in configs:
        await ingest_youtube_quotes_for_channel(
            config,
            repo=repo,
            feed_fetcher=feed_fetcher,
            transcript_fetcher=transcript_fetcher,
            report=report,
            max_videos=max_videos_per_channel,
        )
    return report
