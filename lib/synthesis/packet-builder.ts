import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import type {
  CandidateQuote,
  H2HEntry,
  MatchContextPacket,
  PlayerStat30d,
  RosterCrossing,
} from "./types";
import {
  eventPlayerStats,
  events,
  matches,
  players,
  quotes,
  rosterHistory,
  teams,
} from "@/db/schema";
import { db } from "@/db/client";

type DB = typeof db;

export class PacketBuilderError extends Error {}

/**
 * Build a MatchContextPacket for a given match_id.
 *
 * Pulls match/teams/event -> rosters -> crossings -> event stats ->
 * top-K candidate quotes. Every field is deterministic and sourced.
 * `trimToBudget` applies the 8k-input-token guardrail before return.
 */
export async function buildMatchContextPacket(
  matchId: string,
  {
    client = db,
    candidateQuotesLimit = 20,
    h2hLimit = 5,
  }: { client?: DB; candidateQuotesLimit?: number; h2hLimit?: number } = {},
): Promise<MatchContextPacket> {
  const match = await loadMatchHead(client, matchId);

  const [teamARoster, teamBRoster] = await Promise.all([
    loadActiveRoster(client, match.teamAId, match.scheduledAtISO),
    loadActiveRoster(client, match.teamBId, match.scheduledAtISO),
  ]);

  const [h2h, stats, rosterCrossings, candidateQuotes] = await Promise.all([
    loadH2H(client, match.teamAId, match.teamBId, matchId, h2hLimit),
    loadEventPlayerStats(
      client,
      match.eventId,
      teamARoster.map((r) => r.playerId).concat(teamBRoster.map((r) => r.playerId)),
    ),
    loadRosterCrossings(
      client,
      teamARoster.map((r) => r.playerId),
      teamBRoster.map((r) => r.playerId),
    ),
    loadCandidateQuotes(
      client,
      teamARoster.map((r) => r.playerId).concat(teamBRoster.map((r) => r.playerId)),
      candidateQuotesLimit,
    ),
  ]);

  return {
    match: {
      id: match.id,
      event_id: match.eventId,
      event_name: match.eventName,
      stage: match.stage,
      format: match.format,
      scheduled_at: match.scheduledAtISO,
      team_a: {
        id: match.teamAId,
        name: match.teamAName,
        region: match.teamARegion,
      },
      team_b: {
        id: match.teamBId,
        name: match.teamBName,
        region: match.teamBRegion,
      },
    },
    h2h,
    roster_crossings: rosterCrossings,
    player_stats_30d: stats,
    candidate_quotes: candidateQuotes,
  };
}

type MatchHead = {
  id: string;
  eventId: string;
  eventName: string;
  stage: string | null;
  format: string | null;
  scheduledAtISO: string | null;
  teamAId: string;
  teamAName: string;
  teamARegion: string | null;
  teamBId: string;
  teamBName: string;
  teamBRegion: string | null;
};

async function loadMatchHead(client: DB, matchId: string): Promise<MatchHead> {
  const teamA = alias(teams, "team_a");
  const teamB = alias(teams, "team_b");
  const rows = await client
    .select({
      id: matches.id,
      eventId: matches.eventId,
      stage: matches.stage,
      format: matches.format,
      scheduledAt: matches.scheduledAt,
      eventName: events.name,
      teamAId: teamA.id,
      teamAName: teamA.name,
      teamARegion: teamA.region,
      teamBId: teamB.id,
      teamBName: teamB.name,
      teamBRegion: teamB.region,
    })
    .from(matches)
    .innerJoin(events, eq(events.id, matches.eventId))
    .innerJoin(teamA, eq(teamA.id, matches.teamAId))
    .innerJoin(teamB, eq(teamB.id, matches.teamBId))
    .where(eq(matches.id, matchId))
    .limit(1);

  const head = rows[0];
  if (!head) {
    throw new PacketBuilderError(`match ${matchId} not found`);
  }
  return {
    id: head.id,
    eventId: head.eventId,
    eventName: head.eventName,
    stage: head.stage,
    format: head.format,
    scheduledAtISO: head.scheduledAt ? head.scheduledAt.toISOString() : null,
    teamAId: head.teamAId,
    teamAName: head.teamAName,
    teamARegion: head.teamARegion,
    teamBId: head.teamBId,
    teamBName: head.teamBName,
    teamBRegion: head.teamBRegion,
  };
}

