export interface MockTeam {
  liquipediaSlug: string;
  short: string;
  name: string;
  letters: string;
}

export const TEAMS: Record<string, MockTeam> = {
  halcyon:   { liquipediaSlug: "halcyon",   short: "HLC", name: "Halcyon",          letters: "HA" },
  verdant:   { liquipediaSlug: "verdant",   short: "VRD", name: "Verdant GG",        letters: "VD" },
  northbyte: { liquipediaSlug: "northbyte", short: "NBT", name: "Northbyte",         letters: "NB" },
  mirage:    { liquipediaSlug: "mirage",    short: "MRG", name: "Mirage Collective", letters: "MC" },
  parallax:  { liquipediaSlug: "parallax",  short: "PRX", name: "Parallax",          letters: "PX" },
  tundra:    { liquipediaSlug: "tundra",    short: "TND", name: "Tundra Esports",    letters: "TE" },
  crescent:  { liquipediaSlug: "crescent",  short: "CRS", name: "Crescent",          letters: "CR" },
  ember:     { liquipediaSlug: "ember",     short: "EMB", name: "Ember FC",          letters: "EF" },
};
