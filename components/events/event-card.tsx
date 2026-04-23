import Link from "next/link";
import { Card, Pill } from "@/components/ui/primitives";
import { LogoTile } from "@/components/ui/logo-tile";
import { Calendar, ChevRight } from "@/components/ui/icons";
import type { EventRow } from "@/lib/data/events";

export function EventCard({ ev }: { ev: EventRow }) {
  return (
    <Link href={`/events/${ev.slug}`} className="text-left group block">
      <Card
        hoverable
        className="p-4 t150 group-hover:translate-y-[-1px]"
      >
        <div className="flex items-start gap-3 mb-4">
          <LogoTile letters={ev.letters} size={48} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 mb-1">
              <Pill tone="tier">{ev.region}</Pill>
              <Pill tone={ev.tier === "S" ? "accent" : "neutral"}>
                Tier {ev.tier}
              </Pill>
            </div>
            <h3 className="text-[14.5px] font-semibold tracking-tightish leading-[1.3] truncate">
              {ev.name}
            </h3>
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-line">
          <div className="flex items-center gap-1.5 text-[12px] text-mute">
            <Calendar size={12} className="text-mute2" />
            <span className="mono text-[11.5px]">{ev.short}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[12px] text-mute">
            <span>{ev.upcoming} upcoming matches</span>
            <ChevRight
              size={13}
              className="text-mute2 t150 group-hover:translate-x-0.5 group-hover:text-accent"
            />
          </div>
        </div>
      </Card>
    </Link>
  );
}
