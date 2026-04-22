import {
  date,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
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
