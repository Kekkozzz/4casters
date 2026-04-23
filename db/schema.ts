import {
  date,
  doublePrecision,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  vector,
} from "drizzle-orm/pg-core";

/**
 * Placeholder table used during Sub-plan #1 to verify DB connectivity.
 * Kept for smoke-test rows; not referenced by the app or scraper.
 */
export const appHealth = pgTable("app_health", {
  id: uuid("id").primaryKey().defaultRandom(),
  checkedAt: timestamp("checked_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  note: text("note"),
});

/* ──────────────────────────────────────────────────────────────
   Liquipedia entities (Sub-plan #3).

   Primary keys are Liquipedia slugs (design spec guardrail #2:
   "IDs, never strings"). The Python scraper in services/scraper/
   UPSERTs into these tables; the frontend reads from them in
   Sub-plan #7.
   ────────────────────────────────────────────────────────────── */

export const teams = pgTable("teams", {
  id: text("id").primaryKey(), // liquipedia_slug
  name: text("name").notNull(),
  short: text("short"),
  region: text("region"),
  liquipediaUrl: text("liquipedia_url").notNull(),
  firstSeenAt: timestamp("first_seen_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const players = pgTable(
  "players",
  {
    id: text("id").primaryKey(), // liquipedia_slug
    name: text("name").notNull(),
    nationality: text("nationality"),
    currentTeamId: text("current_team_id").references(() => teams.id),
    liquipediaUrl: text("liquipedia_url").notNull(),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("players_current_team_idx").on(t.currentTeamId)],
);

export const rosterHistory = pgTable(
  "roster_history",
  {
    playerId: text("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    teamId: text("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
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
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const matches = pgTable(
  "matches",
  {
    id: text("id").primaryKey(), // constructed id: "{event_slug}:{stage}:{a}-vs-{b}"
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    teamAId: text("team_a_id")
      .notNull()
      .references(() => teams.id),
    teamBId: text("team_b_id")
      .notNull()
      .references(() => teams.id),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    stage: text("stage"),
    format: text("format"), // "Bo3" | "Bo5" | "Bo7" | "Bo9"
    scoreA: integer("score_a"),
    scoreB: integer("score_b"),
    liquipediaUrl: text("liquipedia_url"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("matches_event_idx").on(t.eventId),
    index("matches_scheduled_idx").on(t.scheduledAt),
  ],
);

/* ──────────────────────────────────────────────────────────────
   Ballchasing stats (Sub-plan #4).

   event_groups maps each liquipedia event -> one ballchasing group
   id. Discovery is fuzzy (name+date), so linkedBy records whether
   we auto-matched or the user pasted the id manually.

   Stats rows carry source_group_id so every cell in the UI can
   render a clickable backing link to the ballchasing group. Null
   numeric fields render as "no data available".
   ────────────────────────────────────────────────────────────── */

export const eventGroups = pgTable("event_groups", {
  eventId: text("event_id")
    .primaryKey()
    .references(() => events.id, { onDelete: "cascade" }),
  ballchasingGroupId: text("ballchasing_group_id").notNull(),
  linkedBy: text("linked_by"), // "auto" | "manual"
  confidence: doublePrecision("confidence"), // 0..1 for auto, null for manual
  linkedAt: timestamp("linked_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
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
  (t) => [
    primaryKey({ columns: [t.eventId, t.playerId] }),
    index("event_player_stats_player_idx").on(t.playerId),
  ],
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
  (t) => [
    primaryKey({ columns: [t.eventId, t.teamId] }),
    index("event_team_stats_team_idx").on(t.teamId),
  ],
);

/* ──────────────────────────────────────────────────────────────
   Quote corpus (Sub-plan #5).

   Every quote ships with a clickable source (no-source-no-show
   guardrail). Dedup by content_hash (SHA-256 of normalized text)
   so the same quote surfaced from two sources lands once.

   embedding: 768-dim vector for pgvector similarity search.
   Populated lazily by a background job, not during ingestion.
   ────────────────────────────────────────────────────────────── */

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
    contentHash: text("content_hash").notNull().unique(),
    embedding: vector("embedding", { dimensions: 768 }),
    capturedAt: timestamp("captured_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("quotes_speaker_idx").on(t.speakerId),
    index("quotes_source_type_idx").on(t.sourceType),
  ],
);
