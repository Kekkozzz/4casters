"""Scraper CLI entrypoint. Registered in pyproject.toml as `scraper`."""

from __future__ import annotations

import asyncio
from typing import Annotated

import typer
from rich.console import Console

from scraper.ballchasing.client import BallchasingClient
from scraper.config import get_settings
from scraper.db.pool import pool_from_settings
from scraper.db.repo import LiquipediaRepo
from scraper.liquipedia.client import LiquipediaClient
from scraper.pipeline import backfill_event
from scraper.pipeline_embeddings import backfill_embeddings
from scraper.pipeline_quotes import ingest_liquipedia_quotes
from scraper.pipeline_stats import SupabaseEventLookup, refresh_event_stats
from scraper.pipeline_youtube_quotes import ingest_youtube_quotes
from scraper.quotes.embeddings import GeminiEmbedder
from scraper.quotes.youtube import fetch_channel_feed
from scraper.quotes.youtube_channels import DEFAULT_CHANNELS
from scraper.quotes.youtube_transcripts import fetch_transcript

app = typer.Typer(
    help="4casters ingestion CLI (Liquipedia + Ballchasing + Quotes)",
    no_args_is_help=True,
    add_completion=False,
)
stats_app = typer.Typer(help="Ballchasing stats commands", no_args_is_help=True)
quotes_app = typer.Typer(help="Quote corpus commands", no_args_is_help=True)
app.add_typer(stats_app, name="stats")
app.add_typer(quotes_app, name="quotes")
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


async def _run_quotes_liquipedia(slugs: list[str], all_players: bool) -> int:
    settings = get_settings()
    async with pool_from_settings() as pool, LiquipediaClient(
        user_agent=settings.liquipedia_user_agent,
        min_interval_seconds=settings.liquipedia_min_interval_seconds,
    ) as client, pool.acquire() as conn:
        repo = LiquipediaRepo(conn)
        if all_players:
            rows = await conn.fetch("SELECT id FROM players ORDER BY id")
            slugs = [row["id"] for row in rows]
        if not slugs:
            console.print("[yellow]no players to process[/]")
            return 0
        report = await ingest_liquipedia_quotes(slugs, client=client, repo=repo)

    console.rule(f"[bold]Liquipedia quotes ingest ({len(slugs)} players)")
    console.print(
        f"processed={report.total_players_processed}  "
        f"inserted={report.quotes_inserted}  "
        f"deduped={report.quotes_deduped}"
    )
    if report.players_skipped:
        head = ", ".join(report.players_skipped[:10])
        tail = len(report.players_skipped) - 10
        suffix = f" (+{tail} more)" if tail > 0 else ""
        console.print(f"[yellow]no liquipedia page:[/] {head}{suffix}")
    if report.errors:
        for err in report.errors[:10]:
            console.print(f"[red]error:[/] {err}")
        return 1
    return 0


@quotes_app.command("liquipedia")
def quotes_liquipedia(
    slugs: Annotated[
        list[str] | None,
        typer.Argument(
            help="Player slugs to ingest. Omit with --all to process every player."
        ),
    ] = None,
    all_players: Annotated[
        bool,
        typer.Option("--all", help="Ingest quotes for every player in the DB."),
    ] = False,
) -> None:
    """Ingest quotes from Liquipedia player pages (==Quotes== section)."""
    slug_list = list(slugs) if slugs else []
    if not slug_list and not all_players:
        console.print(
            "[red]error:[/] pass at least one player slug, or use --all"
        )
        raise typer.Exit(code=2)
    exit_code = asyncio.run(_run_quotes_liquipedia(slug_list, all_players))
    raise typer.Exit(code=exit_code)


async def _run_quotes_youtube(max_videos: int | None) -> int:
    if not DEFAULT_CHANNELS:
        console.print(
            "[yellow]no channels configured.[/] Edit "
            "src/scraper/quotes/youtube_channels.py and uncomment/fill in "
            "DEFAULT_CHANNELS before running."
        )
        return 0
    async with pool_from_settings() as pool, pool.acquire() as conn:
        repo = LiquipediaRepo(conn)
        report = await ingest_youtube_quotes(
            DEFAULT_CHANNELS,
            repo=repo,
            feed_fetcher=fetch_channel_feed,
            transcript_fetcher=fetch_transcript,
            max_videos_per_channel=max_videos,
        )

    console.rule(f"[bold]YouTube quotes ingest ({len(DEFAULT_CHANNELS)} channels)")
    console.print(
        f"channels={report.channels_processed}  videos={report.videos_processed}  "
        f"inserted={report.quotes_inserted}  deduped={report.quotes_deduped}"
    )
    if report.videos_skipped_no_transcript:
        n = len(report.videos_skipped_no_transcript)
        console.print(f"[yellow]no transcript:[/] {n} video(s)")
    if report.videos_skipped_no_attribution:
        n = len(report.videos_skipped_no_attribution)
        console.print(f"[yellow]no speaker attribution:[/] {n} video(s)")
    if report.errors:
        for err in report.errors[:10]:
            console.print(f"[red]error:[/] {err}")
        return 1
    return 0


@quotes_app.command("youtube")
def quotes_youtube(
    max_videos: Annotated[
        int | None,
        typer.Option(
            "--max-videos",
            help="Cap videos fetched per channel (useful for smoke runs).",
        ),
    ] = None,
) -> None:
    """Ingest quotes from configured YouTube channels (RSS + transcripts)."""
    exit_code = asyncio.run(_run_quotes_youtube(max_videos))
    raise typer.Exit(code=exit_code)


async def _run_quotes_embed(max_rows: int | None) -> int:
    settings = get_settings()
    if not settings.gemini_api_key:
        console.print(
            "[red]error:[/] GEMINI_API_KEY is not set in .env "
            "(get one at https://aistudio.google.com/app/apikey)"
        )
        return 2
    async with pool_from_settings() as pool, GeminiEmbedder(
        api_key=settings.gemini_api_key,
        model=settings.gemini_embedding_model,
        min_interval_seconds=settings.embedding_min_interval_seconds,
    ) as embedder, pool.acquire() as conn:
        repo = LiquipediaRepo(conn)
        report = await backfill_embeddings(
            repo=repo,
            embedder=embedder,
            batch_size=settings.embedding_batch_size,
            max_rows=max_rows,
        )

    console.rule("[bold]Embedding backfill")
    console.print(
        f"batches={report.batches_processed}  "
        f"embeddings_written={report.embeddings_written}"
    )
    if report.errors:
        for err in report.errors[:10]:
            console.print(f"[red]error:[/] {err}")
        return 1
    return 0


@quotes_app.command("embed")
def quotes_embed(
    max_rows: Annotated[
        int | None,
        typer.Option(
            "--max-rows",
            help="Cap total rows embedded in this run (useful for smoke tests).",
        ),
    ] = None,
) -> None:
    """Backfill embeddings for quotes with NULL embedding column."""
    exit_code = asyncio.run(_run_quotes_embed(max_rows))
    raise typer.Exit(code=exit_code)
