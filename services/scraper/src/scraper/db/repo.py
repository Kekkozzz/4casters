"""Async repository layer: UPSERT ParsedX records into Postgres via asyncpg.

The repo depends on a thin connection protocol (`Executor`) so the
orchestration layer can pass either a real `asyncpg.Connection` / pool
or a test fake. Every method is idempotent (ON CONFLICT DO UPDATE) so
re-running a backfill is safe.
"""

from __future__ import annotations

from typing import Any, Protocol

from scraper.ballchasing.parsers import EventPlayerStat, EventTeamStat
from scraper.liquipedia.parsers.event import ParsedEvent
from scraper.liquipedia.parsers.match import ParsedMatch
from scraper.liquipedia.parsers.player import ParsedPlayer
from scraper.liquipedia.parsers.team import ParsedRosterEntry, ParsedTeam
from scraper.quotes.types import ParsedQuote


class Executor(Protocol):
    """Minimal shape we need from an asyncpg connection or pool."""

    async def execute(self, query: str, *args: Any) -> Any: ...
    async def fetchrow(self, query: str, *args: Any) -> Any: ...
    async def fetch(self, query: str, *args: Any) -> Any: ...


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

    async def upsert_event_group(
        self,
        *,
        event_id: str,
        group_id: str,
        linked_by: str,
        confidence: float | None,
    ) -> None:
        await self._conn.execute(
            _UPSERT_EVENT_GROUP, event_id, group_id, linked_by, confidence
        )

    async def get_event_group(self, event_id: str) -> str | None:
        row = await self._conn.fetchrow(
            "SELECT ballchasing_group_id FROM event_groups WHERE event_id = $1",
            event_id,
        )
        if row is None:
            return None
        value = row["ballchasing_group_id"]
        return value if isinstance(value, str) else None

    async def upsert_event_player_stat(self, stat: EventPlayerStat) -> None:
        await self._conn.execute(
            _UPSERT_EVENT_PLAYER_STAT,
            stat.event_id,
            stat.player_id,
            stat.games_played,
            stat.goals_per_game,
            stat.assists_per_game,
            stat.saves_per_game,
            stat.shots_per_game,
            stat.shooting_pct,
            stat.save_pct,
            stat.demos_per_game,
            stat.boost_per_min,
            stat.source_group_id,
        )

    async def upsert_event_team_stat(self, stat: EventTeamStat) -> None:
        await self._conn.execute(
            _UPSERT_EVENT_TEAM_STAT,
            stat.event_id,
            stat.team_id,
            stat.games_played,
            stat.wins,
            stat.losses,
            stat.goals_for,
            stat.goals_against,
            stat.source_group_id,
        )

    async def upsert_quote(self, quote: ParsedQuote) -> int:
        """Insert a quote, skipping silently if its content_hash already exists.

        Returns 1 if the row was newly inserted, 0 if it was a duplicate.
        """
        row = await self._conn.fetchrow(
            _UPSERT_QUOTE,
            quote.speaker_id,
            quote.text,
            quote.source_url,
            quote.source_type.value,
            quote.source_timestamp,
            quote.hash,
        )
        return 1 if row is not None else 0

    async def fetch_quotes_missing_embedding(
        self, limit: int
    ) -> list[tuple[str, str]]:
        """Return up to `limit` (id, text) tuples for quotes without embeddings."""
        rows = await self._conn.fetch(
            "SELECT id::text AS id, text FROM quotes "
            "WHERE embedding IS NULL ORDER BY captured_at LIMIT $1",
            limit,
        )
        return [(row["id"], row["text"]) for row in rows]

    async def set_quote_embedding(
        self, quote_id: str, embedding: list[float]
    ) -> None:
        # pgvector accepts the textual form '[0.1, 0.2, ...]' and casts via ::vector.
        literal = "[" + ",".join(f"{v:.8f}" for v in embedding) + "]"
        await self._conn.execute(
            "UPDATE quotes SET embedding = $1::vector WHERE id = $2::uuid",
            literal,
            quote_id,
        )

    async def count_quotes_for_speaker(self, speaker_id: str) -> int:
        row = await self._conn.fetchrow(
            "SELECT COUNT(*)::int AS c FROM quotes WHERE speaker_id = $1",
            speaker_id,
        )
        if row is None:
            return 0
        value = row["c"]
        return int(value) if isinstance(value, int) else 0


_UPSERT_EVENT_GROUP = """
INSERT INTO event_groups (event_id, ballchasing_group_id, linked_by, confidence, linked_at)
VALUES ($1, $2, $3, $4, NOW())
ON CONFLICT (event_id) DO UPDATE SET
  ballchasing_group_id = EXCLUDED.ballchasing_group_id,
  linked_by = EXCLUDED.linked_by,
  confidence = EXCLUDED.confidence,
  linked_at = NOW()
"""

_UPSERT_EVENT_PLAYER_STAT = """
INSERT INTO event_player_stats (
  event_id, player_id, games_played,
  goals_per_game, assists_per_game, saves_per_game, shots_per_game,
  shooting_pct, save_pct, demos_per_game, boost_per_min,
  source_group_id, captured_at
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
ON CONFLICT (event_id, player_id) DO UPDATE SET
  games_played = EXCLUDED.games_played,
  goals_per_game = EXCLUDED.goals_per_game,
  assists_per_game = EXCLUDED.assists_per_game,
  saves_per_game = EXCLUDED.saves_per_game,
  shots_per_game = EXCLUDED.shots_per_game,
  shooting_pct = EXCLUDED.shooting_pct,
  save_pct = EXCLUDED.save_pct,
  demos_per_game = EXCLUDED.demos_per_game,
  boost_per_min = EXCLUDED.boost_per_min,
  source_group_id = EXCLUDED.source_group_id,
  captured_at = NOW()
"""

_UPSERT_EVENT_TEAM_STAT = """
INSERT INTO event_team_stats (
  event_id, team_id, games_played, wins, losses,
  goals_for, goals_against, source_group_id, captured_at
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
ON CONFLICT (event_id, team_id) DO UPDATE SET
  games_played = EXCLUDED.games_played,
  wins = EXCLUDED.wins,
  losses = EXCLUDED.losses,
  goals_for = EXCLUDED.goals_for,
  goals_against = EXCLUDED.goals_against,
  source_group_id = EXCLUDED.source_group_id,
  captured_at = NOW()
"""

# Dedup lives in the UNIQUE(content_hash) constraint. ON CONFLICT DO NOTHING
# + RETURNING id means fetchrow returns the inserted row or None on conflict.
_UPSERT_QUOTE = """
INSERT INTO quotes (
  speaker_id, text, source_url, source_type, source_timestamp,
  content_hash, captured_at
) VALUES ($1, $2, $3, $4, $5, $6, NOW())
ON CONFLICT (content_hash) DO NOTHING
RETURNING id
"""
