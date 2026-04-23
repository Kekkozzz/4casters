import { describe, expect, it, vi } from "vitest";
import {
  SynthesisError,
  generateSheetForMatch,
} from "@/lib/synthesis/orchestrator";
import type { MatchContextPacket, SheetOutput } from "@/lib/synthesis/types";
import type { SynthesisProvider } from "@/lib/synthesis/provider";

const samplePacket: MatchContextPacket = {
  match: {
    id: "m-1",
    event_id: "e",
    event_name: "Event Name",
    stage: "QF",
    format: "Bo5",
    scheduled_at: "2026-03-20T18:00:00Z",
    team_a: { id: "A", name: "Team A", region: "EU" },
    team_b: { id: "B", name: "Team B", region: "EU" },
  },
  h2h: [
    {
      date: "2026-01-01T00:00:00Z",
      team_a_score: 3,
      team_b_score: 2,
      event_name: "Winter",
      liquipedia_url: null,
    },
  ],
  roster_crossings: [],
  player_stats_30d: [],
  candidate_quotes: [
    {
      id: "q-1",
      speaker_id: "itachi",
      speaker_name: "itachi",
      text: "We play for each other every single game.",
      source_url: "https://example.com",
      source_type: "liquipedia",
      similarity: 0.82,
    },
  ],
};

function validSheet(): SheetOutput {
  return {
    narrative_hooks: [
      { title: "H1", body: "body", backing: "match" },
      { title: "H2", body: "body", backing: "h2h[0]" },
    ],
    talking_points: Array.from({ length: 4 }, () => ({
      trigger: "t",
      say: "s",
      backing: "match",
    })),
    selected_quotes: [],
    player_notables: [],
  };
}

function invalidSheet(): SheetOutput {
  return {
    ...validSheet(),
    narrative_hooks: [
      { title: "bad", body: "x", backing: "nowhere[9]" },
      { title: "good", body: "y", backing: "match" },
    ],
  };
}

// Mock the packet builder so the orchestrator doesn't touch the DB.
vi.mock("@/lib/synthesis/packet-builder", async () => {
  const actual = await vi.importActual<typeof import("@/lib/synthesis/packet-builder")>(
    "@/lib/synthesis/packet-builder",
  );
  return {
    ...actual,
    buildMatchContextPacket: vi.fn(async () => samplePacket),
  };
});

describe("generateSheetForMatch", () => {
  it("returns output + zero violations on first success", async () => {
    const provider = makeProvider([validSheet()]);
    const result = await generateSheetForMatch("m-1", provider);
    expect(result.violations).toEqual([]);
    expect(result.retried).toBe(false);
    expect(provider.calls).toBe(1);
  });

  it("retries once on validation failure and returns if second passes", async () => {
    const provider = makeProvider([invalidSheet(), validSheet()]);
    const result = await generateSheetForMatch("m-1", provider);
    expect(result.violations).toEqual([]);
    expect(result.retried).toBe(true);
    expect(provider.calls).toBe(2);
  });

  it("strips invalid fields when retry also fails", async () => {
    const provider = makeProvider([invalidSheet(), invalidSheet()]);
    const result = await generateSheetForMatch("m-1", provider);
    // retained the "good" hook, dropped the "bad" one
    expect(result.output.narrative_hooks).toHaveLength(1);
    expect(result.output.narrative_hooks[0].title).toBe("good");
    expect(result.violations.length).toBeGreaterThan(0);
    expect(result.retried).toBe(true);
  });

  it("wraps model exceptions into SynthesisError", async () => {
    const provider: SynthesisProvider = {
      name: "gemini-flash",
      model: "test",
      generateSheet: vi.fn(async () => {
        throw new Error("upstream 500");
      }),
    };
    await expect(generateSheetForMatch("m-1", provider)).rejects.toBeInstanceOf(
      SynthesisError,
    );
  });
});

function makeProvider(
  sheets: SheetOutput[],
): SynthesisProvider & { calls: number } {
  let calls = 0;
  const self = {
    name: "gemini-flash",
    model: "test-model",
    get calls() {
      return calls;
    },
    async generateSheet(packet: MatchContextPacket) {
      void packet;
      const output = sheets[calls] ?? sheets[sheets.length - 1];
      calls += 1;
      return {
        output,
        tokensInput: 1000,
        tokensOutput: 500,
        latencyMs: 123,
      };
    },
  };
  return self;
}
