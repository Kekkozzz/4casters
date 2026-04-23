"""Thin wrapper around youtube-transcript-api.

The library is synchronous; we run it in a thread via asyncio.to_thread
so the scraper's async pipeline doesn't block. We also catch the
library's transient error classes and re-raise a single
YoutubeTranscriptUnavailable exception so callers don't have to know
the library's internal taxonomy.

youtube-transcript-api occasionally breaks when Google changes their
internal endpoints — the pipeline treats this as a per-video skip,
not a fatal error.
"""

from __future__ import annotations

import asyncio
from typing import Any

from .youtube import TranscriptChunk


class YoutubeTranscriptUnavailable(RuntimeError):
    """Raised when we can't fetch a transcript (disabled, no captions, 429, etc.)."""


def _sync_fetch(video_id: str) -> list[dict[str, Any]]:
    # Deferred import so tests that don't need the library run fast.
    from youtube_transcript_api import (
        NoTranscriptFound,
        TranscriptsDisabled,
        YouTubeTranscriptApi,
    )

    try:
        # v1.0+ API: instance.fetch() -> FetchedTranscript; to_raw_data() -> list[dict].
        fetched = YouTubeTranscriptApi().fetch(video_id)
        return list(fetched.to_raw_data())
    except (NoTranscriptFound, TranscriptsDisabled) as exc:
        raise YoutubeTranscriptUnavailable(str(exc)) from exc
    except Exception as exc:
        raise YoutubeTranscriptUnavailable(f"transcript fetch failed: {exc}") from exc


async def fetch_transcript(video_id: str) -> list[TranscriptChunk]:
    """Return transcript chunks for a video, preserving segment start times.

    Raises YoutubeTranscriptUnavailable when the video has no captions,
    captions are disabled, or the library errors out transiently.
    """
    segments = await asyncio.to_thread(_sync_fetch, video_id)
    chunks: list[TranscriptChunk] = []
    for seg in segments:
        text = str(seg.get("text", "")).strip()
        if not text:
            continue
        start = seg.get("start", 0)
        try:
            start_s = int(float(start))
        except (TypeError, ValueError):
            start_s = 0
        chunks.append(TranscriptChunk(text=text, start_seconds=start_s))
    return chunks
