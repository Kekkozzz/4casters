"""Populate the DB with a canned, realistic dataset for local UI smoke.

Bypasses every external API (Liquipedia, Ballchasing, YouTube, Gemini).
Running `scraper dev-seed` is idempotent: it UPSERTs, so running twice
produces the same final state.

The dataset is structured so that picking any match from the seeded
event and hitting "Generate sheet" in the UI produces a rich synthesis
packet with:

- Real H2H history (past meetings between the two rostered teams)
- Real roster crossings (ex-teammates on a former common team)
- Per-event player stats with a backing ballchasing group_id
- A handful of sourced quotes per player

Embeddings are left NULL — the synthesis layer works without them
(retrieval falls back to captured_at recency), and the `quotes embed`
command can populate them later if the operator wants pgvector search.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import UTC, date, datetime

from scraper.ballchasing.parsers import EventPlayerStat, EventTeamStat
from scraper.db.repo import LiquipediaRepo
from scraper.liquipedia.parsers.event import ParsedEvent
from scraper.liquipedia.parsers.match import ParsedMatch
from scraper.liquipedia.parsers.player import ParsedPlayer
from scraper.liquipedia.parsers.team import ParsedRosterEntry, ParsedTeam
from scraper.quotes.types import ParsedQuote, QuoteSource

logger = logging.getLogger(__name__)

EVENT_SLUG = "RLCS_2026/Dev_Major"
BALLCHASING_GROUP_ID = "dev-seed-rlcs-2026-dev-major"

LQ_BASE = "https://liquipedia.net/rocketleague/"


def _lq(slug: str) -> str:
    return LQ_BASE + slug


@dataclass
class DevSeedReport:
    event_written: bool = False
    teams_written: int = 0
    players_written: int = 0
    roster_entries_written: int = 0
    matches_written: int = 0
    quotes_written: int = 0
    stats_written: int = 0


# ─────────────────────────────────────────────────────────────────────────
# Dataset
# ─────────────────────────────────────────────────────────────────────────

_EVENT = ParsedEvent(
    id=EVENT_SLUG,
    name="RLCS 2026 Dev Major",
    tier="1",
    tier_type="Major",
    region="Europe",
    start_date=date(2026, 2, 19),
    end_date=date(2026, 2, 22),
    liquipedia_url=_lq(EVENT_SLUG),
)

def _team(tid: str, name: str, short: str, region: str) -> ParsedTeam:
    return ParsedTeam(
        id=tid, name=name, short=short, region=region, liquipedia_url=_lq(tid)
    )


_TEAMS = [
    _team("Halcyon_Esports", "Halcyon Esports", "HCN", "Europe"),
    _team("Verdant_GG", "Verdant GG", "VRD", "Europe"),
    _team("Northbyte", "Northbyte", "NBT", "North America"),
    _team("Mirage", "Mirage", "MRG", "Europe"),
]


def _player(pid: str, name: str, nat: str, team: str) -> ParsedPlayer:
    return ParsedPlayer(
        id=pid,
        name=name,
        nationality=nat,
        current_team_id=team,
        liquipedia_url=_lq(pid),
    )


_PLAYERS = [
    # Halcyon
    _player("itachi", "Noah Grünefeld", "Germany", "Halcyon_Esports"),
    _player("Vatira", "Alexandre Carré", "France", "Halcyon_Esports"),
    _player("Seikoo", "Maello Ernst", "France", "Halcyon_Esports"),
    # Verdant GG
    _player("Atomic", "Otto Schmidt", "Sweden", "Verdant_GG"),
    _player("drop", "Axel Van Remoortere", "Belgium", "Verdant_GG"),
    _player("Scrub", "Joseph Killian", "United Kingdom", "Verdant_GG"),
    # Northbyte
    _player("Firstkiller", "Jason Corral", "United States", "Northbyte"),
    _player("Daniel", "Daniel Piecenski", "Canada", "Northbyte"),
    _player("Comm", "Slater Thomas", "United States", "Northbyte"),
    # Mirage
    _player("Kaydop", "Alexandre Courant", "France", "Mirage"),
    _player("Alpha54", "Evan Rogez", "France", "Mirage"),
    _player("extra", "Jos Van Meurs", "Netherlands", "Mirage"),
]


def _roster_entries() -> list[ParsedRosterEntry]:
    """Current rosters + a couple historical crossings for narrative hooks."""
    current_start = date(2024, 8, 1)
    current: list[ParsedRosterEntry] = []
    for p in _PLAYERS:
        assert p.current_team_id is not None
        current.append(
            ParsedRosterEntry(
                player_id=p.id,
                team_id=p.current_team_id,
                role="Player",
                start_date=current_start,
                end_date=None,
                source_url=_lq(p.current_team_id),
            )
        )

    # Crossings: Vatira spent 2023 on Mirage (now on Halcyon, rivalry with
    # Kaydop & Alpha54). drop spent 2023 on Halcyon (now on Verdant GG, ex-
    # teammate of itachi). These feed the synthesis narrative hooks.
    crossings = [
        ParsedRosterEntry(
            player_id="Vatira",
            team_id="Mirage",
            role="Player",
            start_date=date(2023, 1, 15),
            end_date=date(2024, 7, 31),
            source_url=_lq("Mirage"),
        ),
        ParsedRosterEntry(
            player_id="drop",
            team_id="Halcyon_Esports",
            role="Substitute",
            start_date=date(2023, 6, 1),
            end_date=date(2024, 7, 31),
            source_url=_lq("Halcyon_Esports"),
        ),
    ]
    return current + crossings


def _matches() -> list[ParsedMatch]:
    utc = UTC
    return [
        # Group stage — all completed
        ParsedMatch(
            id=f"{EVENT_SLUG}:Group_A:Halcyon_Esports-vs-Verdant_GG",
            event_id=EVENT_SLUG,
            team_a_id="Halcyon_Esports",
            team_b_id="Verdant_GG",
            scheduled_at=datetime(2026, 2, 19, 17, 0, tzinfo=utc),
            stage="Group A",
            format="Bo5",
            score_a=3,
            score_b=2,
            liquipedia_url=_lq(EVENT_SLUG),
        ),
        ParsedMatch(
            id=f"{EVENT_SLUG}:Group_A:Northbyte-vs-Mirage",
            event_id=EVENT_SLUG,
            team_a_id="Northbyte",
            team_b_id="Mirage",
            scheduled_at=datetime(2026, 2, 19, 19, 0, tzinfo=utc),
            stage="Group A",
            format="Bo5",
            score_a=3,
            score_b=0,
            liquipedia_url=_lq(EVENT_SLUG),
        ),
        ParsedMatch(
            id=f"{EVENT_SLUG}:Group_A:Halcyon_Esports-vs-Northbyte",
            event_id=EVENT_SLUG,
            team_a_id="Halcyon_Esports",
            team_b_id="Northbyte",
            scheduled_at=datetime(2026, 2, 20, 17, 0, tzinfo=utc),
            stage="Group A",
            format="Bo5",
            score_a=2,
            score_b=3,
            liquipedia_url=_lq(EVENT_SLUG),
        ),
        ParsedMatch(
            id=f"{EVENT_SLUG}:Group_A:Verdant_GG-vs-Mirage",
            event_id=EVENT_SLUG,
            team_a_id="Verdant_GG",
            team_b_id="Mirage",
            scheduled_at=datetime(2026, 2, 20, 19, 0, tzinfo=utc),
            stage="Group A",
            format="Bo5",
            score_a=3,
            score_b=2,
            liquipedia_url=_lq(EVENT_SLUG),
        ),
        # Semifinals — upcoming (the demo "Generate" targets)
        ParsedMatch(
            id=f"{EVENT_SLUG}:SF:Halcyon_Esports-vs-Mirage",
            event_id=EVENT_SLUG,
            team_a_id="Halcyon_Esports",
            team_b_id="Mirage",
            scheduled_at=datetime(2026, 2, 21, 18, 0, tzinfo=utc),
            stage="SF",
            format="Bo7",
            score_a=None,
            score_b=None,
            liquipedia_url=_lq(EVENT_SLUG),
        ),
        ParsedMatch(
            id=f"{EVENT_SLUG}:SF:Verdant_GG-vs-Northbyte",
            event_id=EVENT_SLUG,
            team_a_id="Verdant_GG",
            team_b_id="Northbyte",
            scheduled_at=datetime(2026, 2, 21, 20, 30, tzinfo=utc),
            stage="SF",
            format="Bo7",
            score_a=None,
            score_b=None,
            liquipedia_url=_lq(EVENT_SLUG),
        ),
    ]


def _player_stats() -> list[EventPlayerStat]:
    """Rolling 30d stats for every player rostered in this event."""
    rows: list[tuple[str, float, float, float, float, float, float, float]] = [
        # (player_id, gp_g, saves_g, shots_g, shoot_pct, save_pct, demos_g, bpm)
        ("itachi", 1.08, 1.75, 3.80, 28.4, 72.1, 1.25, 462.0),
        ("Vatira", 0.85, 2.10, 3.20, 26.6, 80.4, 0.90, 418.0),
        ("Seikoo", 0.60, 1.40, 2.40, 25.0, 68.0, 0.55, 390.0),
        ("Atomic", 0.95, 1.85, 3.55, 26.8, 74.5, 1.05, 440.0),
        ("drop", 0.72, 1.95, 2.80, 25.7, 78.2, 0.75, 405.0),
        ("Scrub", 0.45, 1.20, 2.10, 21.4, 64.3, 0.40, 375.0),
        ("Firstkiller", 1.32, 1.60, 4.20, 31.4, 69.8, 1.50, 478.0),
        ("Daniel", 0.68, 1.85, 2.70, 25.2, 76.1, 0.65, 412.0),
        ("Comm", 0.55, 1.50, 2.50, 22.0, 70.5, 0.50, 398.0),
        ("Kaydop", 0.92, 1.95, 3.40, 27.1, 75.8, 0.85, 435.0),
        ("Alpha54", 0.80, 1.70, 3.00, 26.7, 71.4, 0.75, 420.0),
        ("extra", 0.50, 1.30, 2.30, 21.7, 66.2, 0.45, 385.0),
    ]
    return [
        EventPlayerStat(
            event_id=EVENT_SLUG,
            player_id=pid,
            games_played=12,
            goals_per_game=gpg,
            assists_per_game=round(gpg * 0.7, 2),
            saves_per_game=spg,
            shots_per_game=shots,
            shooting_pct=shoot_pct,
            save_pct=save_pct,
            demos_per_game=demos,
            boost_per_min=bpm,
            source_group_id=BALLCHASING_GROUP_ID,
        )
        for (pid, gpg, spg, shots, shoot_pct, save_pct, demos, bpm) in rows
    ]


def _team_stats() -> list[EventTeamStat]:
    rows = [
        ("Halcyon_Esports", 12, 8, 4, 34, 28),
        ("Verdant_GG", 12, 7, 5, 31, 30),
        ("Northbyte", 12, 9, 3, 38, 26),
        ("Mirage", 12, 5, 7, 26, 33),
    ]
    return [
        EventTeamStat(
            event_id=EVENT_SLUG,
            team_id=tid,
            games_played=gp,
            wins=w,
            losses=losses,
            goals_for=gf,
            goals_against=ga,
            source_group_id=BALLCHASING_GROUP_ID,
        )
        for (tid, gp, w, losses, gf, ga) in rows
    ]


def _quotes() -> list[ParsedQuote]:
    return [
        ParsedQuote(
            speaker_id="itachi",
            text="We play for each other every single game.",
            source_url=_lq("itachi") + "#Quotes",
            source_type=QuoteSource.LIQUIPEDIA,
        ),
        ParsedQuote(
            speaker_id="itachi",
            text="Mechanics are overrated without team chemistry.",
            source_url=_lq("itachi") + "#Quotes",
            source_type=QuoteSource.LIQUIPEDIA,
        ),
        ParsedQuote(
            speaker_id="Vatira",
            text="When the pressure kicks in, I trust my teammates more than the numbers.",
            source_url=_lq("Vatira") + "#Quotes",
            source_type=QuoteSource.LIQUIPEDIA,
        ),
        ParsedQuote(
            speaker_id="Kaydop",
            text="I have no rivalry with anyone. The only thing I want is to win.",
            source_url=_lq("Kaydop") + "#Quotes",
            source_type=QuoteSource.LIQUIPEDIA,
        ),
        ParsedQuote(
            speaker_id="Kaydop",
            text="A Major is won in the quiet moments between series, not in game seven.",
            source_url=_lq("Kaydop") + "#Quotes",
            source_type=QuoteSource.LIQUIPEDIA,
        ),
        ParsedQuote(
            speaker_id="drop",
            text=(
                "Playing against my old teammates is just another match. "
                "Then the whistle blows and it isn't."
            ),
            source_url=_lq("drop") + "#Quotes",
            source_type=QuoteSource.LIQUIPEDIA,
        ),
        ParsedQuote(
            speaker_id="Firstkiller",
            text="I don't care about stats. I care about the goal that ends the series.",
            source_url=_lq("Firstkiller") + "#Quotes",
            source_type=QuoteSource.LIQUIPEDIA,
        ),
        ParsedQuote(
            speaker_id="Atomic",
            text="You can't fake preparation. Either you know the matchup or you lose.",
            source_url=_lq("Atomic") + "#Quotes",
            source_type=QuoteSource.LIQUIPEDIA,
        ),
    ]


# ─────────────────────────────────────────────────────────────────────────
# Runner
# ─────────────────────────────────────────────────────────────────────────


async def seed_dev_data(repo: LiquipediaRepo) -> DevSeedReport:
    """Idempotent: every call UPSERTs the fixed dataset into the DB."""
    report = DevSeedReport()

    # Teams must exist before players (FK) and matches (FK).
    for team in _TEAMS:
        await repo.upsert_team(team)
        report.teams_written += 1

    await repo.upsert_event(_EVENT)
    report.event_written = True

    for player in _PLAYERS:
        await repo.upsert_player(player)
        report.players_written += 1

    for entry in _roster_entries():
        written = await repo.upsert_roster_entry(entry)
        report.roster_entries_written += written

    for match in _matches():
        await repo.upsert_match(match)
        report.matches_written += 1

    # Ballchasing link must come before stats rows so source_group_id
    # references something the operator can click through to.
    await repo.upsert_event_group(
        event_id=EVENT_SLUG,
        group_id=BALLCHASING_GROUP_ID,
        linked_by="dev-seed",
        confidence=None,
    )
    for ps in _player_stats():
        await repo.upsert_event_player_stat(ps)
        report.stats_written += 1
    for ts in _team_stats():
        await repo.upsert_event_team_stat(ts)
        report.stats_written += 1

    for quote in _quotes():
        written = await repo.upsert_quote(quote)
        report.quotes_written += written

    return report
