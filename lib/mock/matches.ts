export type MatchStatus = "idle" | "generating" | "ready";
export type MatchFormat = "Bo3" | "Bo5" | "Bo7" | "Bo9";

export interface MockMatch {
  id: string;
  event: string;
  time: string;
  date: string;
  a: string;
  b: string;
  stage: string;
  format: MatchFormat;
  status: MatchStatus;
  progress?: number;
}

export const MATCHES: MockMatch[] = [
  { id: "m-01", event: "orbital-open-spring-26", time: "Wed 20:00 CET", date: "2026-04-22T18:00Z", a: "halcyon",   b: "verdant",  stage: "QF",          format: "Bo5", status: "ready" },
  { id: "m-02", event: "orbital-open-spring-26", time: "Wed 21:30 CET", date: "2026-04-22T19:30Z", a: "northbyte", b: "mirage",   stage: "QF",          format: "Bo5", status: "idle" },
  { id: "m-03", event: "orbital-open-spring-26", time: "Thu 19:00 CET", date: "2026-04-23T17:00Z", a: "parallax",  b: "tundra",   stage: "QF",          format: "Bo5", status: "generating", progress: 0.42 },
  { id: "m-04", event: "orbital-open-spring-26", time: "Thu 20:30 CET", date: "2026-04-23T18:30Z", a: "crescent",  b: "ember",    stage: "QF",          format: "Bo5", status: "idle" },
  { id: "m-05", event: "orbital-open-spring-26", time: "Sat 18:00 CET", date: "2026-04-25T16:00Z", a: "halcyon",   b: "mirage",   stage: "SF",          format: "Bo7", status: "idle" },
  { id: "m-06", event: "orbital-open-spring-26", time: "Sat 20:30 CET", date: "2026-04-25T18:30Z", a: "parallax",  b: "ember",    stage: "SF",          format: "Bo7", status: "idle" },
  { id: "m-07", event: "orbital-open-spring-26", time: "Sun 19:00 CET", date: "2026-04-26T17:00Z", a: "halcyon",   b: "parallax", stage: "Grand Final", format: "Bo9", status: "idle" },
  { id: "m-08", event: "afterburner-cup-s4",     time: "Wed 22:00 ET",  date: "2026-04-22T02:00Z", a: "northbyte", b: "crescent", stage: "Group A",     format: "Bo3", status: "ready" },
  { id: "m-09", event: "afterburner-cup-s4",     time: "Thu 22:00 ET",  date: "2026-04-23T02:00Z", a: "ember",     b: "verdant",  stage: "Group B",     format: "Bo3", status: "idle" },
];
