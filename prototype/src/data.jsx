// Mock data. Original invented teams/events/players — not real trademarks.

const EVENTS = [
  {
    slug: "orbital-open-spring-26",
    name: "Orbital Open: Spring Split",
    letters: "OO",
    region: "EU",
    tier: "S",
    dates: "Apr 18 – May 4, 2026",
    short: "Apr 18 – May 4",
    upcoming: 12,
    matchesTotal: 32,
    liquipedia: "liquipedia.net/rocketleague/Orbital_Open/2026/Spring",
  },
  {
    slug: "afterburner-cup-s4",
    name: "Afterburner Cup — Season 4",
    letters: "AB",
    region: "NA",
    tier: "A",
    dates: "Apr 22 – Apr 27, 2026",
    short: "Apr 22 – 27",
    upcoming: 8,
    matchesTotal: 16,
    liquipedia: "liquipedia.net/rocketleague/Afterburner_Cup/S4",
  },
  {
    slug: "midnight-league-apac-div1",
    name: "Midnight League APAC — Division I",
    letters: "ML",
    region: "APAC",
    tier: "A",
    dates: "Apr 20 – May 11, 2026",
    short: "Apr 20 – May 11",
    upcoming: 14,
    matchesTotal: 28,
    liquipedia: "liquipedia.net/rocketleague/Midnight_League/APAC/Div1",
  },
  {
    slug: "cosmic-clash-sam",
    name: "Cosmic Clash SAM",
    letters: "CC",
    region: "SAM",
    tier: "B",
    dates: "Apr 24 – Apr 28, 2026",
    short: "Apr 24 – 28",
    upcoming: 6,
    matchesTotal: 12,
    liquipedia: "liquipedia.net/rocketleague/Cosmic_Clash/SAM",
  },
  {
    slug: "aerial-masters-invitational",
    name: "Aerial Masters Invitational",
    letters: "AM",
    region: "EU",
    tier: "S",
    dates: "May 2 – May 10, 2026",
    short: "May 2 – 10",
    upcoming: 10,
    matchesTotal: 20,
    liquipedia: "liquipedia.net/rocketleague/Aerial_Masters/2026",
  },
  {
    slug: "neon-north-open",
    name: "Neon North Open",
    letters: "NN",
    region: "NA",
    tier: "B",
    dates: "Apr 26 – May 1, 2026",
    short: "Apr 26 – May 1",
    upcoming: 7,
    matchesTotal: 14,
    liquipedia: "liquipedia.net/rocketleague/Neon_North/2026",
  },
];

const TEAMS = {
  halcyon:  { short: "HLC", name: "Halcyon",           letters: "HA" },
  verdant:  { short: "VRD", name: "Verdant GG",         letters: "VD" },
  northbyte:{ short: "NBT", name: "Northbyte",          letters: "NB" },
  mirage:   { short: "MRG", name: "Mirage Collective",  letters: "MC" },
  parallax: { short: "PRX", name: "Parallax",           letters: "PX" },
  tundra:   { short: "TND", name: "Tundra Esports",     letters: "TE" },
  crescent: { short: "CRS", name: "Crescent",           letters: "CR" },
  ember:    { short: "EMB", name: "Ember FC",           letters: "EF" },
};

const MATCHES = [
  { id: "m-01", event: "orbital-open-spring-26", time: "Wed 20:00 CET", date: "2026-04-22T18:00Z", a: "halcyon",  b: "verdant",   stage: "QF",  format: "Bo5", status: "ready" },
  { id: "m-02", event: "orbital-open-spring-26", time: "Wed 21:30 CET", date: "2026-04-22T19:30Z", a: "northbyte", b: "mirage",    stage: "QF",  format: "Bo5", status: "idle"  },
  { id: "m-03", event: "orbital-open-spring-26", time: "Thu 19:00 CET", date: "2026-04-23T17:00Z", a: "parallax",  b: "tundra",    stage: "QF",  format: "Bo5", status: "generating", progress: 0.42 },
  { id: "m-04", event: "orbital-open-spring-26", time: "Thu 20:30 CET", date: "2026-04-23T18:30Z", a: "crescent",  b: "ember",     stage: "QF",  format: "Bo5", status: "idle" },
  { id: "m-05", event: "orbital-open-spring-26", time: "Sat 18:00 CET", date: "2026-04-25T16:00Z", a: "halcyon",  b: "mirage",     stage: "SF",  format: "Bo7", status: "idle" },
  { id: "m-06", event: "orbital-open-spring-26", time: "Sat 20:30 CET", date: "2026-04-25T18:30Z", a: "parallax",  b: "ember",     stage: "SF",  format: "Bo7", status: "idle" },
  { id: "m-07", event: "orbital-open-spring-26", time: "Sun 19:00 CET", date: "2026-04-26T17:00Z", a: "halcyon",  b: "parallax",   stage: "Grand Final", format: "Bo9", status: "idle" },
  { id: "m-08", event: "afterburner-cup-s4",     time: "Wed 22:00 ET",  date: "2026-04-22T02:00Z", a: "northbyte", b: "crescent",   stage: "Group A", format: "Bo3", status: "ready" },
  { id: "m-09", event: "afterburner-cup-s4",     time: "Thu 22:00 ET",  date: "2026-04-23T02:00Z", a: "ember",     b: "verdant",    stage: "Group B", format: "Bo3", status: "idle" },
];

