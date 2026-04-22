import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Placeholder table used during Sub-plan #1 to verify DB connectivity.
 * Real entity tables (players, teams, matches, quotes, ...) land in
 * Sub-plan #3 with Liquipedia pipeline.
 */
export const appHealth = pgTable("app_health", {
  id: uuid("id").primaryKey().defaultRandom(),
  checkedAt: timestamp("checked_at", { withTimezone: true }).notNull().defaultNow(),
  note: text("note"),
});
