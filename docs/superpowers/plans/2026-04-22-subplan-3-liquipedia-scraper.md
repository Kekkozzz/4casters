# 4casters Sub-plan #3 — Liquipedia Data Pipeline

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans`. Steps use `- [ ]` checkboxes.

**Goal:** Stand up a Python scraper in `services/scraper/` that ingests Rocket League event, team, player, roster, match, and head-to-head data from Liquipedia into the same Postgres DB that Drizzle manages, with a CLI that backfills one event end-to-end and pytest coverage over the parser layer. Frontend keeps using mock data — the handoff to real data happens in Sub-plan #7.

**Architecture:**

```text
                              ┌─────────────────────────────┐
                              │  Liquipedia MediaWiki API   │
                              │  (anon, 1 req / 2s, UA req) │
                              └──────────────┬──────────────┘
                                             │ rate-limited GET
                              ┌──────────────▼──────────────┐
                              │  services/scraper (Python)  │
                              │  - liquipedia/client.py     │
                              │  - liquipedia/parsers/*.py  │
                              │  - db/repo.py (asyncpg)     │
                              │  - cli.py (Typer)           │
                              └──────────────┬──────────────┘
                                             │ INSERT ... ON CONFLICT
                              ┌──────────────▼──────────────┐
                              │  Postgres (Supabase)        │
                              │  schema owned by Drizzle    │
                              │  (TS side) — Python reads   │
                              │  and writes via raw SQL     │
                              └─────────────────────────────┘
```

**Design principle:** schema ownership is single-sourced in Drizzle (TS side). Python never creates or alters tables; it only INSERTs/UPSERTs using raw parameterized SQL. When schema evolves, Drizzle generates a migration and the Python layer's typed models are updated to match.

**Tech Stack:** Python 3.12, uv (package manager), pydantic v2 (typed models), httpx (async HTTP), asyncpg (Postgres driver), Typer (CLI), pytest + respx (HTTP mocking).

**Prereq:** Sub-plan #1 + #2 complete (tags `v0.1.0-scaffold` and `v0.2.0-frontend`). DATABASE_URL set in `.env` pointing at Supabase transaction pooler.

---

## Scope cuts (explicit: what's NOT in this sub-plan)

- No FastAPI server yet — CLI is the only entrypoint. Admin HTTP endpoints land in Sub-plan #3.5.
- No Redis / RQ job queue — sync execution in CLI. Async workers in Sub-plan #3.5.
- No cron / scheduling — manual CLI invocation. Scheduled runs in Sub-plan #3.5.
- No Docker / Railway deploy — local-only. Deploy in Sub-plan #3.5.
- No BLAST or quote corpus — those are Sub-plans #4 and #5.
- No logo/image ingestion — text + stats only.
- No wikitext-to-markdown rendering — raw fields are enough for the MVP.

---

## File structure after Sub-plan #3

```text
4casters/
├── db/
│   ├── schema.ts                                (extended)
│   ├── migrations/0001_liquipedia_entities.sql  (generated)
│   └── ...
├── services/
│   └── scraper/
│       ├── pyproject.toml                       (uv-managed)
│       ├── uv.lock
│       ├── .python-version                      (3.12)
│       ├── README.md
│       ├── src/
│       │   └── scraper/
│       │       ├── __init__.py
│       │       ├── __main__.py                  (enables `python -m scraper ...`)
│       │       ├── cli.py                       (Typer app)
│       │       ├── config.py                    (env loading)
│       │       ├── liquipedia/
│       │       │   ├── __init__.py
│       │       │   ├── client.py                (rate-limited HTTP)
│       │       │   └── parsers/
│       │       │       ├── __init__.py
│       │       │       ├── event.py
│       │       │       ├── team.py
│       │       │       ├── player.py
│       │       │       ├── match.py
│       │       │       └── wikitext.py          (shared utils)
│       │       ├── models.py                    (pydantic models mirroring DB rows)
│       │       └── db/
│       │           ├── __init__.py
│       │           ├── conn.py                  (asyncpg pool)
│       │           └── repo.py                  (UPSERT helpers)
│       └── tests/
│           ├── __init__.py
│           ├── conftest.py                      (pytest fixtures)
│           ├── fixtures/
│           │   ├── event_orbital_open.json      (captured MediaWiki response)
│           │   ├── team_halcyon.json
│           │   └── ...
│           ├── test_event_parser.py
│           ├── test_team_parser.py
│           ├── test_player_parser.py
│           ├── test_match_parser.py
│           └── test_repo_upsert.py
```

**Why `services/scraper/src/scraper/`:** Python src-layout prevents the common pitfall of pytest importing from the workspace dir instead of the installed package.

---

## Task 1: Expand Drizzle schema with real Liquipedia entities

**Files:**

- Modify: `db/schema.ts`
- Add: `db/migrations/0001_*.sql` (generated)

Using `liquipedia_slug` as primary key everywhere (design spec guardrail #2).

- [ ] **Step 1.1: Write the new schema**

Append to `db/schema.ts`:

```ts
import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  date,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Existing: appHealth — keep as-is.

// ─── Entities (read-only from frontend's perspective, written by Python scraper) ───

export const teams = pgTable("teams", {
  id: text("id").primaryKey(), // liquipedia_slug
  name: text("name").notNull(),
  short: text("short"),
  region: text("region"),
  liquipediaUrl: text("liquipedia_url").notNull(),
  firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const players = pgTable(
  "players",
  {
    id: text("id").primaryKey(), // liquipedia_slug
    name: text("name").notNull(),
    nationality: text("nationality"),
    currentTeamId: text("current_team_id").references(() => teams.id),
    liquipediaUrl: text("liquipedia_url").notNull(),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("players_current_team_idx").on(t.currentTeamId)],
);

export const rosterHistory = pgTable(
  "roster_history",
  {
    playerId: text("player_id").notNull().references(() => players.id, { onDelete: "cascade" }),
    teamId: text("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
    startDate: date("start_date").notNull(),
    endDate: date("end_date"), // null = current
    role: text("role"),
    sourceUrl: text("source_url").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.playerId, t.teamId, t.startDate] }),
    index("roster_history_team_idx").on(t.teamId),
  ],
);

export const events = pgTable("events", {
  id: text("id").primaryKey(), // liquipedia_slug
  name: text("name").notNull(),
  tier: text("tier"), // "S" | "A" | "B" | null
  region: text("region"), // "EU" | "NA" | "APAC" | "SAM" | null
  startDate: date("start_date"),
  endDate: date("end_date"),
  liquipediaUrl: text("liquipedia_url").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const matches = pgTable(
  "matches",
  {
    id: text("id").primaryKey(), // liquipedia slug / constructed "event_slug:stage:a-vs-b"
    eventId: text("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
    teamAId: text("team_a_id").notNull().references(() => teams.id),
    teamBId: text("team_b_id").notNull().references(() => teams.id),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    stage: text("stage"), // "QF" | "SF" | "Grand Final" | "Group A" | ...
    format: text("format"), // "Bo3" | "Bo5" | "Bo7" | "Bo9"
    scoreA: integer("score_a"), // null until match is played
    scoreB: integer("score_b"),
    liquipediaUrl: text("liquipedia_url"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("matches_event_idx").on(t.eventId), index("matches_scheduled_idx").on(t.scheduledAt)],
);
```

- [ ] **Step 1.2: Generate the migration**

```bash
npm run db:generate
```

Expected: `db/migrations/0001_<random-name>.sql` created with CREATE TABLE statements.

- [ ] **Step 1.3: Apply the migration to Supabase**

```bash
npm run db:migrate
```

Expected: 5 new tables present in Supabase dashboard (Tables: teams, players, roster_history, events, matches).

- [ ] **Step 1.4: Commit**

```bash
git add db/
git commit -m "feat(db): add Liquipedia entity tables (teams, players, roster_history, events, matches)"
```

---

## Task 2: Python project scaffold

**Files:**

- Create: `services/scraper/pyproject.toml`, `services/scraper/.python-version`, `services/scraper/README.md`
- Create: `services/scraper/src/scraper/__init__.py`, `__main__.py`, `cli.py`, `config.py`

- [ ] **Step 2.1: Install uv if not present**

```bash
# Windows (via winget if available, otherwise PowerShell install):
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
# Or, via pipx:
pipx install uv
```

Verify: `uv --version` → >= 0.5.

- [ ] **Step 2.2: Write `services/scraper/.python-version`**

```text
3.12
```

- [ ] **Step 2.3: Initialize the Python project with `uv init`**

```bash
cd services/scraper
uv init --package --name scraper --python 3.12 --src
```

This creates `pyproject.toml`, `src/scraper/__init__.py`, `uv.lock`, `.python-version`.

- [ ] **Step 2.4: Edit `services/scraper/pyproject.toml` to add dependencies**

```toml
[project]
name = "scraper"
version = "0.1.0"
description = "4casters Liquipedia ingestion service"
readme = "README.md"
requires-python = ">=3.12"
dependencies = [
  "httpx>=0.28.0",
  "asyncpg>=0.30.0",
  "pydantic>=2.9.0",
  "pydantic-settings>=2.6.0",
  "typer>=0.13.0",
  "rich>=13.9.0",
  "beautifulsoup4>=4.12.0",
  "lxml>=5.3.0",
]

[project.optional-dependencies]
dev = [
  "pytest>=8.3.0",
  "pytest-asyncio>=0.24.0",
  "respx>=0.21.0",
  "ruff>=0.8.0",
  "mypy>=1.13.0",
]

[project.scripts]
scraper = "scraper.cli:app"

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.pytest.ini_options]
testpaths = ["tests"]
asyncio_mode = "auto"

[tool.ruff]
line-length = 100
target-version = "py312"

[tool.ruff.lint]
select = ["E", "F", "I", "UP", "B", "SIM", "RUF"]
```

- [ ] **Step 2.5: Install deps**

```bash
cd services/scraper
uv sync --extra dev
```

Expected: `.venv/` created, `uv.lock` generated.

- [ ] **Step 2.6: Write `services/scraper/src/scraper/__main__.py`**

```python
"""Enable `python -m scraper ...` as an alternative to the `scraper` script."""
from scraper.cli import app

if __name__ == "__main__":
    app()
```

- [ ] **Step 2.7: Write `services/scraper/src/scraper/config.py`**

```python
"""Environment configuration loaded from .env or the process env."""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration. Reads from .env at repo root by default."""

    model_config = SettingsConfigDict(
        env_file="../../.env",  # repo root from services/scraper/
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str
    liquipedia_user_agent: str = "4casters/0.3 (https://github.com/Kekkozzz/4casters; contact@4casters.app)"
    liquipedia_min_interval_seconds: float = 2.0


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
```

Liquipedia requires a descriptive User-Agent with contact info per their API terms of use.

- [ ] **Step 2.8: Write `services/scraper/src/scraper/cli.py` (stub)**

```python
"""Scraper CLI entrypoint. Typer app registered in pyproject.toml as `scraper`."""
import typer
from rich.console import Console

app = typer.Typer(help="4casters Liquipedia ingestion CLI")
console = Console()


@app.command()
def hello() -> None:
    """Smoke command to verify the CLI is wired up correctly."""
    console.print("[green]hello from scraper[/green]")


@app.command()
def backfill(event_slug: str) -> None:
    """Backfill one event end-to-end: event → teams → players → rosters → matches."""
    # Implemented in Task 9.
    console.print(f"[yellow]stub: would backfill {event_slug}[/yellow]")
    raise typer.Exit(code=0)
```

- [ ] **Step 2.9: Verify CLI runs**

```bash
cd services/scraper
uv run scraper hello
```

Expected output: `hello from scraper` in green.

- [ ] **Step 2.10: Write `services/scraper/README.md`**

Content: project overview, quickstart (`uv sync`, `uv run scraper hello`), and how to run tests.

- [ ] **Step 2.11: Commit**

```bash
git add services/scraper .gitignore
git commit -m "feat(scraper): Python project scaffold (uv, Typer, pydantic, asyncpg)"
```

Also add `services/scraper/.venv/`, `services/scraper/**/__pycache__/`, `services/scraper/.pytest_cache/` to repo-root `.gitignore` if not already covered.

---

## Task 3: Liquipedia HTTP client (rate-limited, UA-compliant)

**Files:**

- Create: `services/scraper/src/scraper/liquipedia/__init__.py`, `services/scraper/src/scraper/liquipedia/client.py`
- Create: `services/scraper/tests/test_client.py`

- [ ] **Step 3.1: Write failing test first (TDD RED)**

File: `services/scraper/tests/test_client.py`

```python
"""Smoke tests for the Liquipedia HTTP client."""
import asyncio
import time

