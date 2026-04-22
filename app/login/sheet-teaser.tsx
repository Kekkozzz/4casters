import { Pill } from "@/components/ui/primitives";

const HOOKS = [
  {
    line: "Milo faces ex-teammate Vatira for the first time since Lisbon split.",
    source: "liquipedia.net/…",
  },
  {
    line: "Halcyon undefeated in Bo5 on Champions Field since November.",
    source: "blast.tv/…",
  },
] as const;

export function SheetTeaser() {
  return (
    <div className="border border-line rounded-card bg-surf1 overflow-hidden">
      <div className="px-3 py-2 flex items-center justify-between border-b border-line">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-[2px] hatch-dense border border-line2" />
          <span className="text-[11.5px] font-semibold">Halcyon vs Verdant GG</span>
          <Pill>QF</Pill>
          <Pill>Bo5</Pill>
        </div>
        <span className="mono text-[10px] text-mute2">22 Apr · 20:00</span>
      </div>
      <div className="p-3 space-y-2">
        {HOOKS.map((h, i) => (
          <div key={h.line} className="flex items-start gap-2">
            <div className="mono text-[10px] text-mute2 pt-0.5">
              {String(i + 1).padStart(2, "0")}
            </div>
            <div className="text-[12px] leading-[1.5]">
              {h.line}
              <span className="block mono text-[10px] text-mute2 mt-0.5">
                source: {h.source}
              </span>
            </div>
          </div>
        ))}
        <div className="flex items-start gap-2 opacity-40">
          <div className="mono text-[10px] text-mute2 pt-0.5">03</div>
          <div className="text-[12px] leading-[1.5]">
            Verdant&apos;s rotation metric is the league&apos;s most extreme…
          </div>
        </div>
      </div>
    </div>
  );
}
