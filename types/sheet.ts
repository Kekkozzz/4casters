/**
 * Canonical types for generated match sheets.
 *
 * Shape derived from `prototype/src/data.jsx` SHEET object. The synthesis
 * layer (Sub-plan #6) produces objects conforming to `SheetOutput`, and the
 * frontend sheet viewer consumes them.
 *
 * Guardrails (see design spec Section 10):
 * - Every factual data point carries a `SourceRef`.
 * - `missing: true` on NotableItem signals "no data available" — UI must
 *   render this explicitly, not hide it.
 * - Every NarrativeHook has a `backing` field pointing into the original
 *   MatchContextPacket; the validator layer rejects outputs where `backing`
 *   doesn't resolve (see Section 6.4).
 */

export type SourceType =
  | "liquipedia"
  | "ballchasing"
  | "blast"
  | "youtube"
  | "twitter";

export interface SourceRef {
  url: string;
  srcType: SourceType;
  /** ISO 8601 when this source was captured into our corpus. */
  capturedAt?: string;
}

export interface TrendDelta {
  /** Current value (GPG, save%, etc.). */
  v: number;
  /** Delta vs prior 30d, as percentage points (e.g., 7.1 = +7.1%). */
  d: number;
}

export interface PlayerStats30d {
  gpg: TrendDelta;
  savePct: TrendDelta;
  shotPct: TrendDelta;
  demos: TrendDelta;
}

export interface NotableItem {
  text: string;
  source?: SourceRef;
  /** When true, UI renders "no data available" italic-muted. `source` omitted. */
  missing?: boolean;
}

export interface NarrativeHook {
  title: string;
  body: string;
  source: SourceRef;
  /** Path into MatchContextPacket that backs this hook (e.g., "h2h[2]"). */
  backing: string;
}

export interface H2HRow {
  /** ISO 8601 date of the match. */
  date: string;
  event: string;
  /** Human-readable series result, e.g. "HLC 3 — 2 VRD". */
  result: string;
  /** Which team won the series from the sheet's perspective. */
  won: "a" | "b";
}

export interface QuoteWithSource {
  text: string;
  /** Display name of speaker. */
  who: string;
  context: string;
  source: SourceRef;
}

export interface TeamCard {
  liquipediaSlug: string;
  /** Three-letter short code used in H2H and compact UI. */
  short: string;
  name: string;
  /** Two-letter initials for the logo placeholder tile. */
  letters: string;
  /** Current series record, e.g. "14-3". */
  record: string;
  /** Seed label, e.g. "#2". */
  seed: string;
  region: string;
}

export interface PlayerProfile {
  liquipediaSlug: string;
  name: string;
  /** Two-letter initials for the avatar placeholder. */
  initials: string;
  role: string;
  /** ISO 3166 alpha-2 country code. */
  country: string;
  /** Identifies which team this player belongs to within the sheet. */
  team: "a" | "b";
  stats: PlayerStats30d;
  notable: NotableItem[];
}

export interface FreshnessStamp {
  /** Human-readable freshness, e.g. "2h ago". */
  liquipedia: string;
  blast: string;
  youtube: string;
}

export interface SheetOutput {
  matchId: string;
  eventSlug: string;
  eventName: string;
  /** Bracket stage, e.g. "QF", "SF", "Grand Final". */
  stage: string;
  /** Match format, e.g. "Bo3", "Bo5", "Bo7". */
  format: string;
  /** Human-readable scheduled time, e.g. "Wed 22 Apr 2026 · 20:00 CET". */
  scheduled: string;
  teams: {
    a: TeamCard;
    b: TeamCard;
  };
  hooks: NarrativeHook[];
  h2h: {
    aggregate: { a: number; b: number };
    rows: H2HRow[];
  };
  players: PlayerProfile[];
  quotes: QuoteWithSource[];
  talkingPoints: string[];
  freshness: FreshnessStamp;
}
