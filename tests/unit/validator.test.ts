import { describe, expect, it } from "vitest";
import {
  resolveBacking,
  stripInvalidFields,
  validateCitations,
  validateNumbers,
  validateQuotes,
  validateSheet,
} from "@/lib/synthesis/validator";
import type { MatchContextPacket, SheetOutput } from "@/lib/synthesis/types";

const packet: MatchContextPacket = {
  match: {
    id: "m",
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
  roster_crossings: [
    {
      type: "ex_teammates",
      player_ids: ["itachi", "Vatira"],
      team_id: "X",
      team_name: "Old Team",
      period_start: "2024-08-01T00:00:00Z",
      period_end: null,
      source_url: "https://example.com",
    },
  ],
  player_stats_30d: [
    {
      player_id: "itachi",
      player_name: "itachi",
      team_id: "A",
      games_played: 12,
      goals_per_game: 1.0,
      saves_per_game: 1.67,
      shooting_pct: 26.67,
      save_pct: 74.07,
      demos_per_game: 1.25,
      boost_per_min: 450,
      source_group_id: "g1",
    },
  ],
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

describe("resolveBacking", () => {
  it("resolves dot/bracket paths", () => {
    expect(resolveBacking(packet, "match.team_a.id")).toBe(true);
    expect(resolveBacking(packet, "roster_crossings[0]")).toBe(true);
    expect(resolveBacking(packet, "player_stats_30d[0].goals_per_game")).toBe(true);
  });

  it("returns false for missing keys and out-of-range indexes", () => {
    expect(resolveBacking(packet, "match.team_c")).toBe(false);
    expect(resolveBacking(packet, "roster_crossings[5]")).toBe(false);
    expect(resolveBacking(packet, "")).toBe(false);
  });
});

describe("validateCitations", () => {
  it("returns no violations for fully sourced output", () => {
    const output: SheetOutput = {
      narrative_hooks: [
        { title: "Ex-teammates", body: "itachi and Vatira", backing: "roster_crossings[0]" },
        { title: "Recent H2H", body: "split last winter", backing: "h2h[0]" },
      ],
      talking_points: [
        { trigger: "opening", say: "note the reunion", backing: "roster_crossings[0]" },
        { trigger: "set 1 win A", say: "match point narrative", backing: "match" },
        { trigger: "stat drop", say: "mention 1.0 gpg", backing: "player_stats_30d[0]" },
        { trigger: "close", say: "wrap", backing: "match.team_b" },
      ],
      selected_quotes: [],
      player_notables: [],
    };
    expect(validateCitations(packet, output)).toEqual([]);
  });

  it("flags unresolvable backing paths", () => {
    const output: SheetOutput = {
      narrative_hooks: [
        { title: "x", body: "y", backing: "nowhere[0]" },
        { title: "x", body: "y", backing: "h2h[0]" },
      ],
      talking_points: [
        { trigger: "a", say: "b", backing: "match" },
        { trigger: "a", say: "b", backing: "match" },
        { trigger: "a", say: "b", backing: "match" },
        { trigger: "a", say: "b", backing: "match" },
      ],
      selected_quotes: [],
      player_notables: [],
    };
    const violations = validateCitations(packet, output);
    expect(violations).toHaveLength(1);
    expect(violations[0].path).toBe("narrative_hooks[0]");
  });
});

describe("validateQuotes", () => {
  it("accepts exact-match quote text", () => {
    const output = baseSheet({
      selected_quotes: [
        {
          candidate_id: "q-1",
          text: "We play for each other every single game.",
          context: "Post-match interview",
        },
      ],
    });
    expect(validateQuotes(packet, output)).toEqual([]);
  });

  it("accepts whitespace-variant quote text", () => {
    const output = baseSheet({
      selected_quotes: [
        {
          candidate_id: "q-1",
          text: "  We  play for each other every single game.",
          context: "Post-match",
        },
      ],
    });
    expect(validateQuotes(packet, output)).toEqual([]);
  });

  it("flags fabricated or missing candidate_id", () => {
    const output = baseSheet({
      selected_quotes: [
        { candidate_id: "nonexistent", text: "x", context: "y" },
      ],
    });
    expect(validateQuotes(packet, output)).toHaveLength(1);
  });

  it("flags text that doesn't match the referenced candidate", () => {
    const output = baseSheet({
      selected_quotes: [
        {
          candidate_id: "q-1",
          text: "Completely different words.",
          context: "y",
        },
      ],
    });
    expect(validateQuotes(packet, output)).toHaveLength(1);
  });
});

describe("validateNumbers", () => {
  it("accepts numbers that appear anywhere in the packet", () => {
    const output = baseSheet({
      narrative_hooks: [
        { title: "Hot", body: "Averaging 1.0 gpg", backing: "player_stats_30d[0]" },
        { title: "H2H", body: "Last meeting 3-2", backing: "h2h[0]" },
      ],
    });
    expect(validateNumbers(packet, output)).toEqual([]);
  });

  it("flags numbers not present in the packet", () => {
    const output = baseSheet({
      narrative_hooks: [
        { title: "Fake", body: "Clutched a 9999-yard shot", backing: "match" },
        { title: "H2H", body: "Last meeting 3-2", backing: "h2h[0]" },
      ],
    });
    const violations = validateNumbers(packet, output);
    expect(violations.some((v) => v.detail.includes("9999"))).toBe(true);
  });
});

describe("validateSheet (composite)", () => {
  it("returns ok=true when everything checks out", () => {
    const output = baseSheet({
      selected_quotes: [
        {
          candidate_id: "q-1",
          text: "We play for each other every single game.",
          context: "Post-match",
        },
      ],
    });
    const result = validateSheet(packet, output);
    expect(result.ok).toBe(true);
  });
});

describe("stripInvalidFields", () => {
  it("removes narrative_hooks with citation violations", () => {
    const output: SheetOutput = {
      narrative_hooks: [
        { title: "bad", body: "x", backing: "nope" },
        { title: "good", body: "y", backing: "h2h[0]" },
      ],
      talking_points: Array.from({ length: 4 }, () => ({
        trigger: "t",
        say: "s",
        backing: "match",
      })),
      selected_quotes: [],
      player_notables: [],
    };
    const violations = validateCitations(packet, output);
    const cleaned = stripInvalidFields(output, violations);
    expect(cleaned.narrative_hooks).toHaveLength(1);
    expect(cleaned.narrative_hooks[0].title).toBe("good");
  });
});

function baseSheet(overrides: Partial<SheetOutput>): SheetOutput {
  return {
    narrative_hooks: [
      { title: "A", body: "B", backing: "match" },
      { title: "C", body: "D", backing: "match" },
    ],
    talking_points: Array.from({ length: 4 }, () => ({
      trigger: "t",
      say: "s",
      backing: "match",
    })),
    selected_quotes: [],
    player_notables: [],
    ...overrides,
  };
}
