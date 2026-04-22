"""Scraper CLI entrypoint. Registered in pyproject.toml as `scraper`."""

from __future__ import annotations

import asyncio

import typer
from rich.console import Console

from scraper.ballchasing.client import BallchasingClient
from scraper.config import get_settings
from scraper.db.pool import pool_from_settings
from scraper.db.repo import LiquipediaRepo
from scraper.liquipedia.client import LiquipediaClient
from scraper.pipeline import backfill_event
from scraper.pipeline_stats import SupabaseEventLookup, refresh_event_stats

app = typer.Typer(
    help="4casters ingestion CLI (Liquipedia + Ballchasing)",
    no_args_is_help=True,
    add_completion=False,
)
stats_app = typer.Typer(help="Ballchasing stats commands", no_args_is_help=True)
app.add_typer(stats_app, name="stats")
console = Console()


@app.command()
def hello() -> None:
    """Smoke command to verify the CLI is wired up correctly."""
    console.print("[green]hello from scraper[/green]")


async def _run_backfill(event_slug: str) -> int:
    settings = get_settings()
    async with pool_from_settings() as pool, LiquipediaClient(
        user_agent=settings.liquipedia_user_agent,
        min_interval_seconds=settings.liquipedia_min_interval_seconds,
    ) as client, pool.acquire() as conn:
        repo = LiquipediaRepo(conn)
        report = await backfill_event(
            event_slug, client=client, repo=repo
        )

    console.rule(f"[bold]Backfill report: {report.event_slug}")
    console.print(
        f"event_written={report.event_written}  "
        f"teams={report.teams_written}  "
        f"players={report.players_written}  "
        f"roster_entries={report.roster_entries_written}  "
        f"matches={report.matches_written}"
    )
    if report.teams_skipped:
        console.print(
            f"[yellow]teams skipped (no Liquipedia page):[/] {', '.join(report.teams_skipped)}"
        )
    if report.players_skipped:
        console.print(
            f"[yellow]players skipped (no Liquipedia page):[/] "
            f"{', '.join(report.players_skipped)}"
        )
    if report.errors:
        for err in report.errors:
            console.print(f"[red]error:[/] {err}")
        return 1
    return 0


@app.command()
def backfill(
    event_slug: str = typer.Argument(
        ...,
        help="Liquipedia event slug, e.g. "
        "'Rocket_League_Championship_Series/2024/Major_1/Regional_1/EU'",
    ),
) -> None:
    """Backfill one event end-to-end: event -> teams -> rosters -> players -> matches."""
    exit_code = asyncio.run(_run_backfill(event_slug))
    raise typer.Exit(code=exit_code)


async def _run_stats_refresh(event_slug: str) -> int:
    settings = get_settings()
    if not settings.ballchasing_api_key:
        console.print(
            "[red]error:[/] BALLCHASING_API_KEY is not set in .env "
            "(sign up at https://ballchasing.com, generate a token in Settings)"
        )
        return 2
    async with pool_from_settings() as pool, BallchasingClient(
        api_key=settings.ballchasing_api_key,
        min_interval_seconds=settings.ballchasing_min_interval_seconds,
    ) as client, pool.acquire() as conn:
        repo = LiquipediaRepo(conn)
        lookup = SupabaseEventLookup(conn)
        report = await refresh_event_stats(
            event_slug, client=client, repo=repo, lookup=lookup
        )

    console.rule(f"[bold]Stats refresh: {report.event_slug}")
    console.print(
        f"group={report.group_id or '-'}  linked_via={report.linked_via or '-'}  "
        f"player_stats={report.player_stats_written}  "
        f"team_stats={report.team_stats_written}"
    )
    if report.unmapped_players:
        console.print(
            f"[yellow]unmapped ballchasing players:[/] {', '.join(report.unmapped_players)}"
        )
    if report.unmapped_teams:
        console.print(
            f"[yellow]unmapped ballchasing teams:[/] {', '.join(report.unmapped_teams)}"
        )
    if report.errors:
        for err in report.errors:
            console.print(f"[red]error:[/] {err}")
        return 1
    return 0


async def _run_stats_link(event_slug: str, group_id: str) -> int:
    async with pool_from_settings() as pool, pool.acquire() as conn:
        repo = LiquipediaRepo(conn)
        await repo.upsert_event_group(
            event_id=event_slug,
            group_id=group_id,
            linked_by="manual",
            confidence=None,
        )
    console.print(
        f"[green]linked[/] event={event_slug} -> group={group_id} (manual)"
    )
    return 0


@stats_app.command("refresh")
def stats_refresh(
    event_slug: str = typer.Argument(..., help="Liquipedia event slug"),
) -> None:
    """Auto-link (if needed) and refresh ballchasing stats for an event."""
    exit_code = asyncio.run(_run_stats_refresh(event_slug))
    raise typer.Exit(code=exit_code)


@stats_app.command("link")
def stats_link(
    event_slug: str = typer.Argument(..., help="Liquipedia event slug"),
    group_id: str = typer.Argument(..., help="Ballchasing group id"),
) -> None:
    """Manually link an event to a ballchasing group (overrides auto-match)."""
    exit_code = asyncio.run(_run_stats_link(event_slug, group_id))
    raise typer.Exit(code=exit_code)
