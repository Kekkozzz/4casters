import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MatchContextPacket, SheetOutput } from "@/lib/synthesis/types";

// Mock the packet builder and provider so the route test never touches
// the DB or the network.
const samplePacket: MatchContextPacket = {
  match: {
    id: "m-1",
    event_id: "e",
    event_name: "Event",
    stage: "QF",
    format: "Bo5",
    scheduled_at: null,
    team_a: { id: "A", name: "A", region: null },
    team_b: { id: "B", name: "B", region: null },
  },
  h2h: [],
  roster_crossings: [],
  player_stats_30d: [],
  candidate_quotes: [],
};

const validOutput: SheetOutput = {
  narrative_hooks: [
    { title: "h1", body: "b1", backing: "match" },
    { title: "h2", body: "b2", backing: "match" },
  ],
  talking_points: Array.from({ length: 4 }, () => ({
    trigger: "t",
    say: "s",
    backing: "match",
  })),
  selected_quotes: [],
  player_notables: [],
};

vi.mock("@/lib/synthesis/packet-builder", async () => {
  const actual = await vi.importActual<typeof import("@/lib/synthesis/packet-builder")>(
    "@/lib/synthesis/packet-builder",
  );
  return {
    ...actual,
    buildMatchContextPacket: vi.fn(async () => samplePacket),
  };
});

vi.mock("@/lib/synthesis/gemini-provider", () => {
  return {
    GeminiFlashProvider: class {
      readonly name = "gemini-flash";
      readonly model = "test-model";
      async generateSheet() {
        return {
          output: validOutput,
          tokensInput: 100,
          tokensOutput: 50,
          latencyMs: 42,
        };
      }
    },
  };
});

vi.mock("@/lib/data/sheets", () => ({
  savePersistedSheet: vi.fn(async () => undefined),
}));

describe("POST /api/sheet/generate", () => {
  beforeEach(() => {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = "test-key";
  });

  it("returns 400 on invalid body", async () => {
    const { POST } = await import("@/app/api/sheet/generate/route");
    const res = await POST(
      new Request("http://localhost/api/sheet/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "not json",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when match_id is missing", async () => {
    const { POST } = await import("@/app/api/sheet/generate/route");
    const res = await POST(
      new Request("http://localhost/api/sheet/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      }),
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("bad_request");
  });

  it("returns 200 with sheet output on success", async () => {
    const { POST } = await import("@/app/api/sheet/generate/route");
    const res = await POST(
      new Request("http://localhost/api/sheet/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ match_id: "m-1" }),
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      match_id: string;
      output: SheetOutput;
      retried: boolean;
      violations: unknown[];
      tokens: { input: number; output: number };
    };
    expect(body.match_id).toBe("m-1");
    expect(body.retried).toBe(false);
    expect(body.violations).toEqual([]);
    expect(body.output.narrative_hooks.length).toBe(2);
    expect(body.tokens.input).toBe(100);
  });

  it("returns 503 when API key missing", async () => {
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    const { POST } = await import("@/app/api/sheet/generate/route");
    const res = await POST(
      new Request("http://localhost/api/sheet/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ match_id: "m-1" }),
      }),
    );
    expect(res.status).toBe(503);
  });
});
