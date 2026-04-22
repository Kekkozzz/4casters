export interface MockMySheet {
  id: string;
  match: string;
  event: string;
  generated: string;
  status: "ready" | "outdated";
}

export const MY_SHEETS: MockMySheet[] = [
  { id: "m-01", match: "Halcyon vs Verdant",          event: "Orbital Open: Spring Split",  generated: "2026-04-21 09:14", status: "ready" },
  { id: "s-14", match: "Northbyte vs Crescent",       event: "Afterburner Cup — S4",        generated: "2026-04-20 22:48", status: "ready" },
  { id: "s-13", match: "Parallax vs Tundra",          event: "Orbital Open: Spring Split",  generated: "2026-04-20 11:02", status: "ready" },
  { id: "s-12", match: "Ember FC vs Verdant GG",      event: "Afterburner Cup — S4",        generated: "2026-04-19 14:30", status: "ready" },
  { id: "s-11", match: "Mirage Collective vs Halcyon", event: "Orbital Open: Spring Split", generated: "2026-04-18 10:55", status: "outdated" },
  { id: "s-10", match: "Crescent vs Ember FC",        event: "Afterburner Cup — S4",        generated: "2026-04-17 08:20", status: "ready" },
  { id: "s-09", match: "Parallax vs Mirage",          event: "Orbital Open: Spring Split",  generated: "2026-04-15 19:05", status: "ready" },
  { id: "s-08", match: "Tundra vs Verdant GG",        event: "Aerial Masters Invitational", generated: "2026-04-14 12:47", status: "ready" },
];
