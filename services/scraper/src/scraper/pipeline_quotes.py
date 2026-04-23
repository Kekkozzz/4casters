"""Quote corpus ingestion pipeline (Phase A: Liquipedia).

Per-player: fetch the player page, extract quotes, upsert with
content_hash dedup. Per-speaker counts go into the report so the CLI
can print "itachi: +3 quotes (already had 12)".
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Protocol
from urllib.parse import quote

from scraper.db.repo import LiquipediaRepo
from scraper.liquipedia.client import (
    LiquipediaClient,
    LiquipediaError,
    LiquipediaNotFoundError,
)
from scraper.quotes.liquipedia_parser import parse_quotes_from_player

logger = logging.getLogger(__name__)

LIQUIPEDIA_BASE = "https://liquipedia.net/rocketleague/"


def _slug_url(slug: str) -> str:
    return LIQUIPEDIA_BASE + quote(slug, safe="/_")


@dataclass
class QuotesIngestReport:
    total_players_processed: int = 0
    quotes_inserted: int = 0
    quotes_deduped: int = 0
    players_skipped: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)


class _PlayerSource(Protocol):
    async def list_player_slugs(self) -> list[str]: ...


class DbPlayerSource:
    """Default source: every row in players table."""

    def __init__(self, conn: object) -> None:
        self._conn = conn

    async def list_player_slugs(self) -> list[str]:
        rows = await self._conn.fetch(  # type: ignore[attr-defined]
            "SELECT id FROM players ORDER BY id"
        )
        return [row["id"] for row in rows]


async def ingest_liquipedia_quotes_for_player(
    slug: str,
    *,
    client: LiquipediaClient,
    repo: LiquipediaRepo,
    report: QuotesIngestReport,
) -> None:
    try:
        wikitext = await client.get_wikitext(slug)
    except LiquipediaNotFoundError:
        report.players_skipped.append(slug)
        return
    except LiquipediaError as exc:
        report.errors.append(f"{slug}: fetch failed: {exc}")
        return

    try:
        parsed = parse_quotes_from_player(
            wikitext, speaker_id=slug, liquipedia_url=_slug_url(slug)
        )
    except ValueError as exc:
        report.errors.append(f"{slug}: parse failed: {exc}")
        return

    for quote_obj in parsed:
        try:
            written = await repo.upsert_quote(quote_obj)
        except Exception as exc:
            report.errors.append(f"{slug}: db upsert failed: {exc}")
            continue
        if written:
            report.quotes_inserted += 1
        else:
            report.quotes_deduped += 1

    report.total_players_processed += 1


async def ingest_liquipedia_quotes(
    slugs: list[str],
    *,
    client: LiquipediaClient,
    repo: LiquipediaRepo,
) -> QuotesIngestReport:
    report = QuotesIngestReport()
    for slug in slugs:
        await ingest_liquipedia_quotes_for_player(
            slug, client=client, repo=repo, report=report
        )
    return report
