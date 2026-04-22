"""Scraper CLI entrypoint. Registered in pyproject.toml as `scraper`."""

from __future__ import annotations

import asyncio

import typer
from rich.console import Console

from scraper.config import get_settings
from scraper.db.pool import pool_from_settings
from scraper.db.repo import LiquipediaRepo
from scraper.liquipedia.client import LiquipediaClient
from scraper.pipeline import backfill_event

app = typer.Typer(
    help="4casters Liquipedia ingestion CLI",
    no_args_is_help=True,
    add_completion=False,
)
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