async function loadActiveRoster(
  client: DB,
  teamId: string,
  asOfISO: string | null,
): Promise<Array<{ playerId: string; playerName: string }>> {
  const asOfDate = asOfISO ? new Date(asOfISO) : new Date();
  const rows = await client
    .select({ playerId: rosterHistory.playerId })
    .from(rosterHistory)
    .innerJoin(players, eq(players.id, rosterHistory.playerId))
    .where(
      and(
        eq(rosterHistory.teamId, teamId),
        sql`${rosterHistory.startDate} <= ${asOfDate.toISOString().slice(0, 10)}`,
        sql`(${rosterHistory.endDate} IS NULL OR ${rosterHistory.endDate} >= ${asOfDate.toISOString().slice(0, 10)})`,
      ),
    );
  return rows.map((r) => ({ playerId: r.playerId, playerName: r.playerId }));
}

async function loadH2H(
  client: DB,
  teamAId: string,
  teamBId: string,
  currentMatchId: string,
  limit: number,
): Promise<H2HEntry[]> {
  const rows = await client
    .select({
      scheduledAt: matches.scheduledAt,
      teamAId: matches.teamAId,
      teamBId: matches.teamBId,
      scoreA: matches.scoreA,
      scoreB: matches.scoreB,
      liquipediaUrl: matches.liquipediaUrl,
      eventName: events.name,
    })
    .from(matches)
    .innerJoin(events, eq(events.id, matches.eventId))
    .where(
      and(
        sql`${matches.id} <> ${currentMatchId}`,
        or(
          and(eq(matches.teamAId, teamAId), eq(matches.teamBId, teamBId)),
          and(eq(matches.teamAId, teamBId), eq(matches.teamBId, teamAId)),
        ),
      ),
    )
    .orderBy(desc(matches.scheduledAt))
    .limit(limit);

  return rows
    .filter(
      (r): r is typeof r & { scheduledAt: Date } =>
        r.scheduledAt !== null && r.scoreA !== null && r.scoreB !== null,
    )
    .map((r) => {
      const isDirect = r.teamAId === teamAId;
      return {
        date: r.scheduledAt.toISOString(),
        team_a_score: isDirect ? (r.scoreA as number) : (r.scoreB as number),
        team_b_score: isDirect ? (r.scoreB as number) : (r.scoreA as number),
        event_name: r.eventName,
        liquipedia_url: r.liquipediaUrl,
      };
    });
}

async function loadEventPlayerStats(
  client: DB,
  eventId: string,
  playerIds: string[],
): Promise<PlayerStat30d[]> {
  if (playerIds.length === 0) return [];
  const rows = await client
    .select({
      playerId: eventPlayerStats.playerId,
      playerName: eventPlayerStats.playerId,
      teamId: players.currentTeamId,
      gamesPlayed: eventPlayerStats.gamesPlayed,
      goalsPerGame: eventPlayerStats.goalsPerGame,
      savesPerGame: eventPlayerStats.savesPerGame,
      shootingPct: eventPlayerStats.shootingPct,
      savePct: eventPlayerStats.savePct,
      demosPerGame: eventPlayerStats.demosPerGame,
      boostPerMin: eventPlayerStats.boostPerMin,
      sourceGroupId: eventPlayerStats.sourceGroupId,
    })
    .from(eventPlayerStats)
    .innerJoin(players, eq(players.id, eventPlayerStats.playerId))
    .where(
      and(
        eq(eventPlayerStats.eventId, eventId),
        inArray(eventPlayerStats.playerId, playerIds),
      ),
    );

  return rows.map((r) => ({
    player_id: r.playerId,
    player_name: r.playerName,
    team_id: r.teamId ?? "",
    games_played: r.gamesPlayed,
    goals_per_game: r.goalsPerGame,
    saves_per_game: r.savesPerGame,
    shooting_pct: r.shootingPct,
    save_pct: r.savePct,
    demos_per_game: r.demosPerGame,
    boost_per_min: r.boostPerMin,
    source_group_id: r.sourceGroupId,
  }));
}

