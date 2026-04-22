"""Async repository layer: UPSERT ParsedX records into Postgres via asyncpg.

The repo depends on a thin connection protocol (`Executor`) so the
orchestration layer can pass either a real `asyncpg.Connection` / pool
or a test fake. Every method is idempotent (ON CONFLICT DO UPDATE) so
re-running a backfill is safe.
"""

from __future__ import annotations

from typing import Any, Protocol

from scraper.liquipedia.parsers.event import ParsedEvent
from scraper.liquipedia.parsers.match import ParsedMatch
from scraper.liquipedia.parsers.player import ParsedPlayer
from scraper.liquipedia.parsers.team import ParsedRosterEntry, ParsedTeam


class Executor(Protocol):
    """Minimal shape we need from an asyncpg connection or pool."""

    async def execute(self, query: str, *args: Any) -> Any: ...


_UPSERT_TEAM = """
INSERT INTO teams (id, name, short, region, liquipedia_url, first_seen_at, updated_at)
VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  short = EXCLUDED.short,
  region = EXCLUDED.region,
  liquipedia_url = EXCLUDED.liquipedia_url,
  updated_at = NOW()
"""

_UPSERT_PLAYER = """
INSERT INTO players (
  id, name, nationality, current_team_id, liquipedia_url, first_seen_at, updated_at
) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  nationality = EXCLUDED.nationality,
  current_team_id = EXCLUDED.current_team_id,
  liquipedia_url = EXCLUDED.liquipedia_url,
  updated_at = NOW()
"""

_UPSERT_EVENT = """
INSERT INTO events (id, name, tier, region, start_date, end_date, liquipedia_url, updated_at)
VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tier = EXCLUDED.tier,
  region = EXCLUDED.region,
  start_date = EXCLUDED.start_date,
  end_date = EXCLUDED.end_date,
  liquipedia_url = EXCLUDED.liquipedia_url,
  updated_at = NOW()
"""

_UPSERT_MATCH = """
INSERT INTO matches (
  id, event_id, team_a_id, team_b_id, scheduled_at, stage, format,
  score_a, score_b, liquipedia_url, updated_at
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
ON CONFLICT (id) DO UPDATE SET
  scheduled_at = EXCLUDED.scheduled_at,
  stage = EXCLUDED.stage,
  format = EXCLUDED.format,
  score_a = EXCLUDED.score_a,
  score_b = EXCLUDED.score_b,
  liquipedia_url = EXCLUDED.liquipedia_url,
  updated_at = NOW()
"""

_UPSERT_ROSTER = """
INSERT INTO roster_history (player_id, team_id, start_date, end_date, role, source_url)
VALUES ($1, $2, $3, $4, $5, $6)
ON CONFLICT (player_id, team_id, start_date) DO UPDATE SET
  end_date = EXCLUDED.end_date,
  role = EXCLUDED.role,
  source_url = EXCLUDED.source_url
"""


class LiquipediaRepo:
    def __init__(self, conn: Executor) -> None:
        self._conn = conn

    async def upsert_team(self, team: ParsedTeam) -> None:
        await self._conn.execute(
            _UPSERT_TEAM,
            team.id,
            team.name,
            team.short,
            team.region,
            team.liquipedia_url,
        )

    async def upsert_player(self, player: ParsedPlayer) -> None:
        await self._conn.execute(
            _UPSERT_PLAYER,
            player.id,
            player.name,
            player.nationality,
            player.current_team_id,
            player.liquipedia_url,
        )

    async def upsert_event(self, event: ParsedEvent) -> None:
        await self._conn.execute(
            _UPSERT_EVENT,
            event.id,
            event.name,
            event.tier,
            event.region,
            event.start_date,
            event.end_date,
            event.liquipedia_url,
        )

    async def upsert_match(self, match: ParsedMatch) -> None:
        await self._conn.execute(
            _UPSERT_MATCH,
            match.id,
            match.event_id,
            match.team_a_id,
            match.team_b_id,
            match.scheduled_at,
            match.stage,
            match.format,
            match.score_a,
            match.score_b,
            match.liquipedia_url,
        )

    async def upsert_roster_entry(self, entry: ParsedRosterEntry) -> int:
        """Returns 1 if the entry was written, 0 if skipped (missing start_date)."""
        if entry.start_date is None:
            return 0
        await self._conn.execute(
            _UPSERT_ROSTER,
            entry.player_id,
            entry.team_id,
            entry.start_date,
            entry.end_date,
            entry.role,
            entry.source_url,
        )
        return 1