import pytest
import respx
from httpx import Response

from scraper.liquipedia.client import LiquipediaClient


@pytest.mark.asyncio
async def test_client_sends_descriptive_user_agent():
    async with respx.mock(base_url="https://liquipedia.net") as mock:
        route = mock.get("/rocketleague/api.php").mock(
            return_value=Response(200, json={"query": {"pages": {}}})
        )
        async with LiquipediaClient() as c:
            await c.api({"action": "query", "titles": "Main_Page"})
        assert route.called
        ua = route.calls.last.request.headers.get("user-agent", "")
        assert "4casters" in ua
        assert "contact" in ua.lower() or "github" in ua.lower()


@pytest.mark.asyncio
async def test_client_rate_limits_between_requests():
    async with respx.mock(base_url="https://liquipedia.net") as mock:
        mock.get("/rocketleague/api.php").mock(
            return_value=Response(200, json={"query": {}})
        )
        async with LiquipediaClient(min_interval_seconds=0.3) as c:
            start = time.monotonic()
            await c.api({"action": "query"})
            await c.api({"action": "query"})
            elapsed = time.monotonic() - start
        assert elapsed >= 0.3, f"rate limit not enforced, elapsed={elapsed:.3f}s"
```

Run:

```bash
cd services/scraper
uv run pytest tests/test_client.py -v
```

Expected: both tests fail with `ModuleNotFoundError: scraper.liquipedia.client`.

- [ ] **Step 3.2: Implement `LiquipediaClient`**

File: `services/scraper/src/scraper/liquipedia/client.py`

```python
"""Async Liquipedia MediaWiki API client with rate limiting and descriptive UA."""
from __future__ import annotations

