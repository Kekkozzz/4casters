"""Scraper CLI entrypoint. Registered in pyproject.toml as `scraper`."""

from __future__ import annotations

import typer
from rich.console import Console

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


@app.command()
def backfill(
    event_slug: str = typer.Argument(
        ...,
        help="Liquipedia event slug, e.g. "
        "'Rocket_League_Championship_Series/2024/Major_1/Regional_1/EU'",
    ),
) -> None:
    """Backfill one event end-to-end: event -> teams -> players -> rosters -> matches.

    Implementation lands in Task 9 of Sub-plan #3. For now this is a stub.
    """
    console.print(f"[yellow]stub: would backfill {event_slug}[/yellow]")
    console.print(
        "[dim]Pipeline implementation in scraper/pipeline.py (Sub-plan #3 Task 9)[/dim]"
    )
    raise typer.Exit(code=0)
