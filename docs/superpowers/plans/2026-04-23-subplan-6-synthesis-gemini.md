# Sub-plan #6 — Synthesis layer (Gemini)

**Parent spec:** `docs/specs/design-spec.md` §6
**Depends on:** SP3 (events/teams/players/matches), SP4 (event_player_stats, event_team_stats), SP5 (quotes + embeddings)
**Ship target:** 1 week
**Tag on done:** `v0.6.0-synthesis`

## Goal

Given a `match_id`, produce a validated SheetOutput (narrative_hooks,
talking_points, selected_quotes, player_notables) ready for the
`/matches/[id]` UI to render. The synthesis layer never fabricates
facts — it synthesizes prose around deterministic data the caller
provides in a Match Context Packet.

Three guardrails enforced at the code level:
1. **Citation validator** — every `backing` in the output must exist
   as a key/path in the input packet.
2. **Quote integrity** — `selected_quotes[].text` must match letter-
   for-letter (whitespace-tolerant) a quote in `candidate_quotes`.
3. **Number check** — any digit sequence in hooks/talking_points must
   appear somewhere in the packet text.

Any validator failure triggers one retry with feedback; second failure
strips the offending field rather than returning to the user.

## Tech choice: AI SDK via Vercel AI Gateway

- Install `ai` + `@ai-sdk/google` (or use gateway string routing).
- Use `generateObject({ model: "google/gemini-3-flash-preview", schema })`
  so the output is validated at the SDK layer before we get it.
- Rationale: deployment target is Vercel; the Gateway gives us model
  observability, cost tracking, and one-line model swaps without
  touching the adapter code. Aligned with the 2026-02 Vercel
  knowledge-update that flagged provider-specific packages as
  antipattern for new projects.
- SynthesisProvider interface stays so we can swap to direct Gemini
  REST, Claude, or OpenAI if AI Gateway costs become a concern.

If `gemini-3-flash-preview` isn't live at build time we fall back to
`gemini-2.5-flash` in the adapter (one-line change, documented in the
provider file).

## Match Context Packet shape

```ts
// lib/synthesis/types.ts
export type MatchContextPacket = {
  match: {
    id: string;
    event_id: string;
    event_name: string;
    stage: string | null;
    format: string | null;
    scheduled_at: string | null;
    team_a: { id: string; name: string; region: string | null };
    team_b: { id: string; name: string; region: string | null };
  };
  h2h: Array<{
    date: string; // ISO
    team_a_score: number;
    team_b_score: number;
    event_name: string;
    liquipedia_url: string | null;
  }>;
  roster_crossings: Array<{
    type: "ex_teammates" | "ex_rivals";
    player_ids: string[];
    team_id: string;
    team_name: string;
    period_start: string; // ISO
    period_end: string | null;
    source_url: string;
  }>;
  player_stats_30d: Array<{
    player_id: string;
    player_name: string;
    team_id: string;
    games_played: number;
    goals_per_game: number | null;
    saves_per_game: number | null;
    shooting_pct: number | null;
    save_pct: number | null;
    demos_per_game: number | null;
    boost_per_min: number | null;
    source_group_id: string | null; // backing link
  }>;
  candidate_quotes: Array<{
    id: string;
    speaker_id: string;
    speaker_name: string;
    text: string;
    source_url: string;
    source_type: "liquipedia" | "youtube" | "twitter";
    similarity: number; // 0..1 from pgvector
  }>;
};
```

## SheetOutput shape (Zod schema for SDK generateObject)

```ts
export const SheetOutputSchema = z.object({
  narrative_hooks: z.array(z.object({
    title: z.string().min(1),
    body: z.string().min(1),
    backing: z.string(),  // path into packet, e.g. "roster_crossings[0]"
  })).min(2).max(4),

  talking_points: z.array(z.object({
    trigger: z.string().min(1),
    say: z.string().min(1),
    backing: z.string(),
  })).min(4).max(8),

  selected_quotes: z.array(z.object({
    candidate_id: z.string(),
    text: z.string(),
    context: z.string().min(1),
  })).max(3),

  player_notables: z.array(z.object({
    player_id: z.string(),
    notables: z.array(z.object({
      text: z.string(),
      backing: z.string(),
    })).max(3),
  })).max(6),
});
```

## Task breakdown

| # | Task | Deliverable | TDD |
|---|------|-------------|-----|
| 1 | Install `ai` + `@ai-sdk/google`; add `GOOGLE_GENERATIVE_AI_API_KEY` guards | `package.json`, `lib/env.ts` | — |
| 2 | Zod schemas for `MatchContextPacket` + `SheetOutput` | `lib/synthesis/types.ts` | vitest schema round-trip |
| 3 | `packet-builder.ts` — Drizzle queries (match + h2h + roster crossings + stats + top-K quotes via pgvector cosine) | `lib/synthesis/packet-builder.ts` | unit tests with SQLite drizzle-in-memory OR mock the db client |
| 4 | 3-layer validators (citation / quote / number) | `lib/synthesis/validator.ts` | unit tests with synthetic packets |
| 5 | `SynthesisProvider` interface + `GeminiFlashProvider` via AI SDK | `lib/synthesis/provider.ts`, `lib/synthesis/gemini-provider.ts` | unit test with SDK mock |
| 6 | API route: POST `/api/sheet/generate` with `{ match_id }` → persists + returns SheetOutput | `app/api/sheet/generate/route.ts` | integration test with mocked provider |
| 7 | Eval log table + writes (packet + raw + validated + tokens + latency) | migration 0004, `lib/synthesis/eval.ts` | unit |
| 8 | 8k input-token guardrail: trim candidate_quotes + h2h if over | `packet-builder.ts` | unit |
| 9 | Wire the sheet viewer to call the API (still behind feature flag in SP7) | n/a this sub-plan | n/a |
| 10 | Tag v0.6.0-synthesis | — | — |

## User-gated prerequisites

Before Task 1:
- Get a Google Generative AI API key at https://aistudio.google.com/app/apikey
  (same account as SP5 embeddings is fine; separate key recommended).
- Add to `.env`: `GOOGLE_GENERATIVE_AI_API_KEY=<key>`

Optional (if switching to AI Gateway later):
- Sign in to Vercel AI Gateway at https://vercel.com/ai-gateway
- Add gateway token to `.env`: `AI_GATEWAY_API_KEY=<key>`

## Non-goals (explicit)

- UI changes → SP7 (wire-up) handles the consumer side.
- Streaming responses → v1.5; MVP waits 10–30s server-side and returns
  full sheet in one shot.
- Multi-step agent workflows → not needed; synthesis is one-shot.
- Self-RAG / retrieval post-generation → top-K on input is enough.
- Persisted eval dashboard UI → v1.1 (JSONL log on Axiom is enough for MVP).

## Risks

1. **Gemini 3 Flash Preview availability.** If the model string
   doesn't resolve, we fall back to `gemini-2.5-flash` (one-line
   provider swap, documented). Validators are model-agnostic so the
   output quality envelope is unchanged.
2. **pgvector query perf on Supabase.** ivfflat with 100 lists works
   up to ~1M rows. Monitor at beta; switch to hnsw if query time > 200ms.
3. **Validation false positives.** Number check could flag legitimate
   output if a date like "2024" appears in packet text incidentally.
   Mitigation: validator only rejects numbers that don't appear
   anywhere in the packet across all string fields (not just stats).
4. **Cost runaway.** 8k input cap is hard. If a packet can't fit after
   trimming, the route returns 413 with a "match has too much context;
   file a bug" message rather than silently dropping data.
