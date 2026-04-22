import type { SheetOutput } from "@/types/sheet";

/**
 * Canonical mock sheet for match m-01 (Halcyon vs Verdant GG, QF, Bo5).
 *
 * Typed against SheetOutput so any schema drift surfaces as a TS error.
 * Every hook/notable/quote has source+backing metadata so the sheet
 * viewer renders the `source:` chip and the guardrail conformance tests
 * (tests/unit/sheet-mock.test.ts) pass.
 */
export const SHEET: SheetOutput = {
  matchId: "m-01",
  eventSlug: "orbital-open-spring-26",
  eventName: "Orbital Open: Spring Split",
  stage: "QF",
  format: "Bo5",
  scheduled: "Wed 22 Apr 2026 · 20:00 CET",
  teams: {
    a: {
      liquipediaSlug: "halcyon",
      short: "HLC",
      name: "Halcyon",
      letters: "HA",
      record: "14-3",
      seed: "#2",
      region: "EU",
    },
    b: {
      liquipediaSlug: "verdant",
      short: "VRD",
      name: "Verdant GG",
      letters: "VD",
      record: "11-6",
      seed: "#7",
      region: "EU",
    },
  },

  hooks: [
    {
      title: "Milo faces ex-teammate Vatira for the first time since the Lisbon split",
      body:
        "The two anchored Halcyon's roster through 2024's double-championship run before Vatira's move to Verdant in January. Their head-to-head in scrims, per both orgs' public VODs, has been whitewash in Vatira's favour — 0–4 in maps.",
      source: {
        url: "https://liquipedia.net/rocketleague/Halcyon/Roster_History",
        srcType: "liquipedia",
      },
      backing: "roster_history_crossings[0]",
    },
    {
      title: "Halcyon has not lost a Bo5 on Champions Field since November",
      body:
        "12 consecutive Bo5 series won on this map pool in tournament play. The one Bo5 they did drop — vs Tundra at the Lisbon Major — went to a Game 7 overtime on this exact map.",
      source: {
        url: "https://blast.tv/rocket-league/stats/halcyon/2025-26",
        srcType: "blast",
      },
      backing: "player_stats_30d.halcyon.bo5_map_pool",
    },
    {
      title: "Verdant's rotation metric is the league's most extreme — highest offence, lowest defence",
      body:
        "League-leading 3.8 shots/min, but also the most goals conceded per game (2.9) among Top-8 EU teams. This is the matchup that will punish it — Halcyon concedes the fewest.",
      source: {
        url: "https://blast.tv/rocket-league/stats/teams/eu-s",
        srcType: "blast",
      },
      backing: "player_stats_30d.verdant.rotation",
    },
    {
      title: "First QF of the event — winner likely gets Parallax in the SF",
      body:
        "Bracket seeding puts the winner of this match against either Parallax or Tundra. Halcyon is 5-1 vs Parallax over the last two splits; Verdant is 1-4.",
      source: {
        url: "https://liquipedia.net/rocketleague/Orbital_Open/2026/Spring/Bracket",
        srcType: "liquipedia",
      },
      backing: "h2h_extended[0]",
    },
  ],

  h2h: {
    aggregate: { a: 2, b: 3 },
    rows: [
      { date: "2026-03-14", event: "EU Regional #3",       result: "HLC 3 — 2 VRD", won: "a" },
      { date: "2026-02-08", event: "Lisbon Major QF",      result: "HLC 2 — 3 VRD", won: "b" },
      { date: "2025-12-20", event: "Winter Invitational",  result: "HLC 1 — 3 VRD", won: "b" },
      { date: "2025-11-04", event: "EU Regional #1",       result: "HLC 3 — 0 VRD", won: "a" },
      { date: "2025-09-22", event: "Autumn Open",          result: "HLC 2 — 3 VRD", won: "b" },
    ],
  },

  players: [
    {
      liquipediaSlug: "milo",
      team: "a",
      name: "Milo",
      initials: "MI",
      role: "Striker",
      country: "NO",
      stats: {
        gpg:     { v: 0.94, d: 7.1 },
        savePct: { v: 0.61, d: -1.4 },
        shotPct: { v: 0.29, d: 3.2 },
        demos:   { v: 0.84, d: 12.0 },
      },
      notable: [
        {
          text: "Top-5 GPG in EU S-tier across the 2026 split.",
          source: { url: "https://blast.tv/rocket-league/stats/milo", srcType: "blast" },
        },
        {
          text: "Missed two weeks in February with wrist injury; returned against Tundra with a 4-goal Game 5.",
          source: { url: "https://liquipedia.net/rocketleague/Milo", srcType: "liquipedia" },
        },
        {
          text: "Prefers the Octane ZSR. Publicly said Dominus feels 'wrong' after the Feb patch.",
          source: { url: "https://youtube.com/watch?v=HLCpod-034", srcType: "youtube" },
        },
      ],
    },
    {
      liquipediaSlug: "kaida",
      team: "a",
      name: "Kaida",
      initials: "KA",
      role: "Second man",
      country: "JP",
      stats: {
        gpg:     { v: 0.62, d: 2.3 },
        savePct: { v: 0.72, d: 4.1 },
        shotPct: { v: 0.24, d: 0 },
        demos:   { v: 0.41, d: -6.2 },
      },
      notable: [
        {
          text: "Cleanest first-touch in the EU league per the BLAST touches model (87.2).",
          source: { url: "https://blast.tv/rocket-league/stats/kaida", srcType: "blast" },
        },
        {
          text: "Switched from Dominus to Fennec after the Feb patch; saves ticked up.",
          source: { url: "https://twitter.com/kaidaRL/status/1742", srcType: "twitter" },
        },
      ],
    },
    {
      liquipediaSlug: "rook",
      team: "a",
      name: "Rook",
      initials: "RK",
      role: "Keeper",
      country: "DE",
      stats: {
        gpg:     { v: 0.31, d: -1.0 },
        savePct: { v: 0.78, d: 6.4 },
        shotPct: { v: 0.18, d: -2.1 },
        demos:   { v: 0.26, d: 3.0 },
      },
      notable: [
        {
          text: "Captain and shot-caller. Highest air-dribble defence rate in EU.",
          source: { url: "https://liquipedia.net/rocketleague/Rook", srcType: "liquipedia" },
        },
        {
          text: "Moved from Northbyte → Halcyon at end of 2024 alongside Milo.",
          source: { url: "https://liquipedia.net/rocketleague/Halcyon/Roster_History", srcType: "liquipedia" },
        },
        { text: "no data available", missing: true },
      ],
    },
    {
      liquipediaSlug: "vatira",
      team: "b",
      name: "Vatira",
      initials: "VT",
      role: "Striker",
      country: "PT",
      stats: {
        gpg:     { v: 1.02, d: 8.3 },
        savePct: { v: 0.58, d: -2.6 },
        shotPct: { v: 0.33, d: 5.9 },
        demos:   { v: 0.70, d: -4.0 },
      },
      notable: [
        {
          text: "Left Halcyon in Jan 2026 citing 'direction' differences; signed with Verdant same day.",
          source: { url: "https://liquipedia.net/rocketleague/Vatira", srcType: "liquipedia" },
        },
        {
          text: "Leads EU in flip-reset goals for the split (11).",
          source: { url: "https://blast.tv/rocket-league/stats/vatira", srcType: "blast" },
        },
        {
          text: "Called this bracket 'the revenge bracket' on the Afterparty podcast last week.",
          source: { url: "https://youtube.com/watch?v=afterparty-ep72", srcType: "youtube" },
        },
      ],
    },
    {
      liquipediaSlug: "nyx",
      team: "b",
      name: "Nyx",
      initials: "NX",
      role: "Dual-threat",
      country: "FR",
      stats: {
        gpg:     { v: 0.71, d: 4.2 },
        savePct: { v: 0.64, d: 1.0 },
        shotPct: { v: 0.28, d: 2.4 },
        demos:   { v: 0.92, d: 14.1 },
      },
      notable: [
        {
          text: "Most demolitions per game in EU (0.92) — weaponised aggression.",
          source: { url: "https://blast.tv/rocket-league/stats/nyx", srcType: "blast" },
        },
        {
          text: "Only player in EU Top 20 with positive GPG and Save% deltas for 3 splits straight.",
          source: { url: "https://blast.tv/rocket-league/stats/nyx/trend", srcType: "blast" },
        },
      ],
    },
    {
      liquipediaSlug: "sable",
      team: "b",
      name: "Sable",
      initials: "SB",
      role: "Keeper",
      country: "ES",
      stats: {
        gpg:     { v: 0.24, d: -0.5 },
        savePct: { v: 0.69, d: -3.2 },
        shotPct: { v: 0.15, d: -4.8 },
        demos:   { v: 0.31, d: 0 },
      },
      notable: [
        {
          text: "Weakest link statistically — Save% down 3.2 points over last 30 days.",
          source: { url: "https://blast.tv/rocket-league/stats/sable", srcType: "blast" },
        },
        { text: "no data available", missing: true },
      ],
    },
  ],

  quotes: [
    {
      text:
        "I don't think of it as a grudge match. It's just another Bo5 on a Wednesday. They know what I do; I know what they do. First to four wins.",
      who: "Vatira",
      context: "Verdant team stream, Apr 18, 2026",
      source: {
        url: "https://youtube.com/watch?v=VRD-stream-0418",
        srcType: "youtube",
      },
    },
    {
      text:
        "Honestly, losing Vatira hurt for about a week. Then we played three scrims with Kaida in the second slot and realised we'd actually been playing the wrong game for six months.",
      who: "Rook, Halcyon captain",
      context: "Halcyon post-match, EU Regional #3",
      source: {
        url: "https://liquipedia.net/rocketleague/Interview/Rook/2026-03-14",
        srcType: "liquipedia",
      },
    },
    {
      text: "Revenge bracket. You can put that on a graphic if you want. I'll sign it.",
      who: "Vatira",
      context: "Afterparty podcast, ep. 72",
      source: {
        url: "https://twitter.com/AfterpartyRL/status/1783",
        srcType: "twitter",
      },
    },
  ],

  talkingPoints: [
    "if HLC opens with Octane-heavy lineup → note Milo's 0–4 scrim record vs Vatira on Octane",
    "if VRD takes Game 1 → 'Halcyon has dropped Game 1 in 3 of their last 5 Bo5s and won all three series'",
    "if Sable gives up an early high shot → Save% is down 3.2 pts over 30 days, weakest of six players",
    "if HLC wins Game 3 clean → 'first to three games on Champions Field is 12-0 for Halcyon since November'",
    "on any Vatira goal → '11 flip-reset goals this split, league leader; watch the 1.2s pre-commit'",
    "Grand Final framing: winner faces Parallax or Tundra; HLC 5-1 vs PRX, VRD 1-4",
  ],

  freshness: {
    liquipedia: "2h ago",
    blast: "6h ago",
    youtube: "14h ago",
  },
};
