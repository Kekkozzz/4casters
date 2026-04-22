import { Card } from "@/components/ui/primitives";
import type { FreshnessStamp } from "@/types/sheet";

export function FreshnessCard({ freshness }: { freshness: FreshnessStamp }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-2.5">
        <span className="mono text-[10px] uppercase tracking-[0.14em] text-mute2">
          Data freshness
        </span>
        <span className="w-1.5 h-1.5 rounded-full bg-ok" />
      </div>
      <div className="space-y-1.5 mono text-[11.5px]">
        <FreshRow label="Liquipedia" val={freshness.liquipedia} />
        <FreshRow label="BLAST" val={freshness.blast} />
        <FreshRow label="YouTube" val={freshness.youtube} />
      </div>
    </Card>
  );
}

function FreshRow({ label, val }: { label: string; val: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-mute">{label}</span>
      <span className="text-[#B4B9C2]">{val}</span>
    </div>
  );
}