import asyncio
from types import TracebackType
from typing import Any, Self

import httpx

from scraper.config import get_settings

LIQUIPEDIA_BASE = "https://liquipedia.net/rocketleague"


class LiquipediaClient:
    """Lightweight async wrapper around Liquipedia's MediaWiki API.

    Enforces a minimum interval between requests to respect Liquipedia's
    terms of use (1 req / 2s for anonymous clients). Always sends a
    descriptive User-Agent as required by their API guidelines.
    """

    def __init__(
        self,
        *,
        base_url: str = LIQUIPEDIA_BASE,
        user_agent: str | None = None,
        min_interval_seconds: float | None = None,
    ) -> None:
        settings = get_settings()
        self._base_url = base_url.rstrip("/")
        self._ua = user_agent or settings.liquipedia_user_agent
        self._min_interval = min_interval_seconds or settings.liquipedia_min_interval_seconds
        self._client: httpx.AsyncClient | None = None
        self._last_request: float = 0.0
        self._lock = asyncio.Lock()

    async def __aenter__(self) -> Self:
        self._client = httpx.AsyncClient(
            headers={"User-Agent": self._ua, "Accept-Encoding": "gzip"},
            timeout=30.0,
        )
        return self

    async def __aexit__(
        self,
        exc_type: type[BaseException] | None,
        exc: BaseException | None,
        tb: TracebackType | None,
    ) -> None:
        if self._client is not None:
            await self._client.aclose()

    async def api(self, params: dict[str, Any]) -> dict[str, Any]:
        """Call Liquipedia's api.php with the given params + format=json."""
        assert self._client is not None, "use `async with LiquipediaClient()` before calling api()"
        async with self._lock:
            now = asyncio.get_running_loop().time()
            wait = self._min_interval - (now - self._last_request)
            if wait > 0:
                await asyncio.sleep(wait)
            resp = await self._client.get(
                f"{self._base_url}/api.php",
                params={"format": "json", **params},
            )
            self._last_request = asyncio.get_running_loop().time()
        resp.raise_for_status()
        return resp.json()
