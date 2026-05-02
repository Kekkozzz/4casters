import "server-only";
import { count, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { events, matches } from "@/db/schema";

export type EventRegion = "EU" | "NA" | "APAC" | "SAM" | "Other";
export type EventTier = "S" | "A" | "B" | "Other";

export interface EventRow {
  slug: string;
  name: string;
  letters: string;
  region: EventRegion;
  tier: EventTier;
  dates: string;
  short: string;
  upcoming: number;
  matchesTotal: number;
  liquipediaUrl: string;
}

/**
 * Map the numeric Liquipedia tier string (1/2/3/…) to our UI bucket.
 * Unknown / missing → "Other" so the UI's tier filter still shows
 * the row but under the catch-all bucket.
 */
function mapTier(tier: string | null): EventTier {
  switch (tier) {
    case "1":
      return "S";
    case "2":
      return "A";
    case "3":
      return "B";
    default:
      return "Other";
  }
}

function mapRegion(region: string | null): EventRegion {
  if (!region) return "Other";
  const upper = region.toUpperCase();
  if (upper.includes("EUROPE") || upper === "EU") return "EU";
  if (upper.includes("NORTH AMERICA") || upper === "NA") return "NA";
  if (upper.includes("APAC") || upper.includes("OCEANIA") || upper.includes("ASIA"))
    return "APAC";
  if (upper.includes("SOUTH AMERICA") || upper === "SAM") return "SAM";
  return "Other";
}

function lettersFromName(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function formatDates(start: string | Date | null, end: string | Date | null): {
  full: string;
  short: string;
} {
  if (!start) return { full: "Dates TBD", short: "TBD" };
  const s = new Date(start);
  const e = end ? new Date(end) : null;
  const fmt = (d: Date, opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }) =>
    d.toLocaleDateString("en-US", opts);
  if (!e) {
    return {
      full: `${fmt(s, { month: "short", day: "numeric", year: "numeric" })} – TBD`,
      short: fmt(s),
    };
  }
  const sameYear = s.getFullYear() === e.getFullYear();
  const full = sameYear
    ? `${fmt(s)} – ${fmt(e, { month: "short", day: "numeric", year: "numeric" })}`
    : `${fmt(s, { month: "short", day: "numeric", year: "numeric" })} – ${fmt(e, { month: "short", day: "numeric", year: "numeric" })}`;
  const short = `${fmt(s)} – ${fmt(e)}`;
  return { full, short };
}

/**
 * List ingested events, newest first. Includes per-event match count buckets.
 */
export async function listEvents(): Promise<EventRow[]> {
  const rows = await db
    .select({
      id: events.id,
      name: events.name,
      tier: events.tier,
      region: events.region,
      startDate: events.startDate,
      endDate: events.endDate,
      liquipediaUrl: events.liquipediaUrl,
      matchesTotal: count(matches.id),
      upcomingCount: sql<number>`COUNT(CASE WHEN ${matches.scheduledAt} >= NOW() THEN 1 END)::int`,
    })
    .from(events)
    .leftJoin(matches, eq(matches.eventId, events.id))
    .groupBy(events.id)
    .orderBy(desc(events.startDate));

  return rows.map((r): EventRow => {
    const { full, short } = formatDates(r.startDate, r.endDate);
    return {
      slug: r.id,
      name: r.name,
      letters: lettersFromName(r.name),
      region: mapRegion(r.region),
      tier: mapTier(r.tier),
      dates: full,
      short,
      upcoming: r.upcomingCount,
      matchesTotal: r.matchesTotal,
      liquipediaUrl: r.liquipediaUrl,
    };
  });
}

/**
 * Single event header (used by /events/[slug]).
 */
export async function getEvent(slug: string): Promise<EventRow | null> {
  const rows = await db
    .select({
      id: events.id,
      name: events.name,
      tier: events.tier,
      region: events.region,
      startDate: events.startDate,
      endDate: events.endDate,
      liquipediaUrl: events.liquipediaUrl,
      matchesTotal: count(matches.id),
      upcomingCount: sql<number>`COUNT(CASE WHEN ${matches.scheduledAt} >= NOW() THEN 1 END)::int`,
    })
    .from(events)
    .leftJoin(matches, eq(matches.eventId, events.id))
    .where(eq(events.id, slug))
    .groupBy(events.id)
    .limit(1);

  const r = rows[0];
  if (!r) return null;
  const { full, short } = formatDates(r.startDate, r.endDate);
  return {
    slug: r.id,
    name: r.name,
    letters: lettersFromName(r.name),
    region: mapRegion(r.region),
    tier: mapTier(r.tier),
    dates: full,
    short,
    upcoming: r.upcomingCount,
    matchesTotal: r.matchesTotal,
    liquipediaUrl: r.liquipediaUrl,
  };
}
