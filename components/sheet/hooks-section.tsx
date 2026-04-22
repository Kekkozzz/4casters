import { Card, SourceChip } from "@/components/ui/primitives";
import { SectionHead } from "@/components/ui/section-head";
import { FeedbackBar } from "@/components/ui/feedback-bar";
import { SourceIcon } from "./source-icon";
import type { NarrativeHook } from "@/types/sheet";

export function HooksSection({ hooks }: { hooks: NarrativeHook[] }) {
  return (
    <section>
      <SectionHead
        kicker="01"
        title="Narrative Hooks"
        right={
          <span className="mono text-[11px] text-mute2">{hooks.length} hooks</span>
        }
      />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        {hooks.map((h, i) => (
          <div key={`${h.title}-${i}`} className="group relative">
            <Card className="p-4 h-full t150 hover:border-line2">
              <div className="flex items-start gap-3">
                <div className="mono text-[11px] text-mute2 tracking-wider pt-0.5 select-none">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-[14px] font-semibold leading-[1.35] tracking-tightish mb-1.5 text-fg">
                    {h.title}
                  </h4>
                  <p className="text-[12.5px] leading-[1.55] text-[#B4B9C2] mb-3">
                    {h.body}
                  </p>
                  <SourceChip
                    url={h.source.url}
                    icon={<SourceIcon srcType={h.source.srcType} />}
                  >
                    {h.source.url.replace(/^https?:\/\//, "")}
                  </SourceChip>
                </div>
                <FeedbackBar className="-mr-1 -mt-1" />
              </div>
            </Card>
          </div>
        ))}
      </div>
    </section>
  );
}
