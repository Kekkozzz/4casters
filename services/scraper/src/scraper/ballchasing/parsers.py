"""Parse a ballchasing /groups/{id} response into stat rows.

Name→slug mapping is the caller's responsibility (pipeline layer). If a
player or team on ballchasing has no known liquipedia slug, we skip it
and surface the name in `unmapped_*` so the pipeline can log a warning
and the operator can fix the mismatch (e.g., alias table) later.
"""

from __future__ import annotations

import re
from typing import Any

from pydantic import BaseModel


class StatsParseError(ValueError):
    """Raised when the ballchasing group payload cannot be interpreted."""


class EventPlayerStat(BaseModel):
    event_id: str
    player_id: str
    games_played: int
    goals_per_game: float | None = None
    assists_per_game: float | None = None
    saves_per_game: float | None = None
    shots_per_game: float | None = None
    shooting_pct: float | None = None
    save_pct: float | None = None
    demos_per_game: float | None = None
    boost_per_min: float | None = None
    source_group_id: str


class EventTeamStat(BaseModel):
    event_id: str
    team_id: str
    games_played: int
    wins: int
    losses: int
    goals_for: int | None = None
    goals_against: int | None = None
    source_group_id: str


class GroupStatsResult(BaseModel):
    player_stats: list[EventPlayerStat]
    team_stats: list[EventTeamStat]
    unmapped_players: list[str]
    unmapped_teams: list[str]


def _get_number(d: Any, *path: str) -> float | None:
    cur: Any = d
    for part in path:
        if not isinstance(cur, dict):
            return None
        cur = cur.get(part)
    if isinstance(cur, int | float):
        return float(cur)
    return None


def _lookup_slug(name: str, mapping: dict[str, str]) -> str | None:
    direct = mapping.get(name)
    if direct:
        return direct
    normalized_mapping = {_normalize_name(key): value for key, value in mapping.items()}
    return normalized_mapping.get(_normalize_name(name))


def _normalize_name(value: str) -> str:
    normalized = value.lower().replace("ø", "o")
    return re.sub(r"[^a-z0-9]+", "", normalized)


def _player_save_percentage(cumulative: dict[str, Any], avg: dict[str, Any]) -> float | None:
    explicit = _get_number(avg, "core", "save_percentage") or _get_number(
        cumulative, "core", "save_percentage"
    )
    if explicit is not None:
        return explicit

    saves = _get_number(cumulative, "core", "saves")
    goals_against = _get_number(cumulative, "core", "goals_against")
    if saves is None or goals_against is None:
        return None
    shots_on_target_against = saves + goals_against
    if shots_on_target_against <= 0:
        return None
    return (saves / shots_on_target_against) * 100


def parse_group_stats(
    payload: dict[str, Any],
    *,
    event_slug: str,
    player_name_to_slug: dict[str, str],
    team_name_to_slug: dict[str, str],
) -> GroupStatsResult:
    group_id = payload.get("id")
    if not isinstance(group_id, str) or not group_id:
        raise StatsParseError("ballchasing payload is missing group id")

    player_stats: list[EventPlayerStat] = []
    unmapped_players: list[str] = []
    for p in payload.get("players", []) or []:
        name = p.get("name", "")
        slug = _lookup_slug(name, player_name_to_slug) if isinstance(name, str) else None
        if not slug:
            unmapped_players.append(name)
            continue
        cumulative = p.get("cumulative", {}) or {}
        avg = p.get("game_average", {}) or {}
        games = cumulative.get("games")
        if not isinstance(games, int):
            continue
        player_stats.append(
            EventPlayerStat(
                event_id=event_slug,
                player_id=slug,
                games_played=games,
                goals_per_game=_get_number(avg, "core", "goals"),
                assists_per_game=_get_number(avg, "core", "assists"),
                saves_per_game=_get_number(avg, "core", "saves"),
                shots_per_game=_get_number(avg, "core", "shots"),
                shooting_pct=_get_number(avg, "core", "shooting_percentage"),
                save_pct=_player_save_percentage(cumulative, avg),
                demos_per_game=_get_number(avg, "demo", "inflicted"),
                boost_per_min=_get_number(avg, "boost", "bpm"),
                source_group_id=group_id,
            )
        )

    team_stats: list[EventTeamStat] = []
    unmapped_teams: list[str] = []
    for t in payload.get("teams", []) or []:
        name = t.get("name", "")
        slug = _lookup_slug(name, team_name_to_slug) if isinstance(name, str) else None
        if not slug:
            unmapped_teams.append(name)
            continue
        cumulative = t.get("cumulative", {}) or {}
        games = cumulative.get("games")
        wins = cumulative.get("wins")
        losses = cumulative.get("losses")
        if isinstance(games, int) and isinstance(wins, int) and losses is None:
            losses = games - wins
        if (
            not isinstance(games, int)
            or not isinstance(wins, int)
            or not isinstance(losses, int)
        ):
            continue
        team_stats.append(
            EventTeamStat(
                event_id=event_slug,
                team_id=slug,
                games_played=games,
                wins=wins,
                losses=losses,
                goals_for=_int_or_none(cumulative, "core", "goals"),
                goals_against=_int_or_none(cumulative, "core", "goals_against"),
                source_group_id=group_id,
            )
        )

    return GroupStatsResult(
        player_stats=player_stats,
        team_stats=team_stats,
        unmapped_players=unmapped_players,
        unmapped_teams=unmapped_teams,
    )


def _int_or_none(d: Any, *path: str) -> int | None:
    value = _get_number(d, *path)
    return int(value) if value is not None else None
