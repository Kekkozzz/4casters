"""YouTube ingestion for the quote corpus (Phase B of Sub-plan #5).

Strategy: use YouTube's public RSS feed for video discovery (no API key,
~15 most-recent videos per channel), fetch transcripts via
`youtube-transcript-api` (no key), then attribute speakers based on
channel configuration:

- `strategy = "channel"` — single-host channels (Liefx, Shoe): every
  quote is attributed to one player.
- `strategy = "title"` — multi-guest channels (RLCS Official interviews):
  parse the video title against an alias→slug map to pick the speaker.
  Drop quotes whose video title doesn't match any alias.

Multi-speaker podcasts/round tables are deliberately out of MVP scope —
without automatic diarization they produce too many mis-attributions.
"""

from __future__ import annotations

import re
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field
from datetime import datetime
from typing import Final, Literal

import httpx

from .types import ParsedQuote, QuoteSource

RSS_URL = "https://www.youtube.com/feeds/videos.xml"
_ATOM_NS: Final = {
    "atom": "http://www.w3.org/2005/Atom",
    "yt": "http://www.youtube.com/xml/schemas/2015",
}

# Don't emit a quote for throwaway transcript chunks like "yeah." or
# "so uh". 5 words was picked after eyeballing a few channels' transcripts
# — short enough to catch tight one-liners, long enough to drop filler.
MIN_WORDS_PER_QUOTE = 5


@dataclass
class VideoMeta:
    video_id: str
    title: str
    published: datetime | None


@dataclass
class TranscriptChunk:
    text: str
    start_seconds: int


@dataclass
class ChannelConfig:
    channel_id: str
    strategy: Literal["channel", "title"]
    default_speaker_id: str | None = None
    aliases: dict[str, str] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if self.strategy == "channel" and not self.default_speaker_id:
            raise ValueError(
                "strategy='channel' requires default_speaker_id (which player "
                "to attribute every quote to)"
            )
        if self.strategy == "title" and not self.aliases:
            raise ValueError(
                "strategy='title' requires aliases mapping (title tokens -> "
                "player slugs) to resolve the speaker"
            )


def parse_channel_feed(xml_text: str) -> list[VideoMeta]:
    """Parse a YouTube RSS feed body into VideoMeta records."""
    root = ET.fromstring(xml_text)
    videos: list[VideoMeta] = []
    for entry in root.findall("atom:entry", _ATOM_NS):
        video_id_el = entry.find("yt:videoId", _ATOM_NS)
        title_el = entry.find("atom:title", _ATOM_NS)
        published_el = entry.find("atom:published", _ATOM_NS)
        if video_id_el is None or video_id_el.text is None:
            continue
        title = title_el.text if (title_el is not None and title_el.text) else ""
        published: datetime | None = None
        if published_el is not None and published_el.text:
            try:
                published = datetime.fromisoformat(published_el.text)
            except ValueError:
                published = None
        videos.append(
            VideoMeta(
                video_id=video_id_el.text,
                title=title,
                published=published,
            )
        )
    return videos


async def fetch_channel_feed(channel_id: str) -> list[VideoMeta]:
    """HTTP fetch + parse of a channel's RSS feed."""
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(RSS_URL, params={"channel_id": channel_id})
        resp.raise_for_status()
        return parse_channel_feed(resp.text)


def resolve_speaker_from_title(
    title: str, aliases: dict[str, str]
) -> str | None:
    """Find the first alias that appears as a word in the title.

    Word-boundary-safe so "atomic" doesn't match inside "atomically".
    Case-insensitive. Returns the mapped slug, or None if no alias hit.
    """
    if not title or not aliases:
        return None
    lowered = title.lower()
    for alias, slug in aliases.items():
        pattern = r"\b" + re.escape(alias.lower()) + r"\b"
        if re.search(pattern, lowered):
            return slug
    return None


def _source_url(video_id: str, start_seconds: int) -> str:
    return f"https://youtu.be/{video_id}?t={start_seconds}"


def quotes_from_transcript(
    config: ChannelConfig,
    video: VideoMeta,
    chunks: list[TranscriptChunk],
) -> list[ParsedQuote]:
    """Apply attribution strategy to transcript chunks → ParsedQuote list.

    - channel strategy: every qualifying chunk becomes a quote attributed
      to config.default_speaker_id.
    - title strategy: every qualifying chunk becomes a quote attributed
      to the alias-resolved speaker. If no alias matches, return [] for
      the whole video (we don't want to guess).
    """
    speaker: str | None
    if config.strategy == "channel":
        speaker = config.default_speaker_id
    else:
        speaker = resolve_speaker_from_title(video.title, config.aliases)
    if not speaker:
        return []

    quotes: list[ParsedQuote] = []
    for chunk in chunks:
        text = chunk.text.strip()
        if len(text.split()) < MIN_WORDS_PER_QUOTE:
            continue
        quotes.append(
            ParsedQuote(
                speaker_id=speaker,
                text=text,
                source_url=_source_url(video.video_id, chunk.start_seconds),
                source_type=QuoteSource.YOUTUBE,
            )
        )
    return quotes
