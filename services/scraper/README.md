# 4casters scraper

Python ingestion service that scrapes Rocket League data from Liquipedia into the shared Postgres DB.

Part of [4casters](../../) — the scraper runs on its own schedule, owns no schema (Drizzle on the Next.js side is the single source of truth), and is exposed to operators via a Typer CLI.

## Quickstart

Requires Python 3.12 and [uv](https://docs.astral.sh/uv/).

```bash
cd services/scraper
uv sync --extra dev

# Smoke check
uv run scraper hello

# Backfill one event end-to-end
uv run scraper backfill "Rocket_League_Championship_Series/2024/Major_1/Regional_1/EU"
```

The CLI reads `DATABASE_URL` from the repo-root `.env` file (see `../../.env.example`).

## Layout

```text
services/scraper/
├── pyproject.toml                 (uv-managed)
├── src/scraper/
│   ├── cli.py                     (Typer app, entrypoint)
│   ├── config.py                  (pydantic-settings from .env)
│   ├── liquipedia/
│   │   ├── client.py              (rate-limited async MediaWiki client)
│   │   └── parsers/               (per-entity wikitext parsers)
│   ├── db/
│   │   ├── conn.py                (asyncpg pool)
│   │   └── repo.py                (UPSERT helpers)
│   ├── models.py                  (pydantic row models mirroring Drizzle schema)
│   └── pipeline.py                (backfill orchestrator)
└── tests/
    ├── fixtures/                  (captured MediaWiki JSON responses)
    ├── test_client.py
    ├── test_event_parser.py
    └── ...
```

## Testing

```bash
uv run pytest                       # unit tests only
uv run pytest -m integration        # also hit a live DB (requires DATABASE_URL)
uv run ruff check .
uv run mypy src
```

## Design principles

- **Schema ownership**: Drizzle on the TS side defines tables. Python UPSERTs only.
- **Rate limiting**: Liquipedia requires a descriptive User-Agent and ≤ 1 req / 2s for anonymous clients. `LiquipediaClient` enforces both.
- **Typed rows**: pydantic models in `models.py` mirror DB row shape; parsers return typed instances, the repo UPSERTs them.
- **Idempotent**: re-running `backfill` on the same event updates existing rows (ON CONFLICT DO UPDATE), never errors.
