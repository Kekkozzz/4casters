# Sub-plan #7 — Wire-up (mock → real data)

**Depends on:** SP3 (Liquipedia), SP4 (Ballchasing), SP5 (quotes), SP6 (synthesis)
**Tag on done:** `v0.7.0-wireup`
**Ship target:** 4–6 days

## Goal

Replace the static `lib/mock/*` consumers in pages with a real data
access layer backed by the Supabase DB the SP3–SP6 scrapers populate.
The "Generate" button on the match list actually posts to
`/api/sheet/generate`, persists the result, and renders it.

Mock files stay in the repo as fixture/test sources — pages no longer
import from them.

## Schema additions (migration 0004)

```ts
// db/schema.ts
export const generatedSheets = pgTable("generated_sheets", {
  matchId: text("match_id")
    .primaryKey()
    .references(() => matches.id, { onDelete: "cascade" }),
  output: jsonb("output").$type<SheetOutput>().notNull(),
  packet: jsonb("packet").$type<MatchContextPacket>().notNull(),
  violations: jsonb("violations").$type<ValidationViolation[]>().notNull(),
  retried: boolean("retried").notNull(),
  provider: text("provider").notNull(),
  model: text("model").notNull(),
  tokensInput: integer("tokens_input").notNull(),
  tokensOutput: integer("tokens_output").notNull(),
  latencyMs: integer("latency_ms").notNull(),
  generatedAt: timestamp("generated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
```

Persisting both `packet` + `output` means a reload never re-triggers
synthesis; the viewer has everything it needs to render H2H, stats,
quotes, and model output in a single query.

## Task breakdown

| # | Task | Files |
|---|------|-------|
| 1 | `generated_sheets` table + migration 0004 | `db/schema.ts`, `db/migrations/0004_*.sql` |
| 2 | DAL: `lib/data/events.ts`, `matches.ts`, `sheets.ts` — server-only drizzle queries | `lib/data/*.ts` |
| 3 | Rewire `/events` page to server component + DAL | `app/(app)/events/page.tsx` (+ `events-client.tsx` split) |
| 4 | Rewire `/events/[slug]` page to server component + DAL | `app/(app)/events/[slug]/page.tsx` |
| 5 | Rewire `/matches/[id]` page: load persisted sheet, else render "Generate" CTA | `app/(app)/matches/[id]/page.tsx` |
| 6 | Update `/api/sheet/generate` route to persist result in `generated_sheets` and return `packet` alongside `output` | `app/api/sheet/generate/route.ts` |
| 7 | Client component for Generate button + progress; on success revalidate or client-navigate | `components/sheet/generate-button.tsx` |
| 8 | Rewire `/sheets` (My Sheets) to DAL | `app/(app)/sheets/page.tsx` |
| 9 | Empty-state banners when DB has no events ("run `scraper backfill …`") | existing page components |
| 10 | Keep mocks as-is for unit tests; pages no longer import them | — |
| 11 | Commit + tag v0.7.0-wireup | — |

## Non-goals

- Real-time progress streaming during generation → v1.5; MVP shows a
  spinner and waits.
- Authoring interface for editing sheet fields inline → v1.5.
- Event/match filters hitting the server → MVP filters client-side on
  the full event list (ingestion volume is <200 events).
- E2E (playwright) rewrite against a live DB → SP8 (deploy+beta).
- Refactoring sheet components to SheetOutput shape → this sub-plan;
  we add adapter functions that reshape DB rows to the existing
  component props so the port stays mechanical.
