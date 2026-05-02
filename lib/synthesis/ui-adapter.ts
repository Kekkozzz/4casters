import type {
  FreshnessStamp,
  H2HRow,
  NarrativeHook as UiHook,
  NotableItem,
  PlayerProfile,
  QuoteWithSource,
  SheetOutput as UiSheet,
  SourceRef,
  TeamCard,
} from "@/types/sheet";
import type {
  MatchContextPacket,
  SheetOutput,
  CandidateQuote,
} from "./types";

/**
 * Translate (packet, model output) into the richer UI sheet shape the
 * existing components already render. Keeps the UI components
 * untouched while the synthesis contract uses the leaner JSON schema.
 */
export function toUiSheet({
  packet,
  output,
  generatedAtISO,
}: {
  packet: MatchContextPacket;
  output: SheetOutput;
  generatedAtISO: string;
}): UiSheet {
  const aRoster = playersForTeam(packet, packet.match.team_a.id);
  const bRoster = playersForTeam(packet, packet.match.team_b.id);

  const teamA = toTeamCard(packet.match.team_a, aRoster.length);
  const teamB = toTeamCard(packet.match.team_b, bRoster.length);

  const notablesByPlayer = new Map<string, UiNotable[]>();
  for (const pn of output.player_notables) {
    notablesByPlayer.set(
      pn.player_id,
      pn.notables.map((n) => ({
        text: n.text,
        backing: n.backing,
      })),
    );
  }

  const players = [
    ...aRoster.map((p) =>
      toPlayerProfile(packet, p, "a", notablesByPlayer.get(p.player_id)),
    ),
    ...bRoster.map((p) =>
      toPlayerProfile(packet, p, "b", notablesByPlayer.get(p.player_id)),
    ),
  ];

  return {
    matchId: packet.match.id,
    eventSlug: packet.match.event_id,
    eventName: packet.match.event_name,
    stage: packet.match.stage ?? "Match",
    format: packet.match.format ?? "Bo3",
    scheduled: formatScheduled(packet.match.scheduled_at),
    teams: { a: teamA, b: teamB },
    hooks: output.narrative_hooks.map((h) =>
      toHook(packet, h, teamA.short, teamB.short),
    ),
    h2h: toH2H(packet.h2h, teamA.short, teamB.short),
    players,
    quotes: toQuotes(output.selected_quotes, packet.candidate_quotes),
    talkingPoints: output.talking_points.map((t) => `${t.trigger} → ${t.say}`),
    freshness: freshnessFrom(generatedAtISO),
  };
}

type UiNotable = { text: string; backing: string };

interface PlayerSource {
  player_id: string;
  player_name: string;
  team_id: string;
}

function playersForTeam(
  packet: MatchContextPacket,
  teamId: string,
): PlayerSource[] {
  return packet.player_stats_30d
    .filter((s) => s.team_id === teamId)
    .map((s) => ({
      player_id: s.player_id,
      player_name: s.player_name,
      team_id: s.team_id,
    }));
}

function toTeamCard(
  team: MatchContextPacket["match"]["team_a"],
  rosterCount: number,
): TeamCard {
  const short = shortFor(team.name);
  return {
    liquipediaSlug: team.id,
    short,
    name: team.name,
    letters: short.slice(0, 2),
    record: rosterCount > 0 ? `${rosterCount} players` : "—",
    seed: "",
    region: team.region ?? "",
  };
}

function shortFor(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0] + (parts[2]?.[0] ?? "")).toUpperCase();
  }
  return name.slice(0, 3).toUpperCase();
}

function toPlayerProfile(
  packet: MatchContextPacket,
  player: PlayerSource,
  team: "a" | "b",
  notables: UiNotable[] | undefined,
): PlayerProfile {
  const stats = packet.player_stats_30d.find(
    (s) => s.player_id === player.player_id,
  );
  const trend = (v: number | null): { v: number; d: number } => ({
    v: v ?? 0,
    d: 0, // SP7 doesn't compute prior-period deltas; v1.1.
  });
  const notable: NotableItem[] =
    notables && notables.length > 0
      ? notables.map((n) => ({
          text: n.text,
          source: backingToSource(packet, n.backing),
        }))
      : [{ text: "No notable highlights yet.", missing: true }];

  return {
    liquipediaSlug: player.player_id,
    name: player.player_name,
    initials: player.player_name.slice(0, 2).toUpperCase(),
    role: "",
    country: "",
    team,
    stats: {
      gpg: trend(stats?.goals_per_game ?? null),
      savePct: trend(stats?.save_pct ?? null),
      shotPct: trend(stats?.shooting_pct ?? null),
      demos: trend(stats?.demos_per_game ?? null),
    },
    notable,
  };
}

