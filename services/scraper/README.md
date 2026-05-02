# 4casters scraper

Python ingestion service that populates the shared Postgres DB with Rocket League esports data. Runs off a Typer CLI; owns no schema (Drizzle on the Next.js side is the single source of truth).

## Pipelines

| Pipeline | Source | CLI |
| --- | --- | --- |
| Liquipedia entities | wiki API + wikitext | `scraper backfill <event_slug>` |
| Ballchasing stats | REST API (token required) | `scraper stats refresh <event_slug>` / `scraper stats link <event_slug> <group_id>` |
| Liquipedia Quotes | player page `==Quotes==` | `scraper quotes liquipedia --all` |
| YouTube transcripts | RSS + `youtube-transcript-api` | `scraper quotes youtube [--max-videos N]` |
| Quote embeddings | Gemini `text-embedding-004` | `scraper quotes embed [--max-rows N]` |

Twitter/X deferred to v1.5 after the April 2026 viability probe (see [`../../docs/superpowers/plans/2026-04-23-subplan-5-quote-corpus.md`](../../docs/superpowers/plans/2026-04-23-subplan-5-quote-corpus.md)).

## Quickstart

Requires Python 3.12 and [uv](https://docs.astral.sh/uv/).

```bash
cd services/scraper
uv sync --extra dev

# Smoke check
uv run scraper hello

# Full end-to-end for one real event
uv run scraper backfill "Rocket_League_Championship_Series/2026/Boston_Major"
uv run scraper stats refresh "Rocket_League_Championship_Series/2026/Boston_Major"
uv run scraper quotes liquipedia --all
uv run scraper quotes embed
```

The CLI reads env vars from the repo-root `.env` via pydantic-settings. `GEMINI_API_KEY` and `GOOGLE_GENERATIVE_AI_API_KEY` are accepted interchangeably; same AI Studio token powers both embeddings here and synthesis on the Next.js side.

## Environment

| Var | Required for | Default |
| --- | --- | --- |
| `DATABASE_URL` | every command | — (Transaction pooler URI from Supabase) |
| `LIQUIPEDIA_USER_AGENT` | backfill, quotes liquipedia | `4casters/0.3 (https://github.com/...)` |
| `LIQUIPEDIA_MIN_INTERVAL_SECONDS` | backfill, quotes liquipedia | `3.0` (general MediaWiki API throttle) |
| `LIQUIPEDIA_PARSE_MIN_INTERVAL_SECONDS` | rendered HTML calls | `30.0` (`action=parse` throttle) |
| `BALLCHASING_API_KEY` | stats refresh | — |
| `BALLCHASING_MIN_INTERVAL_SECONDS` | stats refresh | `0.5` (2 req/s free tier) |
| `GEMINI_API_KEY` or `GOOGLE_GENERATIVE_AI_API_KEY` | quotes embed | — |
| `GEMINI_EMBEDDING_MODEL` | quotes embed | `text-embedding-004` (768-dim, matches pgvector schema) |
| `EMBEDDING_BATCH_SIZE` | quotes embed | `100` |

## Layout

```text
services/scraper/
├── pyproject.toml                 (uv-managed, hatchling build)
├── src/scraper/
│   ├── cli.py                     Typer root app + subcommands
│   ├── config.py                  pydantic-settings (repo-root .env)
│   ├── pipeline.py                Liquipedia backfill orchestrator
│   ├── pipeline_stats.py          Ballchasing stats refresh
│   ├── pipeline_quotes.py         Liquipedia Quotes ingestion
│   ├── pipeline_youtube_quotes.py YouTube transcripts → ParsedQuote
│   ├── pipeline_embeddings.py     Gemini embedding backfill
│   ├── db/
│   │   ├── pool.py                asyncpg pool (statement_cache_size=0 for pgbouncer)
│   │   └── repo.py                typed UPSERT helpers (LiquipediaRepo)
│   ├── liquipedia/
│   │   ├── client.py              rate-limited async MediaWiki client + 429 retries
│   │   └── parsers/
│   │       ├── _common.py         Infobox extraction + wikilink cleaning helpers
│   │       ├── event.py           ParsedEvent
│   │       ├── team.py            ParsedTeam + ParsedRosterEntry
│   │       ├── player.py          ParsedPlayer
│   │       └── match.py           ParsedMatch (handles MatchList/Bracket/top-level Match)
│   ├── ballchasing/
│   │   ├── client.py              REST client with token auth + rate limit
│   │   ├── discovery.py           fuzzy event→group matcher (name + date, min 0.5 sim)
│   │   └── parsers.py             group JSON → EventPlayerStat / EventTeamStat
│   └── quotes/
│       ├── types.py               QuoteSource enum + ParsedQuote + content_hash
│       ├── embeddings.py          Gemini REST embedder (batchEmbedContents, 768d)
│       ├── liquipedia_parser.py   ==Quotes== section + {{Quote}} templates
│       ├── youtube.py             RSS feed parser + transcript attribution
│       ├── youtube_channels.py    whitelist (operator-edited)
│       └── youtube_transcripts.py youtube-transcript-api wrapper (async-safe)
└── tests/
    ├── fixtures/                  captured wikitext + JSON payloads
    ├── test_liquipedia_client.py
    ├── test_event_parser.py
    ├── test_team_parser.py
    ├── test_player_parser.py
    ├── test_match_parser.py
    ├── test_ballchasing_client.py
    ├── test_ballchasing_discovery.py
    ├── test_ballchasing_parser.py
    ├── test_quote_types.py
    ├── test_quotes_liquipedia_parser.py
    ├── test_youtube_quotes.py
    ├── test_embeddings_client.py
    ├── test_pipeline.py
    ├── test_pipeline_stats.py
    ├── test_pipeline_quotes.py
    ├── test_pipeline_youtube_quotes.py
    ├── test_pipeline_embeddings.py
    └── test_repo.py
```

## Testing

```bash
uv run pytest -q                    # 113 unit tests (no DB, no network)
uv run ruff check src tests
uv run mypy src
```

Integration tests against a live Supabase DB + real Liquipedia / Ballchasing / YouTube calls are manual — the smoke workflow in the repo root README is the scripted end-to-end path.

## Design principles

- **Schema ownership**: Drizzle on the TS side defines tables. Python UPSERTs into them using asyncpg, never `CREATE TABLE`.
- **Rate limiting**: Liquipedia requires a descriptive User-Agent and <= 1 req / 2s for anonymous MediaWiki clients; expensive `action=parse` calls should be <= 1 req / 30s. `LiquipediaClient` fetches wikitext via `action=query&prop=revisions`, throttles general calls at 3s, throttles parse calls at 30s, and retries transient 429s with exponential backoff (5s / 15s / 45s, respects `Retry-After`).
- **Idempotent**: every pipeline is `ON CONFLICT DO UPDATE` so reruns are cheap. Content-hash dedup on quotes means the same line surfaced from two sources lands once.
- **Defensive orchestration**: a failed team (404, network, parse error, upsert error) is tracked in `failed_teams`; matches that reference it are skipped so a single bad row never kills a multi-hour backfill.
- **Typed rows**: pydantic models at every parser boundary. The repo accepts Parsed* instances; callers can't pass raw dicts.
- **Pluggable providers**: Liquipedia / Ballchasing / Gemini / YouTube clients are separately swappable. Fake implementations in tests use the same Protocol as production.

## Ops utilities

- `scripts/reset-event.mjs <slug>` (at repo root) — wipe a partially-ingested event row so backfill can restart from scratch.
