import { describe, expect, it } from "vitest";
import {
  MatchContextPacketSchema,
  SheetOutputSchema,
} from "@/lib/synthesis/types";

const samplePacket = {
  match: {
    id: "RLCS_2026/Major_1:QF:Halcyon_Esports-vs-Verdant_GG",
    event_id: "RLCS_2026/Major_1",
    event_name: "RLCS 2026 Major 1",
    stage: "QF",
    format: "Bo5",
    scheduled_at: "2026-03-20T18:00:00Z",
    team_a: { id: "Halcyon_Esports", name: "Halcyon Esports", region: "EU" },
    team_b: { id: "Verdant_GG", name: "Verdant GG", region: "EU" },
  },
  h2h: [
    {
      date: "2026-02-10T00:00:00Z",
      team_a_score: 3,
      team_b_score: 2,
      event_name: "Winter Major",
      liquipedia_url: "https://liquipedia.net/x",
    },
  ],
  roster_crossings: [
    {
      type: "ex_teammates" as const,
      player_ids: ["itachi", "Vatira"],
      team_id: "Halcyon_Esports",
      team_name: "Halcyon Esports",
      period_start: "2024-08-01T00:00:00Z",
      period_end: null,
      source_url: "https://liquipedia.net/x",
    },
  ],
  player_stats_30d: [
    {
      player_id: "itachi",
      player_name: "itachi",
      team_id: "Halcyon_Esports",
      games_played: 12,
      goals_per_game: 1.0,
      saves_per_game: 1.67,
      shooting_pct: 26.67,
      save_pct: 74.07,
      demos_per_game: 1.25,
      boost_per_min: 450,
      source_group_id: "rlcs-2026-major-1-eu",
    },
  ],
  candidate_quotes: [
    {
      id: "q-1",
      speaker_id: "itachi",
      speaker_name: "itachi",
      text: "We play for each other every single game.",
      source_url: "https://liquipedia.net/rocketleague/itachi#Quotes",
      source_type: "liquipedia" as const,
      similarity: 0.82,
    },
  ],
};

describe("MatchContextPacketSchema", () => {
  it("accepts a well-formed packet", () => {
    const parsed = MatchContextPacketSchema.parse(samplePacket);
    expect(parsed.match.id).toBe(samplePacket.match.id);
    expect(parsed.h2h).toHaveLength(1);
  });

  it("rejects roster crossings with only one player", () => {
    const bad = {
      ...samplePacket,
      roster_crossings: [
        { ...samplePacket.roster_crossings[0], player_ids: ["itachi"] },
      ],
    };
    expect(() => MatchContextPacketSchema.parse(bad)).toThrow();
  });

  it("rejects quotes with out-of-range similarity", () => {
    const bad = {
      ...samplePacket,
      candidate_quotes: [
        { ...samplePacket.candidate_quotes[0], similarity: 1.5 },
      ],
    };
    expect(() => MatchContextPacketSchema.parse(bad)).toThrow();
  });
});

describe("SheetOutputSchema", () => {
  const minimalSheet = {
    narrative_hooks: [
      { title: "A", body: "B", backing: "roster_crossings[0]" },
      { title: "C", body: "D", backing: "h2h[0]" },
    ],
    talking_points: Array.from({ length: 4 }, (_, i) => ({
      trigger: `t${i}`,
      say: `s${i}`,
      backing: `player_stats_30d[${i % 1}]`,
    })),
    selected_quotes: [],
    player_notables: [],
  };

  it("accepts a minimal sheet meeting min counts", () => {
    expect(() => SheetOutputSchema.parse(minimalSheet)).not.toThrow();
  });

  it("rejects zero narrative_hooks", () => {
    const bad = { ...minimalSheet, narrative_hooks: [] };
    expect(() => SheetOutputSchema.parse(bad)).toThrow();
  });

  it("rejects more than 8 talking_points", () => {
    const bad = {
      ...minimalSheet,
      talking_points: Array.from({ length: 9 }, (_, i) => ({
        trigger: `t${i}`,
        say: `s${i}`,
        backing: "x",
      })),
    };
    expect(() => SheetOutputSchema.parse(bad)).toThrow();
  });
});
