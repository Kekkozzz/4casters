import { Card } from "@/components/ui/primitives";
import { FeedbackBar } from "@/components/ui/feedback-bar";

export function TalkingPointsCard({ points }: { points: string[] }) {
  return (
    <Card className="p-4 group relative">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-baseline gap-2">
          <span className="mono text-[10px] uppercase tracking-[0.14em] text-mute2">
            05
          </span>
          <h3 className="text-[13.5px] font-semibold tracking-tightish">
            Talking Points
          </h3>
        </div>
        <FeedbackBar />
      </div>
      <ul className="space-y-2.5">
        {points.map((p, i) => {
          const arrow = p.indexOf("→");
          const before = arrow > 0 ? p.slice(0, arrow).trim() : p;
          const after = arrow > 0 ? p.slice(arrow + 1).trim() : "";
          return (
            <li
              key={i}
              className="mono text-[13px] leading-[1.55] flex items-start gap-2"
            >
              <span className="text-mute2 pt-[1px] select-none">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="flex-1">
                <span className="text-[#B4B9C2]">{before}</span>
                {after && (
                  <>
                    <span className="text-accent px-1">→</span>
                    <span className="text-fg">{after}</span>
                  </>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
