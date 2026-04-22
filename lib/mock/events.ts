export type Region = "EU" | "NA" | "APAC" | "SAM";
export type Tier = "S" | "A" | "B";

export interface MockEvent {
  slug: string;
  name: string;
  letters: string;
  region: Region;
  tier: Tier;
  dates: string;
  short: string;
  upcoming: number;
  matchesTotal: number;
  liquipedia: string;
}

export const EVENTS: MockEvent[] = [
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
