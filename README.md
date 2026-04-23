# 4casters

AI caster prep tool for Rocket League — pre-match sheets with every quote and statistic traceable to a clickable source. Target user: mid-tier professional casters who spend 2–3h tab-hopping Liquipedia, Ballchasing, and interview recaps before every broadcast.

Positioning: **aggregator first, synthesis second.** Every data point in a sheet is fetched deterministically from a tracked source; the LLM only composes prose around facts the pipeline hands it, never looks them up. Validators reject any output whose claims don't resolve back to the input packet.

## Status

| Milestone | Tag |
| --- | --- |
| SP1 Scaffolding (Next.js 16 + Tailwind v4 + Supabase + Drizzle) | `v0.1.0-scaffold` |
| SP2 Frontend port from Claude design prototype | `v0.2.0-frontend` |
| SP3 Liquipedia ingestion (events, teams, rosters, players, matches) | `v0.3.0-liquipedia` |
| SP4 Ballchasing stats pipeline (per-event player/team aggregates) | `v0.4.0-ballchasing` |
| SP5 Quote corpus (Liquipedia Quotes + YouTube transcripts + Gemini embeddings) | `v0.5.0-quotes` |
| SP6 Synthesis layer (Gemini via AI SDK + 3-layer validation) | `v0.6.0-synthesis` |
| SP7 Wire-up mock → real (DAL + persisted sheets + Generate flow) | `v0.7.0-wireup` |
| SP8 Deploy + beta launch | next |

Twitter/X quote ingestion is **deferred to v1.5** after an April 2026 probe confirmed no zero-cost zero-ToS-risk path (rationale in [`docs/superpowers/plans/2026-04-23-subplan-5-quote-corpus.md`](./docs/superpowers/plans/2026-04-23-subplan-5-quote-corpus.md)).

## Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│ PRESENTATION  Next.js 16 App Router (TS + Tailwind v4)     │
│    Server components read from lib/data/* (DAL)             │
│    Client components hydrate progressively                  │
│    Supabase Auth (magic link + Google OAuth)                │
└──────────────▲──────────────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────────────┐
│ SYNTHESIS  POST /api/sheet/generate                         │
│    packet-builder (Drizzle) → GeminiFlashProvider           │
│    (AI SDK generateObject + Zod SheetOutputSchema)          │
│    3-layer validator: citation / quote / number             │
│    Persists to generated_sheets (packet + output)           │
└──────────────▲──────────────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────────────┐
│ DATA  Supabase Postgres (+ pgvector) via drizzle-orm       │
│    Ingested by: services/scraper/ (Python, uv)              │
│    - Liquipedia: events, teams, rosters, players, matches   │
│    - Ballchasing: per-event player + team aggregate stats   │
│    - Quotes: Liquipedia ==Quotes== + YouTube transcripts    │
│    - Embeddings: Gemini text-embedding-004 (pgvector 768d)  │
└─────────────────────────────────────────────────────────────┘
```

**Guardrails locked into the code:**

1. **No source → no show.** Every quote and number carries a clickable source; missing values render "no data available" explicitly.
2. **IDs, never strings.** Identity keyed to `liquipedia_slug`. String matching on player/team names is a bug.
3. **AI = synthesis only.** Validators reject output fields whose `backing` path doesn't resolve in the input packet.
4. **Fail explicit.** Partial pipeline runs return typed reports listing what was skipped and why.

## Stack

- **Frontend**: Next.js 16 (App Router) + React 19 + TypeScript strict + Tailwind CSS v4
- **Auth + DB**: Supabase (SSR cookies, Transaction pooler) + Drizzle ORM + pgvector
- **AI**: Gemini via `@ai-sdk/google` (synthesis) + `text-embedding-004` REST (corpus)
- **Scraper**: Python 3.12 + uv + httpx + asyncpg + Typer CLI
- **Testing**: Vitest + Testing Library (web) + pytest + respx (scraper); Playwright E2E wired in SP8
- **Build/CI**: GitHub Actions runs typecheck + lint + vitest for web; ruff + mypy + pytest for scraper

## Quickstart (local)

**Prereqs**: Node 20+, Python 3.12+, [uv](https://docs.astral.sh/uv/), a Supabase project.

### 1. Install + env

```bash
npm install
cp .env.example .env
# Fill in values — see ".env setup" below.

cd services/scraper
uv sync --extra dev
cd ../..
```

### 2. Apply schema

```bash
npm run db:migrate
```

### 3. Populate the DB via the scraper

```bash
cd services/scraper

# Ingest one Liquipedia event end-to-end (≈3–5 min, rate-limited)
uv run scraper backfill "Rocket_League_Championship_Series/2026/Boston_Major"

# Pull per-event stats from ballchasing (auto-matches group by name+date)
uv run scraper stats refresh "Rocket_League_Championship_Series/2026/Boston_Major"

# Ingest quotes for every player in the DB (Liquipedia ==Quotes== sections)
uv run scraper quotes liquipedia --all

# Ingest quotes from configured YouTube channels
# (populate DEFAULT_CHANNELS in src/scraper/quotes/youtube_channels.py first)
uv run scraper quotes youtube --max-videos 20

# Backfill Gemini embeddings for semantic quote retrieval
uv run scraper quotes embed
```

If the ballchasing auto-match can't find the group, link it manually:

```bash
uv run scraper stats link "Rocket_League_Championship_Series/2026/Boston_Major" <ballchasing-group-id>
uv run scraper stats refresh "Rocket_League_Championship_Series/2026/Boston_Major"
```

### 4. Run the web app

```bash
npm run dev
```

Open http://localhost:3000, sign in with email magic link or Google OAuth, pick an event, click a match, hit **Generate sheet**. First generation takes 10–30s; reloads use the persisted copy.

### .env setup

| Key | Required | Where to get it |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | yes | same screen, the anon/publishable key |
| `DATABASE_URL` | yes | Supabase → Database → Connection string → **Transaction pooler** (port 6543) |
| `GOOGLE_GENERATIVE_AI_API_KEY` | yes | [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) — used by both synthesis and embeddings |
| `BALLCHASING_API_KEY` | yes for stats | [ballchasing.com](https://ballchasing.com) → Profile → generate token |
| `NEXT_PUBLIC_DEV_NO_AUTH` | optional | Set to `true` to skip the auth guard during local smoke tests when Supabase email delivery is rate-limited |

Supabase auth config (dashboard → Authentication → URL Configuration):

- **Site URL**: `http://localhost:3000` during dev; production domain otherwise.
- **Redirect URLs**: must include `http://localhost:3000/auth/callback` (and `http://localhost:3000/auth/callback?*`) or Supabase falls back to Site URL and your magic links go to the wrong origin.

## Repository layout

```text
4casters/
├── app/
│   ├── (app)/                 Authenticated routes (events, matches, sheets)
│   ├── api/sheet/generate/    POST endpoint that runs the synthesis pipeline
│   ├── auth/callback/         Supabase SSR magic-link exchange
│   └── login/                 Unauthenticated landing + sign-in
├── components/                UI primitives, sheet sections, events table
├── lib/
│   ├── data/                  Server-only DAL (events, matches, sheets)
│   ├── synthesis/             Zod schemas, packet-builder, validators, Gemini provider, orchestrator, ui-adapter
│   └── mock/                  Fixture data kept for unit tests only
├── db/
│   ├── schema.ts              Drizzle single source of truth (11 tables)
│   └── migrations/            Generated SQL
├── proxy.ts                   Next.js 16 route guard (Supabase session)
├── utils/supabase/            SSR client helpers (canonical template)
├── services/scraper/          Python ingestion (own README)
├── scripts/                   Ops utilities (reset-event.mjs, …)
├── docs/
│   ├── research/              Market + customer discovery
│   └── superpowers/plans/     Sub-plan implementation plans (SP1–SP8)
├── tests/
│   ├── unit/                  Vitest + Testing Library
│   └── e2e/                   Playwright (expanded in SP8)
└── prototype/                 Claude design reference (visual-only, not production)
```

## Testing

```bash
npm run typecheck               # tsc --noEmit
npm run lint                    # eslint
npm test                        # vitest run (52 tests as of SP7)
npm run test:e2e                # playwright

cd services/scraper
uv run pytest -q                # 113 tests as of SP5
uv run ruff check src tests
uv run mypy src
```

## Design principles (non-negotiable)

1. **Aggregation over generation.** The product's job is to reduce tab-hopping. Synthesis is a thin layer on top; data is the product.
2. **Validators before render.** Any model output reaches the UI only after passing citation / quote / number checks. Failing fields are stripped rather than shown.
3. **Typed end-to-end.** Zod schemas for API boundaries, Drizzle-inferred types for DB, pydantic for scraper, TS strict mode throughout.
4. **Adapter pattern for providers.** `SynthesisProvider` interface + `GeminiFlashProvider` means model swap is one file. Same for ingestion clients.
5. **Idempotent pipelines.** Every UPSERT is `ON CONFLICT DO UPDATE`; rerunning a backfill is safe and cheap.

## Troubleshooting

- **Magic link redirects to production**: Site URL / Redirect URL whitelist in Supabase doesn't include your localhost origin.
- **DB query fails with `relation "events" does not exist`**: migrations never applied to this Supabase project. Run `npm run db:migrate`.
- **`getaddrinfo ENOTFOUND aws-0-XXXX`**: `DATABASE_URL` still contains the placeholder — grab the real Transaction pooler URI from Supabase.
- **Backfill dies with `HTTP 429 from liquipedia`**: IP-level rate limit. The client retries with exponential backoff (5s/15s/45s); if still failing, wait 5–10 minutes.
- **`GEMINI_API_KEY is not set`**: scraper accepts either `GEMINI_API_KEY` or `GOOGLE_GENERATIVE_AI_API_KEY`. Set the Google one and both services see it.

## Further reading

- [`docs/superpowers/plans/`](./docs/superpowers/plans/) — one sub-plan per milestone, each explaining design decisions, task breakdown, and tradeoffs
- [`docs/research/`](./docs/research/) — esports market research, Twitter customer-discovery report
- [`services/scraper/README.md`](./services/scraper/README.md) — deeper scraper internals