// Sheet for m-01: Halcyon vs Verdant, QF, Bo5
const SHEET = {
  matchId: "m-01",
  eventSlug: "orbital-open-spring-26",
  eventName: "Orbital Open: Spring Split",
  stage: "QF",
  format: "Bo5",
  scheduled: "Wed 22 Apr 2026 · 20:00 CET",
  teams: {
    a: { ...TEAMS.halcyon, record: "14-3", seed: "#2", region: "EU" },
    b: { ...TEAMS.verdant,  record: "11-6", seed: "#7", region: "EU" },
  },

  hooks: [
    {
      title: "Milo faces ex-teammate Vatira for the first time since the Lisbon split",
      body: "The two anchored Halcyon's roster through 2024's double-championship run before Vatira's move to Verdant in January. Their head-to-head in scrims, per both orgs' public VODs, has been whitewash in Vatira's favour — 0–4 in maps.",
      source: "liquipedia.net/rocketleague/Halcyon/Roster_History",
      srcType: "liquipedia",
    },
    {
      title: "Halcyon has not lost a Bo5 on Champions Field since November",
      body: "12 consecutive Bo5 series won on this map pool in tournament play. The one Bo5 they did drop — vs Tundra at the Lisbon Major — went to a Game 7 overtime on this exact map.",
      source: "blast.tv/rocket-league/stats/halcyon/2025-26",
      srcType: "blast",
    },
    {
      title: "Verdant's rotation metric is the league's most extreme — highest offence, lowest defence",
      body: "League-leading 3.8 shots/min, but also the most goals conceded per game (2.9) among Top-8 EU teams. This is the matchup that will punish it — Halcyon concedes the fewest.",
      source: "blast.tv/rocket-league/stats/teams/eu-s",
      srcType: "blast",
    },
    {
      title: "First QF of the event — winner likely gets Parallax in the SF",
      body: "Bracket seeding puts the winner of this match against either Parallax or Tundra. Halcyon is 5-1 vs Parallax over the last two splits; Verdant is 1-4.",
      source: "liquipedia.net/rocketleague/Orbital_Open/2026/Spring/Bracket",
      srcType: "liquipedia",
    },
  ],

  h2h: {
    aggregate: { a: 2, b: 3 }, // HLC 2 - 3 VRD
    rows: [
      { date: "2026-03-14", event: "EU Regional #3",   result: "HLC 3 — 2 VRD", won: "a" },
      { date: "2026-02-08", event: "Lisbon Major QF",  result: "HLC 2 — 3 VRD", won: "b" },
      { date: "2025-12-20", event: "Winter Invitational", result: "HLC 1 — 3 VRD", won: "b" },
      { date: "2025-11-04", event: "EU Regional #1",   result: "HLC 3 — 0 VRD", won: "a" },
      { date: "2025-09-22", event: "Autumn Open",      result: "HLC 2 — 3 VRD", won: "b" },
    ],
  },

  players: [
    {
      team: "a", name: "Milo",   initials: "MI", role: "Striker", country: "NO",
      stats: {
        gpg:    { v: 0.94, d: 7.1 },
        savePct:{ v: 0.61, d: -1.4 },
        shotPct:{ v: 0.29, d: 3.2 },
        demos:  { v: 0.84, d: 12.0 },
      },
      notable: [
        { text: "Top-5 GPG in EU S-tier across the 2026 split.", src: "blast.tv/rocket-league/stats/milo", srcType: "blast" },
        { text: "Missed two weeks in February with wrist injury; returned against Tundra with a 4-goal Game 5.", src: "liquipedia.net/rocketleague/Milo", srcType: "liquipedia" },
        { text: "Prefers the Octane ZSR. Publicly said Dominus feels 'wrong' after the Feb patch.", src: "youtube.com/watch?v=HLCpod-034", srcType: "youtube" },
      ],
    },
    {
      team: "a", name: "Kaida",  initials: "KA", role: "Second man", country: "JP",
      stats: {
        gpg:    { v: 0.62, d: 2.3 },
        savePct:{ v: 0.72, d: 4.1 },
        shotPct:{ v: 0.24, d: 0 },
        demos:  { v: 0.41, d: -6.2 },
      },
      notable: [
        { text: "Cleanest first-touch in the EU league per the BLAST touches model (87.2).", src: "blast.tv/rocket-league/stats/kaida", srcType: "blast" },
        { text: "Switched from Dominus to Fennec after the Feb patch; saves ticked up.", src: "twitter.com/kaidaRL/status/1742", srcType: "twitter" },
      ],
    },
    {
      team: "a", name: "Rook",   initials: "RK", role: "Keeper", country: "DE",
      stats: {
        gpg:    { v: 0.31, d: -1.0 },
        savePct:{ v: 0.78, d: 6.4 },
        shotPct:{ v: 0.18, d: -2.1 },
        demos:  { v: 0.26, d: 3.0 },
      },
      notable: [
        { text: "Captain and shot-caller. Highest air-dribble defence rate in EU.", src: "liquipedia.net/rocketleague/Rook", srcType: "liquipedia" },
        { text: "Moved from Northbyte → Halcyon at end of 2024 alongside Milo.", src: "liquipedia.net/rocketleague/Halcyon/Roster_History", srcType: "liquipedia" },
        { text: "no data available", missing: true },
      ],
    },
    {
      team: "b", name: "Vatira", initials: "VT", role: "Striker", country: "PT",
      stats: {
        gpg:    { v: 1.02, d: 8.3 },
        savePct:{ v: 0.58, d: -2.6 },
        shotPct:{ v: 0.33, d: 5.9 },
        demos:  { v: 0.70, d: -4.0 },
      },
      notable: [
        { text: "Left Halcyon in Jan 2026 citing 'direction' differences; signed with Verdant same day.", src: "liquipedia.net/rocketleague/Vatira", srcType: "liquipedia" },
        { text: "Leads EU in flip-reset goals for the split (11).", src: "blast.tv/rocket-league/stats/vatira", srcType: "blast" },
        { text: "Called this bracket 'the revenge bracket' on the Afterparty podcast last week.", src: "youtube.com/watch?v=afterparty-ep72", srcType: "youtube" },
      ],
    },
    {
      team: "b", name: "Nyx",    initials: "NX", role: "Dual-threat", country: "FR",
      stats: {
        gpg:    { v: 0.71, d: 4.2 },
        savePct:{ v: 0.64, d: 1.0 },
        shotPct:{ v: 0.28, d: 2.4 },
        demos:  { v: 0.92, d: 14.1 },
      },
      notable: [
        { text: "Most demolitions per game in EU (0.92) — weaponised aggression.", src: "blast.tv/rocket-league/stats/nyx", srcType: "blast" },
        { text: "Only player in EU Top 20 with positive GPG and Save% deltas for 3 splits straight.", src: "blast.tv/rocket-league/stats/nyx/trend", srcType: "blast" },
      ],
    },
    {
      team: "b", name: "Sable",  initials: "SB", role: "Keeper", country: "ES",
      stats: {
        gpg:    { v: 0.24, d: -0.5 },
        savePct:{ v: 0.69, d: -3.2 },
        shotPct:{ v: 0.15, d: -4.8 },
        demos:  { v: 0.31, d: 0 },
      },
      notable: [
        { text: "Weakest link statistically — Save% down 3.2 points over last 30 days.", src: "blast.tv/rocket-league/stats/sable", srcType: "blast" },
        { text: "no data available", missing: true },
      ],
    },
  ],

  quotes: [
    {
      text: "I don't think of it as a grudge match. It's just another Bo5 on a Wednesday. They know what I do; I know what they do. First to four wins.",
      who: "Vatira",
      context: "Verdant team stream, Apr 18, 2026",
      url: "youtube.com/watch?v=VRD-stream-0418",
      srcType: "youtube",
    },
    {
      text: "Honestly, losing Vatira hurt for about a week. Then we played three scrims with Kaida in the second slot and realised we'd actually been playing the wrong game for six months.",
      who: "Rook, Halcyon captain",
      context: "Halcyon post-match, EU Regional #3",
      url: "liquipedia.net/rocketleague/Interview/Rook/2026-03-14",
      srcType: "liquipedia",
    },
    {
      text: "Revenge bracket. You can put that on a graphic if you want. I'll sign it.",
      who: "Vatira",
      context: "Afterparty podcast, ep. 72",
      url: "twitter.com/AfterpartyRL/status/1783",
      srcType: "twitter",
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

// User's sheets for /sheets
const MY_SHEETS = [
  { id: "m-01", match: "Halcyon vs Verdant",        event: "Orbital Open: Spring Split", generated: "2026-04-21 09:14", status: "ready" },
  { id: "s-14", match: "Northbyte vs Crescent",     event: "Afterburner Cup — S4",       generated: "2026-04-20 22:48", status: "ready" },
  { id: "s-13", match: "Parallax vs Tundra",        event: "Orbital Open: Spring Split", generated: "2026-04-20 11:02", status: "ready" },
  { id: "s-12", match: "Ember FC vs Verdant GG",    event: "Afterburner Cup — S4",       generated: "2026-04-19 14:30", status: "ready" },
  { id: "s-11", match: "Mirage Collective vs Halcyon", event: "Orbital Open: Spring Split", generated: "2026-04-18 10:55", status: "outdated" },
  { id: "s-10", match: "Crescent vs Ember FC",      event: "Afterburner Cup — S4",       generated: "2026-04-17 08:20", status: "ready" },
  { id: "s-09", match: "Parallax vs Mirage",        event: "Orbital Open: Spring Split", generated: "2026-04-15 19:05", status: "ready" },
  { id: "s-08", match: "Tundra vs Verdant GG",      event: "Aerial Masters Invitational", generated: "2026-04-14 12:47", status: "ready" },
];

Object.assign(window, { EVENTS, TEAMS, MATCHES, SHEET, MY_SHEETS });
