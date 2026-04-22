"""Ballchasing stats refresh pipeline.

One entry point — `refresh_event_stats(event_slug, ...)` — that either
uses a previously linked ballchasing group or discovers one via fuzzy
match, fetches cumulative/game-average stats, and UPSERTs them.

The pipeline depends on the Liquipedia DB already containing the event
and the players/teams participating (so we can map name -> slug).
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any, Protocol

from scraper.ballchasing.client import (
    BallchasingClient,
    BallchasingError,
    BallchasingNotFoundError,
)
from scraper.ballchasing.discovery import find_group_for_event
from scraper.ballchasing.parsers import parse_group_stats
from scraper.db.repo import LiquipediaRepo
from scraper.liquipedia.parsers.event import ParsedEvent

logger = logging.getLogger(__name__)


@dataclass
class StatsRefreshReport:
    event_slug: str
    group_id: str | None = None
    linked_via: str | None = None  # "existing" | "auto" | "manual"
    player_stats_written: int = 0
    team_stats_written: int = 0
    unmapped_players: list[str] = field(default_factory=list)
    unmapped_teams: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)


class _EventLookup(Protocol):
    async def fetch_event(self, slug: str) -> ParsedEvent | None: ...
    async def fetch_player_name_slug_map(self, slug: str) -> dict[str, str]: ...
    async def fetch_team_name_slug_map(self, slug: str) -> dict[str, str]: ...


class SupabaseEventLookup:
    """Default lookup: queries players/teams from the DB for the given event.

    We derive participants from the `matches` table (team_a_id, team_b_id)
    and then pull player names from `players` joined on `roster_history`.
    """

    def __init__(self, conn: Any) -> None:
        self._conn = conn

    async def fetch_event(self, slug: str) -> ParsedEvent | None:
        row = await self._conn.fetchrow(
            "SELECT id, name, tier, region, start_date, end_date, liquipedia_url "
            "FROM events WHERE id = $1",
            slug,
        )
        if row is None:
            return None
        return ParsedEvent(
            id=row["id"],
            name=row["name"],
            tier=row["tier"],
            tier_type=None,
            region=row["region"],
            start_date=row["start_date"],
            end_date=row["end_date"],
            liquipedia_url=row["liquipedia_url"],
        )

    async def fetch_player_name_slug_map(self, slug: str) -> dict[str, str]:
        rows = await self._conn.fetch(
            """
            SELECT DISTINCT p.name, p.id
            FROM players p
            JOIN roster_history rh ON rh.player_id = p.id
            JOIN matches m ON m.event_id = $1
              AND (rh.team_id = m.team_a_id OR rh.team_id = m.team_b_id)
            WHERE rh.end_date IS NULL OR rh.end_date >= (
              SELECT start_date FROM events WHERE id = $1
            )
            """,
            slug,
        )
        return {row["name"]: row["id"] for row in rows}

    async def fetch_team_name_slug_map(self, slug: str) -> dict[str, str]:
        rows = await self._conn.fetch(
            """
            SELECT DISTINCT t.name, t.id
            FROM teams t
            JOIN matches m ON m.event_id = $1
              AND (t.id = m.team_a_id OR t.id = m.team_b_id)
            """,
            slug,
        )
        return {row["name"]: row["id"] for row in rows}


async def refresh_event_stats(
    event_slug: str,
    *,
    client: BallchasingClient,
    repo: LiquipediaRepo,
    lookup: _EventLookup,
) -> StatsRefreshReport:
    report = StatsRefreshReport(event_slug=event_slug)

    event = await lookup.fetch_event(event_slug)
    if event is None:
        report.errors.append(f"event {event_slug} not in DB; run liquipedia backfill first")
        return report

    existing_group = await repo.get_event_group(event_slug)
    if existing_group:
        report.group_id = existing_group
        report.linked_via = "existing"
    else:
        try:
            match = await find_group_for_event(event, client=client)
        except BallchasingError as exc:
            report.errors.append(f"group search failed: {exc}")
            return report
        if match is None:
            report.errors.append(
                "no ballchasing group found; link manually via "
                "`scraper stats link <event_slug> <group_id>`"
            )
            return report
        await repo.upsert_event_group(
            event_id=event_slug,
            group_id=match.group_id,
            linked_by="auto",
            confidence=match.confidence,
        )
        report.group_id = match.group_id
        report.linked_via = "auto"

    try:
        payload = await client.get_group(report.group_id)
    except BallchasingNotFoundError:
        report.errors.append(f"group {report.group_id} not found on ballchasing")
        return report
    except BallchasingError as exc:
        report.errors.append(f"group fetch failed: {exc}")
        return report

    player_map = await lookup.fetch_player_name_slug_map(event_slug)
    team_map = await lookup.fetch_team_name_slug_map(event_slug)

    parsed = parse_group_stats(
        payload,
        event_slug=event_slug,
        player_name_to_slug=player_map,
        team_name_to_slug=team_map,
    )

    for player_stat in parsed.player_stats:
        await repo.upsert_event_player_stat(player_stat)
        report.player_stats_written += 1
    for team_stat in parsed.team_stats:
        await repo.upsert_event_team_stat(team_stat)
        report.team_stats_written += 1

    report.unmapped_players = parsed.unmapped_players
    report.unmapped_teams = parsed.unmapped_teams
    return report
