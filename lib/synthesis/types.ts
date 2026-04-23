import { z } from "zod";

/* ──────────────────────────────────────────────────────────────
   Match Context Packet
   The deterministic, fully-sourced payload fed to the synthesis
   model. Everything rendered in the sheet has to be traceable
   back to a key/path in here.
   ────────────────────────────────────────────────────────────── */

export const MatchContextMatchSchema = z.object({
  id: z.string(),
  event_id: z.string(),
  event_name: z.string(),
  stage: z.string().nullable(),
  format: z.string().nullable(),
  scheduled_at: z.string().nullable(),
  team_a: z.object({
    id: z.string(),
    name: z.string(),
    region: z.string().nullable(),
  }),
  team_b: z.object({
    id: z.string(),
    name: z.string(),
    region: z.string().nullable(),
  }),
});

export const H2HEntrySchema = z.object({
  date: z.string(),
  team_a_score: z.number().int(),
  team_b_score: z.number().int(),
  event_name: z.string(),
  liquipedia_url: z.string().nullable(),
});

export const RosterCrossingSchema = z.object({
  type: z.enum(["ex_teammates", "ex_rivals"]),
  player_ids: z.array(z.string()).min(2),
  team_id: z.string(),
  team_name: z.string(),
  period_start: z.string(),
  period_end: z.string().nullable(),
  source_url: z.string(),
});

export const PlayerStat30dSchema = z.object({
  player_id: z.string(),
  player_name: z.string(),
  team_id: z.string(),
  games_played: z.number().int().nonnegative(),
  goals_per_game: z.number().nullable(),
  saves_per_game: z.number().nullable(),
  shooting_pct: z.number().nullable(),
  save_pct: z.number().nullable(),
  demos_per_game: z.number().nullable(),
  boost_per_min: z.number().nullable(),
  source_group_id: z.string().nullable(),
});

export const CandidateQuoteSchema = z.object({
  id: z.string(),
  speaker_id: z.string(),
  speaker_name: z.string(),
  text: z.string(),
  source_url: z.string(),
  source_type: z.enum(["liquipedia", "youtube", "twitter"]),
  similarity: z.number().min(0).max(1),
});

export const MatchContextPacketSchema = z.object({
  match: MatchContextMatchSchema,
  h2h: z.array(H2HEntrySchema),
  roster_crossings: z.array(RosterCrossingSchema),
  player_stats_30d: z.array(PlayerStat30dSchema),
  candidate_quotes: z.array(CandidateQuoteSchema),
});

export type MatchContextPacket = z.infer<typeof MatchContextPacketSchema>;
export type H2HEntry = z.infer<typeof H2HEntrySchema>;
export type RosterCrossing = z.infer<typeof RosterCrossingSchema>;
export type PlayerStat30d = z.infer<typeof PlayerStat30dSchema>;
export type CandidateQuote = z.infer<typeof CandidateQuoteSchema>;

/* ──────────────────────────────────────────────────────────────
   Sheet Output
   The generated content. Every item has a `backing` reference
   back to a key/path in the packet — validated server-side
   before the UI ever sees it.
   ────────────────────────────────────────────────────────────── */

export const NarrativeHookSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  backing: z.string(),
});

export const TalkingPointSchema = z.object({
  trigger: z.string().min(1),
  say: z.string().min(1),
  backing: z.string(),
});

export const SelectedQuoteSchema = z.object({
  candidate_id: z.string(),
  text: z.string(),
  context: z.string().min(1),
});

export const PlayerNotablesSchema = z.object({
  player_id: z.string(),
  notables: z
    .array(
      z.object({
        text: z.string(),
        backing: z.string(),
      }),
    )
    .max(3),
});

export const SheetOutputSchema = z.object({
  // Min floors relaxed from the original spec — sparse packets (no H2H,
  // few stats, few quotes) make the model legitimately unable to hit
  // 2+ hooks / 4+ talking points without fabricating, which the
  // validators would then strip anyway. Better to accept a smaller
  // but truthful sheet than reject the whole generation.
  narrative_hooks: z.array(NarrativeHookSchema).min(1).max(4),
  talking_points: z.array(TalkingPointSchema).min(2).max(8),
  selected_quotes: z.array(SelectedQuoteSchema).max(3),
  player_notables: z.array(PlayerNotablesSchema).max(6),
});

export type SheetOutput = z.infer<typeof SheetOutputSchema>;
export type NarrativeHook = z.infer<typeof NarrativeHookSchema>;
export type TalkingPoint = z.infer<typeof TalkingPointSchema>;
export type SelectedQuote = z.infer<typeof SelectedQuoteSchema>;
export type PlayerNotables = z.infer<typeof PlayerNotablesSchema>;
