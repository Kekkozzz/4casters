# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project identity

4casters is a Rocket League pre-match sheet generator. Two processes, one repo, one Supabase DB:

- **Next.js 16 web app** at the repo root — auth, DAL, synthesis API route, viewer UI.
- **Python scraper** at `services/scraper/` — `uv run scraper …` populates the DB from Liquipedia, Ballchasing, YouTube, Gemini embeddings.

The scraper does not own schema. Drizzle (`db/schema.ts`) is the single source of truth; Python only UPSERTs.

## Common commands

Web (run from repo root):

```bash
npm install                         # one-time
npm run dev                         # Next.js dev server on :3000
npm run build                       # production build (smoke with dummy env on CI)
npm run typecheck                   # tsc --noEmit
npm run lint                        # ESLint 9 flat config
npm test                            # vitest run (headless)
npm test -- <path>                  # single file, e.g. tests/unit/validator.test.ts
npm run test:watch                  # vitest watch
npm run test:e2e                    # playwright
npm run db:generate                 # drizzle-kit generate (after schema.ts edits)
npm run db:migrate                  # drizzle-kit migrate (applies to DATABASE_URL)
npm run db:studio                   # drizzle-kit studio UI
```

Scraper (run from `services/scraper/`):

```bash
uv sync --extra dev                 # one-time
uv run pytest -q                    # all 113 tests (no DB, no network)
uv run pytest tests/test_match_parser.py -v   # single file
uv run pytest tests/test_match_parser.py::test_parses_all_matches_from_fixture -v  # single test
uv run ruff check src tests         # lint (auto-fix with --fix)
uv run mypy src                     # strict type check
uv run scraper --help               # CLI entrypoints
```

End-to-end smoke (full population flow, ≈5 min):

```bash
cd services/scraper
uv run scraper backfill "Rocket_League_Championship_Series/2026/Boston_Major"
uv run scraper stats refresh "Rocket_League_Championship_Series/2026/Boston_Major"
uv run scraper quotes liquipedia --all
uv run scraper quotes embed
```

Reset a partially-ingested event (ops utility):

```bash
node scripts/reset-event.mjs "<event_slug>"
```

## Architecture

Three layers, boundaries deliberately strict:

```text
presentation (app/, components/, lib/data/)
        │ reads server-only DAL, calls POST /api/sheet/generate
        ▼
synthesis (lib/synthesis/)
        │ packet-builder → GeminiFlashProvider → validator → orchestrator
        │ persists to generated_sheets(match_id)
        ▼
data (db/schema.ts + services/scraper/)
```

### Synthesis contract (non-obvious)

Two distinct `SheetOutput` types exist:

- `lib/synthesis/types.ts` — Zod schema passed to `generateObject()`. Model-output shape, every item has a `backing` path.
- `types/sheet.ts` — richer UI shape (`PlayerProfile`, `H2HRow`, `TeamCard`, `TrendDelta`, etc.) that existing sheet components render.

`lib/synthesis/ui-adapter.ts` `toUiSheet({ packet, output, generatedAtISO })` bridges them. When editing sheet components, respect that the Zod schema is the LLM contract — widening it means rewriting the prompt in `lib/synthesis/prompt.ts` and the validators in `lib/synthesis/validator.ts`.

The orchestrator (`lib/synthesis/orchestrator.ts`) runs the provider, validates, retries once on violations, strips invalid fields on second failure. The API route persists BOTH `packet` and `output` in `generated_sheets` so reloads don't re-run synthesis.

### DAL is server-only

Every file in `lib/data/` starts with `import "server-only"`. The DB client in `db/client.ts` is a `Proxy` around `drizzle(...)` so importing the DAL in a unit test doesn't require `DATABASE_URL` at module-load time — it only blows up if you actually touch `db.select(...)`. Don't change this to eager init.

### Supabase + route guarding