```

- [ ] **Step 3.3: Run the tests — expect GREEN**

```bash
uv run pytest tests/test_client.py -v
```

- [ ] **Step 3.4: Commit**

```bash
git add services/scraper/src/scraper/liquipedia services/scraper/tests/test_client.py
git commit -m "feat(scraper): async Liquipedia HTTP client with rate limiting + UA"
```

---

## Task 4: Event parser

**Files:**

- Create: `services/scraper/src/scraper/liquipedia/parsers/__init__.py`, `event.py`, `wikitext.py`
- Create: `services/scraper/tests/fixtures/event_orbital_open.json`
- Create: `services/scraper/tests/test_event_parser.py`
- Create: `services/scraper/src/scraper/models.py` (add `EventRow`)

Approach: fetch the event page's wikitext, parse the infobox for tier/region/dates, extract the participating teams list. Save a small captured MediaWiki response as a JSON fixture so tests don't hit the network.

### 4.1 How to capture a Liquipedia fixture

Instructions (done once by the implementer):

```bash
cd services/scraper
uv run python -c "
import asyncio, json
from scraper.liquipedia.client import LiquipediaClient

async def main():
    async with LiquipediaClient() as c:
        data = await c.api({
            'action': 'parse',
            'page': 'Rocket_League_Championship_Series/2024/Major_1/Regional_1/EU',
            'prop': 'wikitext',
        })
    with open('tests/fixtures/event_real.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

asyncio.run(main())
"
```

Then hand-edit the fixture file if needed to strip extraneous fields.

**Note on fictional events:** Tests must reference the captured fixture, not the mock events like "Orbital Open" — those don't exist on real Liquipedia. Rename `fixtures/event_orbital_open.json` to `fixtures/event_real.json` with a real RLCS event slug.

### 4.2 Write the tasks (condensed)

- [ ] **Step 4.1: Capture fixture as described in 4.1 above**
- [ ] **Step 4.2: Write `EventRow` pydantic model in `models.py`**
- [ ] **Step 4.3: Write `test_event_parser.py` with 3 tests:** infobox extraction, tier normalization, teams list extraction (RED)
- [ ] **Step 4.4: Write `wikitext.py` with helpers:** `strip_templates()`, `extract_infobox(wikitext)`, `extract_sections(wikitext)`
- [ ] **Step 4.5: Write `parsers/event.py` with `parse_event(wikitext: str, slug: str) -> EventRow`** (GREEN)
- [ ] **Step 4.6: Commit**

```bash
git add services/scraper/src/scraper/liquipedia/parsers services/scraper/src/scraper/models.py services/scraper/tests/fixtures services/scraper/tests/test_event_parser.py
git commit -m "feat(scraper): Liquipedia event parser with wikitext helpers"
```

---

## Task 5: Team + roster parser

**Files:**

- Create: `services/scraper/src/scraper/liquipedia/parsers/team.py`
- Create: `services/scraper/tests/fixtures/team_*.json` (1-2 real team pages)
- Create: `services/scraper/tests/test_team_parser.py`
- Extend: `services/scraper/src/scraper/models.py` with `TeamRow` and `RosterHistoryRow`

Liquipedia team pages have a "Former Squads" section with historical player rosters. The parser must extract roster entries with `start_date` / `end_date` where present.

- [ ] **Step 5.1: Capture team fixtures (2 well-documented teams for test variety)**
- [ ] **Step 5.2: Write `TeamRow`, `RosterHistoryRow` pydantic models**
- [ ] **Step 5.3: Write `test_team_parser.py` — 4 tests:** team header fields, current roster extraction, historical roster extraction, edge case of partially-null dates (RED)
- [ ] **Step 5.4: Implement `parsers/team.py` → `parse_team(wikitext, slug)` returning `(TeamRow, list[RosterHistoryRow])`** (GREEN)
- [ ] **Step 5.5: Commit**

---

## Task 6: Player parser

**Files:**

- Create: `services/scraper/src/scraper/liquipedia/parsers/player.py`
- Create: `services/scraper/tests/fixtures/player_*.json`
- Create: `services/scraper/tests/test_player_parser.py`
- Extend: `services/scraper/src/scraper/models.py` with `PlayerRow`

- [ ] **Step 6.1: Capture 2 player fixtures**
- [ ] **Step 6.2: Write `PlayerRow` pydantic model**
- [ ] **Step 6.3: Write `test_player_parser.py` — 3 tests:** infobox header fields, nationality extraction, current team link resolution (RED)
- [ ] **Step 6.4: Implement `parsers/player.py` → `parse_player(wikitext, slug)` returning `PlayerRow`** (GREEN)
- [ ] **Step 6.5: Commit**

---

## Task 7: Match parser (bracket + group stage)

**Files:**

- Create: `services/scraper/src/scraper/liquipedia/parsers/match.py`
- Create: `services/scraper/tests/fixtures/bracket_*.json`
- Create: `services/scraper/tests/test_match_parser.py`
- Extend: `services/scraper/src/scraper/models.py` with `MatchRow`

Liquipedia renders brackets and group stages as templated wikitext (`{{Match|...}}`, `{{BracketMatchSummary|...}}`). The parser walks these templates and extracts match schedule + results when available.

**Scope cut:** Only extract team IDs + scheduled_at + stage + format + scores. Map/game-level breakdown is deferred to Sub-plan #4 (BLAST handles game data better).

- [ ] **Step 7.1: Capture 1-2 bracket fixtures (real RLCS bracket pages)**
- [ ] **Step 7.2: Write `MatchRow` pydantic model**
- [ ] **Step 7.3: Write `test_match_parser.py` — 5 tests:** single match extraction, full bracket walk, format detection (Bo3/Bo5/Bo7), stage naming ("QF", "SF", "Grand Final"), score extraction when played (RED)
- [ ] **Step 7.4: Implement `parsers/match.py` → `parse_matches(wikitext, event_slug)` returning `list[MatchRow]`** (GREEN)
- [ ] **Step 7.5: Commit**

---

## Task 8: Persistence layer (asyncpg + UPSERT repo)

**Files:**

- Create: `services/scraper/src/scraper/db/__init__.py`, `conn.py`, `repo.py`
- Create: `services/scraper/tests/test_repo_upsert.py`

Using asyncpg directly (no SQLAlchemy): simple, typed via pydantic models, UPSERT via `ON CONFLICT DO UPDATE` since we're idempotent.

- [ ] **Step 8.1: Write `db/conn.py` — asyncpg pool factory**

```python
"""Postgres connection pool, keyed off Settings.database_url."""
from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import asyncpg

from scraper.config import get_settings


@asynccontextmanager
async def pool() -> AsyncIterator[asyncpg.Pool]:
    settings = get_settings()
    # Supabase pooler uses pgbouncer in transaction mode — no prepared statements.
    p = await asyncpg.create_pool(
        settings.database_url,
        min_size=1,
        max_size=5,
        statement_cache_size=0,
    )
    try:
        yield p
    finally:
        await p.close()
```

- [ ] **Step 8.2: Write `db/repo.py` — UPSERT helpers for each entity**

One async function per entity: `upsert_team(pool, row)`, `upsert_player`, `upsert_roster_history`, `upsert_event`, `upsert_match`. Each uses `INSERT ... ON CONFLICT (id) DO UPDATE SET ... updated_at = now()`.

- [ ] **Step 8.3: Write `test_repo_upsert.py` — integration test against a local Postgres**

Requires `DATABASE_URL` in `.env`; skipped otherwise. Tests:

- `test_upsert_event_inserts_new_row` — first call INSERTs, returns the row
- `test_upsert_event_updates_existing` — second call with changed fields updates, updated_at advances
- `test_upsert_match_fk_enforcement` — inserting a match with a nonexistent event_id raises a foreign-key error

Mark these as `@pytest.mark.integration` so `pytest -m "not integration"` skips them in CI.

- [ ] **Step 8.4: Commit**

---

## Task 9: End-to-end CLI backfill command

**Files:**

- Modify: `services/scraper/src/scraper/cli.py` — replace the `backfill` stub with a real implementation
- Create: `services/scraper/src/scraper/pipeline.py`

- [ ] **Step 9.1: Write `pipeline.py` → `backfill_event(event_slug: str)` orchestrator**

Flow:

1. Fetch event wikitext.
2. Parse event → get list of participating team slugs.
3. For each team: fetch + parse team + roster. Collect player slugs from current + historical rosters.
4. For each unique player: fetch + parse player.
5. Fetch bracket page wikitext → parse matches.
6. Dedupe, then UPSERT in dependency order: teams → players → events → matches → roster_history.
7. Log a Rich summary table with counts.

Rate limit respected by the single LiquipediaClient instance (async lock in Task 3).

- [ ] **Step 9.2: Update `cli.py backfill` command to call `pipeline.backfill_event`**

```python
@app.command()
def backfill(event_slug: str) -> None:
    """Backfill one event end-to-end."""
    import asyncio
    from scraper.pipeline import backfill_event
    asyncio.run(backfill_event(event_slug))
```

- [ ] **Step 9.3: Smoke-test against real Liquipedia**

Pick a small completed event (e.g., a regional qualifier with <16 teams) to avoid hammering Liquipedia during development. Example:

```bash
cd services/scraper
uv run scraper backfill "Rocket_League_Championship_Series/2024/Major_1/Regional_1/EU"
```

Expected: CLI prints a summary table like:

```text
Backfill complete
  events    1
  teams    16
  players  48
  rosters  120
  matches  15
  elapsed  47s
```

And Supabase Table Editor shows the rows populated.

- [ ] **Step 9.4: Commit**

---

## Task 10: Lint, typecheck, final commit, milestone tag

- [ ] **Step 10.1: Run Python lint + type check**

```bash
cd services/scraper
uv run ruff check .
uv run mypy src
```

Fix any issues found.

- [ ] **Step 10.2: Run full test suite**

```bash
uv run pytest -m "not integration" -v
```

Expected: all parser + client unit tests pass.

- [ ] **Step 10.3: Extend root CI workflow to run Python tests**

Edit `.github/workflows/ci.yml` — add a `scraper` job:

```yaml
  scraper:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v4
      - name: Sync deps
        run: cd services/scraper && uv sync --extra dev
      - name: Lint
        run: cd services/scraper && uv run ruff check .
      - name: Typecheck
        run: cd services/scraper && uv run mypy src
      - name: Unit tests (skip integration)
        run: cd services/scraper && uv run pytest -m "not integration"
```

- [ ] **Step 10.4: Verify full CI green locally**

Run the `verify` job steps + the `scraper` job steps in sequence and confirm all green.

- [ ] **Step 10.5: Tag and push**

```bash
git tag -a v0.3.0-liquipedia -m "Sub-plan #3: Liquipedia scraper, one event backfilled end-to-end"
git push origin main --tags
```

---

## Definition of Done for Sub-plan #3

- [ ] `db/schema.ts` has teams, players, roster_history, events, matches tables
- [ ] `db/migrations/0001_*.sql` applied to Supabase
- [ ] `services/scraper/` is a working uv project; `uv run scraper hello` prints the smoke message
- [ ] `uv run scraper backfill <real-event-slug>` completes without error and populates the DB
- [ ] Supabase Table Editor shows ≥ 10 teams, ≥ 30 players, ≥ 10 matches for the chosen event
- [ ] `uv run pytest -m "not integration"` green (all parsers tested against captured fixtures)
- [ ] `uv run ruff check .` and `uv run mypy src` clean
- [ ] GitHub Actions `scraper` job green on `main`
- [ ] Git tag `v0.3.0-liquipedia` pushed
- [ ] No secrets committed (DATABASE_URL stays in `.env` which is gitignored)

---

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Liquipedia rate-limit ban for testing against real endpoints | All parser tests use captured JSON fixtures; only the Task 9 smoke hits real endpoints, and only once per developer. The client's 2s interval protects live runs. |
| Wikitext format drift across pages | Parsers are defensive: missing fields default to null; pydantic models use `Optional` liberally. Regression = add a fixture for the broken page. |
| asyncpg + Supabase transaction pooler statement cache bug | `statement_cache_size=0` in the pool config (documented inline). |
| Python env on Windows | uv handles Python install + venv creation; tested path is `uv run scraper ...` — avoids PATH issues. |
| schema drift between Drizzle and Python models | Pydantic models in `models.py` mirror DB row shape. When Drizzle schema changes, update models in the same PR. Integration tests in Task 8 catch mismatches. |
| Time to iterate on ONE event as MVP vs full backfill | Task 9 CLI accepts a single `event_slug` arg — iterate on one event at a time, don't try to scrape everything. Bulk mode comes in Sub-plan #3.5. |

---

## What's next (Sub-plan #4 preview)

After this closes: **BLAST stats pipeline** — second scraper in the same `services/scraper/` package, fetching 30d rolling stats for players and teams (GPG, Save%, Shot%, Demos/g, H2H aggregates). Writes to `player_stats_30d` and `team_stats_30d` tables (to be added to Drizzle schema). Same architecture: rate-limited client + parser + UPSERT repo + CLI subcommand.
