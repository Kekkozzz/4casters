import { Card } from "@/components/ui/primitives";
import { SectionHead } from "@/components/ui/section-head";
import { FeedbackBar } from "@/components/ui/feedback-bar";
import type { SheetOutput, TeamCard } from "@/types/sheet";

export function H2HSection({
  h2h,
  A,
  B,
}: {
  h2h: SheetOutput["h2h"];
  A: TeamCard;
  B: TeamCard;
}) {
  return (
    <section>
      <SectionHead
        kicker="02"
        title="Head-to-Head"
        right={
          <div className="flex items-center gap-3">
            <span className="mono text-[11px] text-mute2">
              last {h2h.rows.length} meetings
            </span>
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-[4px] border border-line2 bg-surf1">
              <span className="mono text-[11.5px] font-semibold">{A.short}</span>
              <span className="mono text-[13px] font-semibold tabular-nums">
                <span
                  className={
                    h2h.aggregate.a > h2h.aggregate.b ? "text-fg" : "text-mute"
                  }
                >
                  {h2h.aggregate.a}
                </span>
                <span className="text-mute2 mx-1">—</span>
                <span
                  className={
                    h2h.aggregate.b > h2h.aggregate.a ? "text-fg" : "text-mute"
                  }
                >
                  {h2h.aggregate.b}
                </span>
              </span>
              <span className="mono text-[11.5px] font-semibold">{B.short}</span>
            </div>
          </div>
        }
      />
      <Card className="overflow-hidden group relative">
        <FeedbackBar className="absolute right-2 top-2 z-10" />
        <div className="grid grid-cols-[120px_1fr_160px_60px] h-9 px-4 items-center border-b border-line bg-[#10141A]">
          <ColHead>Date</ColHead>
          <ColHead>Event</ColHead>
          <ColHead>Result</ColHead>
          <ColHead className="justify-end">Won</ColHead>
        </div>
        {h2h.rows.map((r, i) => (
          <div
            key={`${r.date}-${i}`}
            className={`grid grid-cols-[120px_1fr_160px_60px] h-10 px-4 items-center text-[12.5px] ${
              i < h2h.rows.length - 1 ? "border-b border-line" : ""
            }`}
          >
            <div className="mono text-[11.5px] text-mute">{r.date}</div>
            <div className="text-[#D4D8DD] truncate">{r.event}</div>
            <div className="mono tabular-nums">{r.result}</div>
            <div className="flex justify-end">
              <span
                className={`mono text-[11px] font-semibold ${
                  r.won === "a" ? "text-[#9AB4E8]" : "text-mute"
                }`}
              >
                {r.won === "a" ? A.short : B.short}
              </span>
            </div>
          </div>
        ))}
      </Card>
    </section>
  );
}

function ColHead({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`mono text-[10.5px] uppercase tracking-[0.14em] text-mute2 flex items-center ${className}`}
    >
      {children}
    </div>
  );
}
