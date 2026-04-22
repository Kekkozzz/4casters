import { LogoTile } from "@/components/ui/logo-tile";
import type { TeamCard } from "@/types/sheet";

export function TeamHead({
  team,
  align,
}: {
  team: TeamCard;
  align: "left" | "right";
}) {
  const reverse = align === "right" ? "flex-row-reverse text-right" : "";
  return (
    <div className={`flex items-center gap-2.5 min-w-0 ${reverse}`}>
      <LogoTile letters={team.letters} size={36} />
      <div className="min-w-0">
        <div className="text-[15px] font-semibold tracking-tightish truncate">
          {team.name}
        </div>
        <div className="mono text-[10.5px] text-mute2 flex items-center gap-2 justify-start">
          <span>{team.seed}</span>
          <span className="text-mute2">·</span>
          <span>{team.record}</span>
          <span className="text-mute2">·</span>
          <span>{team.region}</span>
        </div>
      </div>
    </div>
  );
}