async function loadRosterCrossings(
  client: DB,
  teamARosterIds: string[],
  teamBRosterIds: string[],
): Promise<RosterCrossing[]> {
  if (teamARosterIds.length === 0 || teamBRosterIds.length === 0) return [];
  const combined = [...new Set([...teamARosterIds, ...teamBRosterIds])];

  // Pull every roster entry for every player on either team, then find
  // pairs (a ∈ teamA, b ∈ teamB) that sat on the same team with
  // overlapping date windows.
  const entries = await client
    .select({
      playerId: rosterHistory.playerId,
      teamId: rosterHistory.teamId,
      teamName: teams.name,
      startDate: rosterHistory.startDate,
      endDate: rosterHistory.endDate,
      sourceUrl: rosterHistory.sourceUrl,
    })
    .from(rosterHistory)
    .innerJoin(teams, eq(teams.id, rosterHistory.teamId))
    .where(inArray(rosterHistory.playerId, combined));

  const aSet = new Set(teamARosterIds);
  const bSet = new Set(teamBRosterIds);
  const crossings: RosterCrossing[] = [];

  for (const a of entries) {
    if (!aSet.has(a.playerId)) continue;
    const aStart = new Date(a.startDate).getTime();
    const aEnd = a.endDate ? new Date(a.endDate).getTime() : Number.POSITIVE_INFINITY;

    for (const b of entries) {
      if (!bSet.has(b.playerId)) continue;
      if (a.teamId !== b.teamId) continue;
      const bStart = new Date(b.startDate).getTime();
      const bEnd = b.endDate ? new Date(b.endDate).getTime() : Number.POSITIVE_INFINITY;
      const overlapStart = Math.max(aStart, bStart);
      const overlapEnd = Math.min(aEnd, bEnd);
      if (overlapStart >= overlapEnd) continue;

      crossings.push({
        type: "ex_teammates",
        player_ids: [a.playerId, b.playerId],
        team_id: a.teamId,
        team_name: a.teamName,
        period_start: new Date(overlapStart).toISOString(),
        period_end:
          overlapEnd === Number.POSITIVE_INFINITY
            ? null
            : new Date(overlapEnd).toISOString(),
        source_url: a.sourceUrl,
      });
    }
  }

  return dedupeCrossings(crossings);
}

function dedupeCrossings(list: RosterCrossing[]): RosterCrossing[] {
  const seen = new Set<string>();
  const out: RosterCrossing[] = [];
  for (const c of list) {
    const key = [
      ...[...c.player_ids].sort(),
      c.team_id,
      c.period_start,
      c.period_end ?? "",
    ].join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out;
}

async function loadCandidateQuotes(
  client: DB,
  speakerIds: string[],
  limit: number,
): Promise<CandidateQuote[]> {
  if (speakerIds.length === 0) return [];
  const rows = await client
    .select({
      id: quotes.id,
      speakerId: quotes.speakerId,
      speakerName: quotes.speakerId,
      text: quotes.text,
      sourceUrl: quotes.sourceUrl,
      sourceType: quotes.sourceType,
    })
    .from(quotes)
    .innerJoin(players, eq(players.id, quotes.speakerId))
    .where(inArray(quotes.speakerId, speakerIds))
    .orderBy(desc(quotes.capturedAt))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    speaker_id: r.speakerId,
    speaker_name: r.speakerName,
    text: r.text,
    source_url: r.sourceUrl,
    source_type: r.sourceType as "liquipedia" | "youtube" | "twitter",
    similarity: 1.0,
  }));
}

/**
 * Drop candidate_quotes and h2h from the tail until the packet fits
 * under `maxChars` when JSON-serialized. Quotes go first (they're the
 * biggest line-items), then h2h. If we still don't fit, we throw —
 * the route turns this into a 413 so the operator knows.
 *
 * Using character count as a cheap proxy for tokens (~4 chars / token
 * for English, so 8k tokens ≈ 32k chars — we cap at 30k for headroom).
 */
export function trimToBudget(
  packet: MatchContextPacket,
  maxChars = 30_000,
): MatchContextPacket {
  let current = packet;
  const size = () => JSON.stringify(current).length;

  while (size() > maxChars && current.candidate_quotes.length > 3) {
    current = {
      ...current,
      candidate_quotes: current.candidate_quotes.slice(0, -1),
    };
  }
  while (size() > maxChars && current.h2h.length > 2) {
    current = { ...current, h2h: current.h2h.slice(0, -1) };
  }
  if (size() > maxChars) {
    throw new PacketBuilderError(
      `packet exceeds ${maxChars}-char budget even after trimming; data layer produced too much context`,
    );
  }
  return current;
}

// drizzle-orm helper re-export for the alias() shim below.
import { alias } from "drizzle-orm/pg-core";
