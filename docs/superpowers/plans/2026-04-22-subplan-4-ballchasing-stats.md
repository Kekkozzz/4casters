# Sub-plan #4 — Ballchasing stats pipeline

**Parent spec:** `docs/specs/design-spec.md` §5.2
**Depends on:** SP3 (Liquipedia ingestion — events + teams + players slugs)
**Ship target:** 1 week
**Tag on done:** `v0.4.0-ballchasing`

## Why Ballchasing (not Octane or BLAST)

SP3 used Liquipedia as authoritative source for identity (slugs, rosters, schedule).
For per-player / per-team stats (30d rolling, per-event aggregates) we picked
[ballchasing.com](https://ballchasing.com/doc/api) after verifying the alternatives:

- Octane ZSR — dead since 2022 (repos archived as `-old`, endpoint ConnRefused).
- BLAST.tv — no public API, XHR gated 403 from server-side, would need Playwright.
- joshua-arts GraphQL — Heroku free-tier down since 2022.

Ballchasing covers the per-replay stats that the master spec flags as gaps
(save-per-shot, demos, bumps — dRektRL's feedback) and is the same site Jorby
mentioned using daily. Every stat row will have a `replay_id` backing a clickable
source URL per the `no-source-no-show` guardrail.

## Decisions locked in

1. **Group-based ingestion.** Every RLCS/Major/Regional has a "group" in
   ballchasing (maintained by admins). Our unit of ingestion is a group, not a
   single replay. `GET /groups/{id}` returns the cumulative + game-average
   stats per player and per team we need.
2. **Manual group link fallback.** Group discovery via search (`?name=...`)
   is fuzzy. If we cannot auto-match an event to a group with high confidence,
   we store nothing and let the user paste the group id via
   `scraper stats link <event_slug> <group_id>`. Explicit > silent.
3. **Fail loud, show "no data".** If ballchasing has no data for an event,
   the `/matches/[id]` view displays "no data available" on the stat fields.
   Never fabricate and never hide.
4. **Rolling 30d is derived, not stored.** We store point-in-time event stats
   and compute rolling-30d on read (or in a view), so backfill is idempotent
   and we never have to "expire" rows.

## Schema additions

```ts
// db/schema.ts
export const eventGroups = pgTable("event_groups", {
  eventId: text("event_id")
    .primaryKey()
    .references(() => events.id, { onDelete: "cascade" }),
  ballchasingGroupId: text("ballchasing_group_id").notNull(),
  linkedBy: text("linked_by"), // "auto" | "manual"
  linkedAt: timestamp("linked_at", { withTimezone: true }).notNull().defaultNow(),
});

export const eventPlayerStats = pgTable(
  "event_player_stats",
  {
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    playerId: text("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    gamesPlayed: integer("games_played").notNull(),
    goalsPerGame: doublePrecision("goals_per_game"),
    assistsPerGame: doublePrecision("assists_per_game"),
    savesPerGame: doublePrecision("saves_per_game"),
    shotsPerGame: doublePrecision("shots_per_game"),
    shootingPct: doublePrecision("shooting_pct"),
    savePct: doublePrecision("save_pct"),
    demosPerGame: doublePrecision("demos_per_game"),
    boostPerMin: doublePrecision("boost_per_min"),
    sourceGroupId: text("source_group_id").notNull(),
    capturedAt: timestamp("captured_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.eventId, t.playerId] })],
);

export const eventTeamStats = pgTable(
  "event_team_stats",
  {
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    teamId: text("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    gamesPlayed: integer("games_played").notNull(),
    wins: integer("wins").notNull(),
    losses: integer("losses").notNull(),
    goalsFor: integer("goals_for"),
    goalsAgainst: integer("goals_against"),
    sourceGroupId: text("source_group_id").notNull(),
    capturedAt: timestamp("captured_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.eventId, t.teamId] })],
);
```

Guardrails:
- Every stat row carries `source_group_id` → clickable URL is
  `https://ballchasing.com/group/{source_group_id}`.
- Null numeric fields surface as "no data available" in the UI.

## Task breakdown

| # | Task | Deliverable | TDD |
|---|------|-------------|-----|
| 1 | Schema + migration 0002 | `db/schema.ts`, migration SQL, apply to Supabase | Drizzle generate + smoke |
| 2 | Ballchasing HTTP client | `services/scraper/src/scraper/ballchasing/client.py` with API-key auth, 2 req/s rate limit, `get_group`, `search_groups` | respx-mocked unit tests |
| 3 | Group discovery | `ballchasing/discovery.py` — `find_group_for_event(event)` with fuzzy name+date match; returns `(group_id, confidence)` or `None` | Unit tests on canned search responses |
| 4 | Group stats parser | `ballchasing/parsers.py` — `parse_group_stats(payload) -> (list[EventPlayerStat], list[EventTeamStat])` | Fixture-based tests |
| 5 | Repo upserts | `db/repo.py` add `upsert_event_group`, `upsert_event_player_stat`, `upsert_event_team_stat` | Extend existing fake-conn tests |
| 6 | Pipeline | `pipeline_stats.py` — `refresh_event_stats(event_slug)` orchestrator (link if missing → fetch → upsert) | Integration test with fake client + fake conn |
| 7 | CLI wire-up | `scraper stats refresh <slug>`, `scraper stats link <slug> <group_id>` | smoke via `uv run` |
| 8 | CI | No change (existing `scraper` job already runs pytest/ruff/mypy) | — |
| 9 | Docs + tag | Add ballchasing section to README, tag `v0.4.0-ballchasing` | — |

## User-gated prerequisites

Before Task 2:
- Sign up at https://ballchasing.com
- Generate API token in profile → Settings
- Add to `.env`: `BALLCHASING_API_KEY=<token>`

Everything else runs without blocking.

## Non-goals (explicit)

- Real-time updates during matches → v2 live companion
- Replay download + our own replay parsing → unnecessary given ballchasing aggregates
- Rolling 30d stored as materialized rows → derived at read time
- BLAST.tv fallback → v1.5 only if ballchasing coverage proves insufficient
- Ingestion of community events without a ballchasing group → accept "no data"
