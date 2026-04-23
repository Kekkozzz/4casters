import "server-only";
import { and, asc, eq, isNotNull, isNull, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db/client";
import { generatedSheets, matches, teams } from "@/db/schema";

export type MatchListStatus = "idle" | "ready";

export interface MatchListRow {
  id: string;
  eventSlug: string;
  time: string;
  date: string;
  teamA: { id: string; name: string; short: string };
  teamB: { id: string; name: string; short: string };
  stage: string | null;
  format: string | null;
  status: MatchListStatus;
}

function formatTime(date: Date | null): { time: string; date: string } {
  if (!date) return { time: "TBD", date: "" };
  const opts: Intl.DateTimeFormatOptions = {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZoneName: "short",
  };
  const full = date.toLocaleString("en-US", opts);
  return { time: full, date: date.toISOString() };
}

export async function listMatchesForEvent(eventSlug: string): Promise<MatchListRow[]> {
  const teamA = alias(teams, "team_a");
  const teamB = alias(teams, "team_b");

  const rows = await db
    .select({
      id: matches.id,
      scheduledAt: matches.scheduledAt,
      stage: matches.stage,
      format: matches.format,
      teamAId: teamA.id,
      teamAName: teamA.name,
      teamAShort: teamA.short,
      teamBId: teamB.id,
      teamBName: teamB.name,
      teamBShort: teamB.short,
      sheetPresent: isNotNull(generatedSheets.matchId),
    })
    .from(matches)
    .innerJoin(teamA, eq(teamA.id, matches.teamAId))
    .innerJoin(teamB, eq(teamB.id, matches.teamBId))
    .leftJoin(generatedSheets, eq(generatedSheets.matchId, matches.id))
    .where(eq(matches.eventId, eventSlug))
    .orderBy(asc(matches.scheduledAt));

  return rows.map((r): MatchListRow => {
    const t = formatTime(r.scheduledAt);
    return {
      id: r.id,
      eventSlug,
      time: t.time,
      date: t.date,
      teamA: { id: r.teamAId, name: r.teamAName, short: r.teamAShort ?? "" },
      teamB: { id: r.teamBId, name: r.teamBName, short: r.teamBShort ?? "" },
      stage: r.stage,
      format: r.format,
      status: r.sheetPresent ? "ready" : "idle",
    };
  });
}

export interface MatchHeader {
  id: string;
  eventSlug: string;
  eventName: string;
  scheduledAtISO: string | null;
  stage: string | null;
  format: string | null;
  teamA: { id: string; name: string; short: string };
  teamB: { id: string; name: string; short: string };
}

export async function getMatchHeader(matchId: string): Promise<MatchHeader | null> {
  const teamA = alias(teams, "team_a");
  const teamB = alias(teams, "team_b");

  const { events } = await import("@/db/schema");

  const rows = await db
    .select({
      id: matches.id,
      eventSlug: matches.eventId,
      eventName: events.name,
      scheduledAt: matches.scheduledAt,
      stage: matches.stage,
      format: matches.format,
      teamAId: teamA.id,
      teamAName: teamA.name,
      teamAShort: teamA.short,
      teamBId: teamB.id,
      teamBName: teamB.name,
      teamBShort: teamB.short,
    })
    .from(matches)
    .innerJoin(events, eq(events.id, matches.eventId))
    .innerJoin(teamA, eq(teamA.id, matches.teamAId))
    .innerJoin(teamB, eq(teamB.id, matches.teamBId))
    .where(eq(matches.id, matchId))
    .limit(1);

  const r = rows[0];
  if (!r) return null;
  return {
    id: r.id,
    eventSlug: r.eventSlug,
    eventName: r.eventName,
    scheduledAtISO: r.scheduledAt ? r.scheduledAt.toISOString() : null,
    stage: r.stage,
    format: r.format,
    teamA: { id: r.teamAId, name: r.teamAName, short: r.teamAShort ?? "" },
    teamB: { id: r.teamBId, name: r.teamBName, short: r.teamBShort ?? "" },
  };
}

// Silence unused-symbol warning from imports kept for future use.
export { and, or, isNull, sql };
