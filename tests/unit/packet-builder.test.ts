import { describe, expect, it } from "vitest";
import { PacketBuilderError, trimToBudget } from "@/lib/synthesis/packet-builder";
import type { MatchContextPacket } from "@/lib/synthesis/types";

function makePacket(overrides?: Partial<MatchContextPacket>): MatchContextPacket {
  return {
    match: {
      id: "m",
      event_id: "e",
      event_name: "Event",
      stage: "QF",
      format: "Bo5",
      scheduled_at: "2026-03-20T18:00:00Z",
      team_a: { id: "A", name: "Team A", region: "EU" },
      team_b: { id: "B", name: "Team B", region: "EU" },
    },
    h2h: [],
    roster_crossings: [],
    player_stats_30d: [],
    candidate_quotes: [],
    ...overrides,
  };
}

function makeQuote(n: number) {
  return {
    id: `q-${n}`,
    speaker_id: "itachi",
    speaker_name: "itachi",
    text: "X".repeat(500),
    source_url: "https://example.com",
    source_type: "liquipedia" as const,
    similarity: 0.5,
  };
}

describe("trimToBudget", () => {
  it("returns the packet unchanged when already under budget", () => {
    const p = makePacket();
    expect(trimToBudget(p, 10_000)).toEqual(p);
  });

  it("drops candidate_quotes from the tail until under budget", () => {
    const p = makePacket({
      candidate_quotes: Array.from({ length: 20 }, (_, i) => makeQuote(i)),
    });
    const before = p.candidate_quotes.length;
    const trimmed = trimToBudget(p, 5_000);
    expect(trimmed.candidate_quotes.length).toBeLessThan(before);
    expect(trimmed.candidate_quotes.length).toBeGreaterThanOrEqual(3);
  });

  it("never trims below 3 candidate quotes even if still over budget", () => {
    const p = makePacket({
      candidate_quotes: Array.from({ length: 20 }, (_, i) => makeQuote(i)),
    });
    // extremely tight budget: should throw instead of trimming below 3
    expect(() => trimToBudget(p, 500)).toThrow(PacketBuilderError);
  });

  it("also trims h2h after exhausting quotes", () => {
    const h2hBig = Array.from({ length: 30 }, () => ({
      date: "2026-01-01T00:00:00Z",
      team_a_score: 3,
      team_b_score: 2,
      event_name: "Y".repeat(200),
      liquipedia_url: "https://example.com",
    }));
    const p = makePacket({
      h2h: h2hBig,
      candidate_quotes: [makeQuote(1), makeQuote(2), makeQuote(3)],
    });
    const before = JSON.stringify(p).length;
    const trimmed = trimToBudget(p, Math.floor(before * 0.4));
    expect(trimmed.h2h.length).toBeLessThan(h2hBig.length);
    expect(trimmed.h2h.length).toBeGreaterThanOrEqual(2);
  });

  it("throws PacketBuilderError when it cannot fit even after trimming", () => {
    const p = makePacket({
      candidate_quotes: Array.from({ length: 20 }, (_, i) => makeQuote(i)),
      h2h: Array.from({ length: 20 }, () => ({
        date: "2026-01-01",
        team_a_score: 1,
        team_b_score: 1,
        event_name: "Z".repeat(200),
        liquipedia_url: null,
      })),
    });
    expect(() => trimToBudget(p, 1_000)).toThrow(PacketBuilderError);
  });
});
