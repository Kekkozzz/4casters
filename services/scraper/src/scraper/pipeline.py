"""End-to-end Liquipedia backfill orchestrator.

One entry point — `backfill_event(slug)` — that fetches an event page,
parses it, walks the teams it references, parses their rosters, walks
players in those rosters, and parses matches from the event page. Every
parsed record is UPSERTed via LiquipediaRepo.

The orchestrator is decoupled from CLI / pool setup for testability:
callers inject a LiquipediaClient and a LiquipediaRepo.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from urllib.parse import quote

from scraper.db.repo import LiquipediaRepo
from scraper.liquipedia.client import (
    LiquipediaClient,
    LiquipediaError,
    LiquipediaNotFoundError,
)
from scraper.liquipedia.parsers.event import parse_event
from scraper.liquipedia.parsers.match import parse_matches
from scraper.liquipedia.parsers.player import parse_player
from scraper.liquipedia.parsers.team import parse_team

logger = logging.getLogger(__name__)

LIQUIPEDIA_BASE = "https://liquipedia.net/rocketleague/"


@dataclass
class BackfillReport:
    event_slug: str
    event_written: bool = False
    teams_written: int = 0
    players_written: int = 0
    roster_entries_written: int = 0
    matches_written: int = 0
    teams_skipped: list[str] = field(default_factory=list)
    players_skipped: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)


def _slug_url(slug: str) -> str:
    return LIQUIPEDIA_BASE + quote(slug, safe="/_")


def _unique_preserving_order(items: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for item in items:
        if item in seen:
            continue
        seen.add(item)
        result.append(item)
    return result


async def backfill_event(
    event_slug: str,
    *,
    client: LiquipediaClient,
    repo: LiquipediaRepo,
) -> BackfillReport:
    report = BackfillReport(event_slug=event_slug)

    try:
        event_wikitext = await client.get_wikitext(event_slug)
    except LiquipediaNotFoundError:
        report.errors.append(f"event page not found: {event_slug}")
        return report
    except LiquipediaError as exc:
        report.errors.append(f"event fetch failed: {exc}")
        return report

    try:
        event = parse_event(
            event_wikitext,
            slug=event_slug,
            liquipedia_url=_slug_url(event_slug),
        )
    except ValueError as exc:
        report.errors.append(f"event parse failed: {exc}")
        return report

    await repo.upsert_event(event)
    report.event_written = True

    parsed_matches = parse_matches(event_wikitext, event_slug=event_slug)
    team_slugs = _unique_preserving_order(
        [m.team_a_id for m in parsed_matches] + [m.team_b_id for m in parsed_matches]
    )

    player_slugs: list[str] = []
    # Track every team we failed to persist (404, network, parse, upsert).
    # Matches referencing any of these must be skipped to avoid FK errors.
    failed_teams: set[str] = set()
    for team_slug in team_slugs:
        try:
            team_wikitext = await client.get_wikitext(team_slug)
        except LiquipediaNotFoundError:
            report.teams_skipped.append(team_slug)
            failed_teams.add(team_slug)
            continue
        except LiquipediaError as exc:
            report.errors.append(f"team fetch {team_slug}: {exc}")
            failed_teams.add(team_slug)
            continue
        try:
            parsed = parse_team(
                team_wikitext,
                slug=team_slug,
                liquipedia_url=_slug_url(team_slug),
            )
        except ValueError as exc:
            report.errors.append(f"team parse {team_slug}: {exc}")
            failed_teams.add(team_slug)
            continue
        try:
            await repo.upsert_team(parsed.team)
        except Exception as exc:
            report.errors.append(f"team upsert {team_slug}: {exc}")
            failed_teams.add(team_slug)
            continue
        report.teams_written += 1
        for entry in parsed.roster:
            try:
                written = await repo.upsert_roster_entry(entry)
            except Exception as exc:
                report.errors.append(
                    f"roster upsert {entry.player_id}->{entry.team_id}: {exc}"
                )
                continue
            report.roster_entries_written += written
            if entry.player_id:
                player_slugs.append(entry.player_id)

    # Matches need both teams to exist before we can satisfy FKs.
    for match in parsed_matches:
        if match.team_a_id in failed_teams or match.team_b_id in failed_teams:
            continue
        try:
            await repo.upsert_match(match)
        except Exception as exc:
            report.errors.append(
                f"match upsert {match.id}: {exc}"
            )
            continue
        report.matches_written += 1

    for player_slug in _unique_preserving_order(player_slugs):
        try:
            player_wikitext = await client.get_wikitext(player_slug)
        except LiquipediaNotFoundError:
            report.players_skipped.append(player_slug)
            continue
        except LiquipediaError as exc:
            report.errors.append(f"player fetch {player_slug}: {exc}")
            continue
        try:
            player = parse_player(
                player_wikitext,
                slug=player_slug,
                liquipedia_url=_slug_url(player_slug),
            )
        except ValueError as exc:
            report.errors.append(f"player parse {player_slug}: {exc}")
            continue
        # If the player's current team was not persisted, null the FK.
        if (
            player.current_team_id
            and player.current_team_id in failed_teams
        ):
            player = player.model_copy(update={"current_team_id": None})
        try:
            await repo.upsert_player(player)
        except Exception as exc:
            report.errors.append(f"player upsert {player_slug}: {exc}")
            continue
        report.players_written += 1

    return report
