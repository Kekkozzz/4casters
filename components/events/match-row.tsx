"use client";

import Link from "next/link";
import { Btn, Pill } from "@/components/ui/primitives";
import { LogoTile } from "@/components/ui/logo-tile";
import { ChevRight } from "@/components/ui/icons";
import type { MockMatch } from "@/lib/mock/matches";
import type { MockTeam } from "@/lib/mock/teams";

export function MatchRow({
  m,
  teamA,
  teamB,
  last,
  onGenerate,
}: {
  m: MockMatch;
  teamA: MockTeam;
  teamB: MockTeam;
  last: boolean;
  onGenerate: () => void;
}) {
  const [timeMain, timeZone] = splitTime(m.time);

  return (
    <div
      className={`grid grid-cols-[140px_minmax(0,1fr)_100px_80px_180px] h-[68px] px-4 items-center row-hover t150 ${
        last ? "" : "border-b border-line"
      }`}
    >
      {/* time */}
      <div className="mono text-[12px]">
        <div className="text-fg">{timeMain}</div>
        <div className="text-mute2 text-[10.5px]">{timeZone}</div>
      </div>

      {/* matchup */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="flex items-center gap-2 justify-end min-w-0">
          <div className="text-right min-w-0">
            <div className="text-[13px] font-medium truncate">{teamA.name}</div>
            <div className="mono text-[10.5px] text-mute2">{teamA.short}</div>
          </div>
          <LogoTile letters={teamA.letters} size={32} />
        </div>
        <span className="mono text-[10.5px] text-mute2 uppercase tracking-[0.14em]">
          vs
        </span>
        <div className="flex items-center gap-2 min-w-0">
          <LogoTile letters={teamB.letters} size={32} />
          <div className="min-w-0">
            <div className="text-[13px] font-medium truncate">{teamB.name}</div>
            <div className="mono text-[10.5px] text-mute2">{teamB.short}</div>
          </div>
        </div>
      </div>

      {/* stage */}
      <div>
        <Pill tone={m.stage.includes("Final") ? "accent" : "neutral"}>
          {m.stage}
        </Pill>
      </div>
      {/* format */}
      <div>
        <Pill tone="neutral">{m.format}</Pill>
      </div>

      {/* status */}
      <div className="flex items-center justify-end">
        {m.status === "idle" && (
          <Btn variant="primary" size="md" onClick={onGenerate}>
            Generate
          </Btn>
        )}
        {m.status === "generating" && (
          <div className="w-full max-w-[180px]">
            <div className="flex items-center justify-between mb-1">
              <span className="mono text-[11px] text-mute">Generating…</span>
              <span className="mono text-[11px] text-accent">
                {Math.floor((m.progress ?? 0) * 100)}%
              </span>
            </div>
            <div className="h-1 rounded-full bg-[#1E2430] overflow-hidden">
              <div
                className="h-full bg-accent t150"
                style={{ width: `${Math.max(4, (m.progress ?? 0) * 100)}%` }}
              />
            </div>
          </div>
        )}
        {m.status === "ready" && (
          <Link
            href={`/matches/${m.id}`}
            className="text-[12.5px] text-accent hover:text-[#7AAEFF] t150 inline-flex items-center gap-1 font-medium"
          >
            Sheet ready
            <ChevRight size={13} />
          </Link>
        )}
      </div>
    </div>
  );
}

/**
 * Split "Wed 20:00 CET" into ["Wed 20:00", "CET"] for two-line display.
 * Fallback gracefully when the format doesn't match.
 */
function splitTime(time: string): [string, string] {
  const parts = time.split(" ");
  if (parts.length <= 2) return [time, ""];
  return [parts.slice(0, 2).join(" "), parts.slice(2).join(" ")];
}