function toHook(
  packet: MatchContextPacket,
  hook: SheetOutput["narrative_hooks"][number],
  aShort: string,
  bShort: string,
): UiHook {
  void aShort;
  void bShort;
  return {
    title: hook.title,
    body: hook.body,
    source: backingToSource(packet, hook.backing),
    backing: hook.backing,
  };
}

function toH2H(
  h2h: MatchContextPacket["h2h"],
  aShort: string,
  bShort: string,
): UiSheet["h2h"] {
  let aggA = 0;
  let aggB = 0;
  const rows: H2HRow[] = h2h.map((r) => {
    aggA += r.team_a_score;
    aggB += r.team_b_score;
    return {
      date: r.date.slice(0, 10),
      event: r.event_name,
      result: `${aShort} ${r.team_a_score} — ${r.team_b_score} ${bShort}`,
      won: r.team_a_score >= r.team_b_score ? "a" : "b",
    };
  });
  return { aggregate: { a: aggA, b: aggB }, rows };
}

function toQuotes(
  selected: SheetOutput["selected_quotes"],
  candidates: CandidateQuote[],
): QuoteWithSource[] {
  const byId = new Map(candidates.map((c) => [c.id, c] as const));
  const mapped: QuoteWithSource[] = [];
  for (const s of selected) {
    const c = byId.get(s.candidate_id);
    if (!c) continue;
    mapped.push({
      text: s.text,
      who: c.speaker_name,
      context: s.context,
      source: { url: c.source_url, srcType: c.source_type } satisfies SourceRef,
    });
  }
  return mapped;
}

function backingToSource(
  packet: MatchContextPacket,
  backing: string,
): SourceRef {
  // Pull the best-guess source URL for whatever this backing path points to.
  // Defaults to the match's liquipedia-derived scheduled-at URL if we can't
  // find anything more specific; the chip still renders, just generic.
  const firstKey = backing.split(/[.\[]/)[0];
  switch (firstKey) {
    case "h2h": {
      const idx = readIndex(backing);
      const row = idx != null ? packet.h2h[idx] : undefined;
      return {
        url: row?.liquipedia_url ?? `https://liquipedia.net/rocketleague/${packet.match.event_id}`,
        srcType: "liquipedia",
      };
    }
    case "roster_crossings": {
      const idx = readIndex(backing);
      const row = idx != null ? packet.roster_crossings[idx] : undefined;
      return {
        url: row?.source_url ?? `https://liquipedia.net/rocketleague/${packet.match.event_id}`,
        srcType: "liquipedia",
      };
    }
    case "player_stats_30d": {
      const idx = readIndex(backing);
      const row = idx != null ? packet.player_stats_30d[idx] : undefined;
      const gid = row?.source_group_id;
      return gid
        ? { url: `https://ballchasing.com/group/${gid}/players-stats`, srcType: "ballchasing" }
        : {
            url: `https://liquipedia.net/rocketleague/${packet.match.event_id}`,
            srcType: "liquipedia",
          };
    }
    default:
      return {
        url: `https://liquipedia.net/rocketleague/${packet.match.event_id}`,
        srcType: "liquipedia",
      };
  }
}

function readIndex(backing: string): number | null {
  const match = backing.match(/\[(\d+)\]/);
  if (!match) return null;
  const n = Number.parseInt(match[1], 10);
  return Number.isFinite(n) ? n : null;
}

function formatScheduled(iso: string | null): string {
  if (!iso) return "Time TBD";
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZoneName: "short",
  });
}

function freshnessFrom(iso: string): FreshnessStamp {
  // Every layer shares the same capture moment in MVP: the sheet timestamp.
  // When we start decoupling data source freshness per row, expose them
  // individually.
  const stamp = relativeFromNow(iso);
  return { liquipedia: stamp, blast: stamp, youtube: stamp };
}

function relativeFromNow(iso: string): string {
  const delta = Date.now() - new Date(iso).getTime();
  const mins = Math.round(delta / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}
