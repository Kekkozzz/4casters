import "server-only";
import { desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db/client";
import { events, generatedSheets, matches, teams } from "@/db/schema";
import type { OrchestratorResult } from "@/lib/synthesis/orchestrator";
import type { MatchContextPacket, SheetOutput } from "@/lib/synthesis/types";
import type { ValidationViolation } from "@/lib/synthesis/validator";

export interface PersistedSheet {
  matchId: string;
  output: SheetOutput;
  packet: MatchContextPacket;
  violations: ValidationViolation[];
  retried: boolean;
  provider: string;
  model: string;
  generatedAtISO: string;
}

export async function getPersistedSheet(
  matchId: string,
): Promise<PersistedSheet | null> {
  const rows = await db
    .select()
    .from(generatedSheets)
    .where(eq(generatedSheets.matchId, matchId))
    .limit(1);
  const r = rows[0];
  if (!r) return null;
  return {
    matchId: r.matchId,
    output: r.output,
    packet: r.packet,
    violations: r.violations,
    retried: r.retried,
    provider: r.provider,
    model: r.model,
    generatedAtISO: r.generatedAt.toISOString(),
  };
}

export async function savePersistedSheet(
  result: OrchestratorResult,
): Promise<void> {
  await db
    .insert(generatedSheets)
    .values({
      matchId: result.matchId,
      output: result.output,
      packet: result.packet,
      violations: result.violations,
      retried: result.retried,
      provider: result.provider.name,
      model: result.provider.model,
      tokensInput: result.tokensInput,
      tokensOutput: result.tokensOutput,
      latencyMs: result.latencyMs,
    })
    .onConflictDoUpdate({
      target: generatedSheets.matchId,
      set: {
        output: result.output,
        packet: result.packet,
        violations: result.violations,
        retried: result.retried,
        provider: result.provider.name,
        model: result.provider.model,
        tokensInput: result.tokensInput,
        tokensOutput: result.tokensOutput,
        latencyMs: result.latencyMs,
        generatedAt: new Date(),
      },
    });
}

export interface SheetListRow {
  matchId: string;
  matchLabel: string;
  eventName: string;
  eventSlug: string;
  generatedAtISO: string;
  hasViolations: boolean;
}

/**
 * List every persisted sheet, most recent first. Used by /sheets.
 */
export async function listPersistedSheets(): Promise<SheetListRow[]> {
  const teamA = alias(teams, "team_a");
  const teamB = alias(teams, "team_b");

  const rows = await db
    .select({
      matchId: generatedSheets.matchId,
      eventSlug: matches.eventId,
      eventName: events.name,
      teamAName: teamA.name,
      teamBName: teamB.name,
      generatedAt: generatedSheets.generatedAt,
      violationCount: eq(generatedSheets.violations, []),
    })
    .from(generatedSheets)
    .innerJoin(matches, eq(matches.id, generatedSheets.matchId))
    .innerJoin(events, eq(events.id, matches.eventId))
    .innerJoin(teamA, eq(teamA.id, matches.teamAId))
    .innerJoin(teamB, eq(teamB.id, matches.teamBId))
    .orderBy(desc(generatedSheets.generatedAt));

  return rows.map((r) => ({
    matchId: r.matchId,
    matchLabel: `${r.teamAName} vs ${r.teamBName}`,
    eventName: r.eventName,
    eventSlug: r.eventSlug,
    generatedAtISO: r.generatedAt.toISOString(),
    hasViolations: !r.violationCount,
  }));
}
