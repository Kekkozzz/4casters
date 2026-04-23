import Link from "next/link";
import { Pill } from "@/components/ui/primitives";
import { LogoTile } from "@/components/ui/logo-tile";
import { ChevRight } from "@/components/ui/icons";
import type { MatchListRow } from "@/lib/data/matches";

export function MatchRow({ m, last }: { m: MatchListRow; last: boolean }) {
  const [timeMain, timeZone] = splitTime(m.time);

  return (
    <Link
      href={`/matches/${m.id}`}
      className={`grid grid-cols-[140px_minmax(0,1fr)_100px_80px_180px] h-[68px] px-4 items-center row-hover t150 ${
        last ? "" : "border-b border-line"
      }`}
    >
      {/* time */}
      <div className="mono text-[12px]">
        <div className="text-fg">{timeMain || "TBD"}</div>
        <div className="text-mute2 text-[10.5px]">{timeZone}</div>
      </div>

      {/* matchup */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="flex items-center gap-2 justify-end min-w-0">
          <div className="text-right min-w-0">
            <div className="text-[13px] font-medium truncate">{m.teamA.name}</div>
            {m.teamA.short ? (
              <div className="mono text-[10.5px] text-mute2">{m.teamA.short}</div>
            ) : null}
          </div>
          <LogoTile
            letters={(m.teamA.short || m.teamA.name.slice(0, 2)).toUpperCase()}
            size={32}
          />
        </div>
        <span className="mono text-[10.5px] text-mute2 uppercase tracking-[0.14em]">
          vs
        </span>
        <div className="flex items-center gap-2 min-w-0">
          <LogoTile
            letters={(m.teamB.short || m.teamB.name.slice(0, 2)).toUpperCase()}
            size={32}
          />
          <div className="min-w-0">
            <div className="text-[13px] font-medium truncate">{m.teamB.name}</div>
            {m.teamB.short ? (
              <div className="mono text-[10.5px] text-mute2">{m.teamB.short}</div>
            ) : null}
          </div>
        </div>
      </div>

      {/* stage */}
      <div>
        {m.stage ? (
          <Pill tone={m.stage.toLowerCase().includes("final") ? "accent" : "neutral"}>
            {m.stage}
          </Pill>
        ) : null}
      </div>
      {/* format */}
      <div>{m.format ? <Pill tone="neutral">{m.format}</Pill> : null}</div>

      {/* status */}
      <div className="flex items-center justify-end gap-1.5 text-[12.5px]">
        {m.status === "ready" ? (
          <>
            <span className="text-accent font-medium">Sheet ready</span>
            <ChevRight size={13} className="text-accent" />
          </>
        ) : (
          <>
            <span className="text-fg">Generate</span>
            <ChevRight size={13} className="text-mute2" />
          </>
        )}
      </div>
    </Link>
  );
}

function splitTime(time: string): [string, string] {
  const parts = time.split(" ");
  if (parts.length <= 2) return [time, ""];
  return [parts.slice(0, 2).join(" "), parts.slice(2).join(" ")];
}
