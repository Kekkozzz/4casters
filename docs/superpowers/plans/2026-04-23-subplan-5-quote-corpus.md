# Sub-plan #5 — Quote corpus

**Parent spec:** `docs/specs/design-spec.md` §5.3
**Depends on:** SP3 (player slugs + liquipedia_url)
**Ship target:** 1–2 weeks
**Tag on done:** `v0.5.0-quotes`

## Goal

Populate a `quotes` table with attributed, sourced, de-duplicated quotes
per player, with pgvector embeddings so the synthesis layer (SP6) can
retrieve top-K candidates for a match by semantic similarity to
"{team_a} vs {team_b} recent form".

Guardrail reminder: **no source → no show**. Ingestion rejects any row
missing `source_url` or `speaker_id`. The UI renders a clickable source
chip on every quote card.

## Source strategy (ordered by risk)

We ship in three phases, each producing a working commit. The order is
deliberate: cheapest/lowest-risk first so the feature is already useful
before we touch the harder sources.

### Phase A — Liquipedia Quotes section (risk 0)

Many Rocket League player pages have a `==Quotes==` section (community
curated, already sourced in Liquipedia's refs). Parser + repo, uses the
SP3 LiquipediaClient we already have. No new dependencies.

- `speaker_id`: player slug (already in DB)
- `source_url`: player's liquipedia page + `#Quotes` anchor
- `source_type`: `"liquipedia"`
- `source_timestamp`: null (Liquipedia doesn't timestamp individual quotes)

### Phase B — YouTube transcripts (risk medium)

Whitelist ~10 channels (RLCS official, Liefx, Shoe, JohnnyBoi_i, etc.),
fetch videos with `youtube-transcript-api` + metadata, split into
speaker-attributed chunks.

- **Speaker diarization problem.** Transcripts don't tell us who spoke.
  Two realistic approaches:
  1. **Channel-level attribution**: if the channel is a player's personal
     channel (e.g., Liefx, Shoe), attribute all quotes to that player.
     Works for ~5 of the 10 channels.
  2. **Interview detection**: for RLCS officially-produced content
     (player interviews), the title usually names the subject. Parse
     titles like "RLCS Interview: itachi after 3-0 win" → attribute to
     `itachi` if name matches a known player slug.
  3. Leave multi-speaker content (round-table podcasts) out of MVP.
- **Known risk**: youtube-transcript-api occasionally breaks when
  Google changes their internal endpoints. Fallback: skip that channel
  for one run; log the error; retry next cron tick.

- `speaker_id`: resolved via channel-mapping or title-parsing; reject if unresolved
- `source_url`: `https://youtu.be/{video_id}?t={seconds}`
- `source_type`: `"youtube"`
- `source_timestamp`: seconds into video

### Phase C — Twitter/X (risk HIGH — verify before coding)

**The octane lesson applies here.** We already know:
- `snscrape` has been dead since Twitter's 2023 API lockdown.
- Twitter API v2 costs $100/month minimum (Basic tier) for writes and
  decent read volumes; the free tier is effectively useless (1,500
  tweets/month).
- Nitter (community alt-frontend) is mostly dead as of 2024.
- Playwright-based scraping is against ToS and fragile.

**Before writing any Twitter code** we'll verify which of these actually
works in April 2026:
1. Probe current Twitter API v2 free tier quotas.
2. Check if any community alternative (e.g., `tweety`, `twscrape`) has
   active maintainers and working auth.
3. If none viable at zero cost, recommend the user either (a) pay $100/mo
   for Basic tier, or (b) drop Twitter from MVP and add it in v1.5.

No commitment to ship Phase C until the probe confirms it's buildable.
We will flag this decision before Task 7.

## Schema additions (migration 0003)

```ts
// db/schema.ts
import { pgTable, text, timestamp, uuid, real, index } from "drizzle-orm/pg-core";
import { vector } from "drizzle-orm/pg-core"; // requires pgvector extension

// NB: pgvector must be enabled first:
//   CREATE EXTENSION IF NOT EXISTS vector;

export const quotes = pgTable(
  "quotes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    speakerId: text("speaker_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    sourceUrl: text("source_url").notNull(),
    sourceType: text("source_type").notNull(), // "liquipedia" | "youtube" | "twitter"
    sourceTimestamp: timestamp("source_timestamp", { withTimezone: true }),
    contentHash: text("content_hash").notNull(), // for de-dup
    embedding: vector("embedding", { dimensions: 768 }),
    capturedAt: timestamp("captured_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("quotes_speaker_idx").on(t.speakerId),
    index("quotes_source_type_idx").on(t.sourceType),
    // ivfflat index for embedding similarity search added via raw SQL
    // in the migration since drizzle doesn't codegen vector ops yet.
  ],
);
```

**De-dup via content_hash.** Hash = SHA-256 of `lower(trim(text))`. If
two ingestions produce the same hash we keep the first insertion;
`ON CONFLICT (content_hash) DO NOTHING`. Same quote surfaced from two
sources is a win for the caster but we only store it once with the
earliest source.

**Embedding dimension 768** to match Gemini's `embedding-001` model
(available via `@google/generative-ai`). Embeddings are populated
lazily by a background job, not inline during ingestion.

## Task breakdown

| # | Task | Phase | TDD | Notes |
|---|------|-------|-----|-------|
| 1 | Schema + pgvector extension + migration 0003 | A | — | Supabase supports pgvector out of the box; just `CREATE EXTENSION` |
| 2 | `QuoteSource` enum + `ParsedQuote` pydantic model + content_hash helper | A | Unit tests on hash determinism | Shared across phases |
| 3 | Liquipedia Quotes section parser | A | Fixture-based tests | Extract `==Quotes==` block + `{{Quote}}` templates from player wikitext |
| 4 | Repo: `upsert_quote` with `ON CONFLICT (content_hash) DO NOTHING` | A | Extend test_repo.py | Also `count_quotes_for_speaker` helper for logging |
| 5 | Pipeline Phase A: `ingest_liquipedia_quotes(player_slug)` orchestrator | A | Integration test with fake client | Called from existing liquipedia backfill loop |
| 6 | CLI: `scraper quotes liquipedia <player_slug>` + `--all` | A | smoke | |
| 7 | **Verify Twitter viability** (no code yet) | C-precheck | — | Research task; reports back options + cost |
| 8 | YouTube client: fetch transcripts for channel whitelist | B | respx + youtube-transcript-api mock | |
| 9 | YouTube ingestion: title-based + channel-based speaker resolution | B | Unit tests on canned titles | |
| 10 | Pipeline Phase B + CLI: `scraper quotes youtube` | B | | |
| 11 | Embedding backfill job: batch generate embeddings for rows with NULL embedding | shared | Unit tests with fake embedder | Runs async, separate CLI `scraper quotes embed` |
| 12 | Twitter (if probe passed) OR document deferred | C | conditional | |
| 13 | Docs + tag v0.5.0-quotes | — | — | |

## User-gated prerequisites

Before Task 11 (embedding backfill):
- Get Gemini API key at https://aistudio.google.com/app/apikey
- Add to `.env`: `GEMINI_API_KEY=<key>`

YouTube transcripts need no key (youtube-transcript-api is public).

Twitter API key decision deferred to after Task 7 probe.

## Non-goals (explicit)

- Podcast audio transcripts → v1.5 after PMF signal.
- Reddit → out of MVP (low signal/noise ratio for caster prep).
- News sites / RSS → out.
- Live tweet ingestion during matches → v2 live companion.
- Fancy speaker diarization on multi-guest podcasts → out for v1.