- `utils/supabase/{server,client,middleware}.ts` — canonical SSR template. `middleware.ts` exports `updateSession(request)` returning `{ supabaseResponse, user }`.
- `proxy.ts` at repo root (NOT `middleware.ts` — Next.js 16 renamed the convention) guards `/events`, `/matches`, `/sheets`, `/saved`, `/settings`. Honors `NEXT_PUBLIC_DEV_NO_AUTH=true` to short-circuit the check for local smoke.
- Magic-link callback lives at `app/auth/callback/route.ts`, which calls `exchangeCodeForSession` then redirects.

### Scraper resilience

`services/scraper/src/scraper/pipeline.py` maintains a `failed_teams: set[str]` that captures every non-success path (404, network, parse, upsert). The match loop skips any match whose `team_a_id` or `team_b_id` is in that set — this is what prevents a missing team page from crashing a multi-hour backfill with a FK violation. Adding a new upsert path? Add the same try/except + `failed_X` pattern.

`LiquipediaClient` retries transient 429s with exponential backoff (5s / 15s / 45s, honors `Retry-After`). Wikitext fetches use `action=query&prop=revisions` at the general 3s throttle; rendered HTML uses `action=parse` at the stricter 30s throttle. Don't drop below those.

Match parser (`services/scraper/src/scraper/liquipedia/parsers/match.py`) walks every `{{Match}}` in the wikitext regardless of nesting (group stages use top-level, playoffs use `{{Bracket}}`, older formats use `{{MatchList}}`). Stage/format are inherited from the SMALLEST enclosing wrapper.

### Quote corpus

- Dedup via `UNIQUE(content_hash)` — SHA-256 of NFKC-normalized quote text. Same quote surfaced from two sources lands once.
- `text-embedding-004` at 768 dims, matching the pgvector `vector(768)` column. Migration `db/migrations/0003_green_jubilee.sql` hand-adds `CREATE EXTENSION IF NOT EXISTS vector` and the ivfflat cosine index (drizzle-kit doesn't generate either).
- Twitter pipeline is deferred to v1.5 (documented in the SP5 plan file). Do not add it without user sign-off.

## DB connection gotchas

- **Use Transaction pooler** (port 6543), not Direct (IPv6) or Session (port 5432). The postgres-js client in `db/client.ts` sets `prepare: false` for pgbouncer-transaction compatibility. asyncpg in `services/scraper/src/scraper/db/pool.py` sets `statement_cache_size=0` for the same reason.
- `DATABASE_URL` with `aws-0-XXXX` placeholder is a common foot-gun — it's from `.env.example`, must be replaced with the real region from the Supabase dashboard.

## Guardrails that are tested

1. **No source → no show.** Quotes without `speaker_id` or `source_url` fail pydantic validation. UI always renders source chips; missing numeric stats render "no data available" explicitly.
2. **IDs, never strings.** Identity is `liquipedia_slug` throughout. If you catch yourself matching a player by name string, you have a bug.
3. **Validators before render.** `lib/synthesis/validator.ts` runs citation / quote / number checks on raw model output. Widening the prompt means adding corresponding validator branches.
4. **Idempotent UPSERTs.** Every write uses `ON CONFLICT DO UPDATE` (or `DO NOTHING` for dedup). Tests assume reruns are safe.

## Planning surface

Design decisions live under `docs/superpowers/plans/`, one file per sub-plan (SP1–SP7 shipped with corresponding `v0.X.0-*` tags). Market research + customer discovery live under `docs/research/`. Before a non-trivial refactor, check whether the affected sub-plan already documented constraints — it usually does.

## Env var aliases (scraper only)

`services/scraper/src/scraper/config.py` accepts either `GEMINI_API_KEY` or `GOOGLE_GENERATIVE_AI_API_KEY` for the same AI Studio token. The Next.js side reads `GOOGLE_GENERATIVE_AI_API_KEY` via `@ai-sdk/google`. Setting only the Google name works for both; don't add duplicate keys to `.env`.
