import { Card, SourceChip } from "@/components/ui/primitives";
import { SectionHead } from "@/components/ui/section-head";
import { FeedbackBar } from "@/components/ui/feedback-bar";
import { Flag } from "@/components/ui/icons";
import { SourceIcon } from "./source-icon";
import type { QuoteWithSource } from "@/types/sheet";

export function QuotesSection({ quotes }: { quotes: QuoteWithSource[] }) {
  return (
    <section>
      <SectionHead
        kicker="04"
        title="Quotes"
        right={
          <span className="mono text-[11px] text-mute2">
            {quotes.length} · max 3
          </span>
        }
      />
      <div className="space-y-3">
        {quotes.map((q, i) => (
          <Card
            key={`${q.who}-${i}`}
            className="p-5 group relative t150 hover:border-line2"
          >
            <div className="flex gap-4">
              <div className="qmark text-[64px] text-[#2A3244] select-none leading-[0.7] pt-1">
                &ldquo;
              </div>
              <div className="flex-1 min-w-0">
                <div
                  className="text-[15px] leading-[1.5] italic text-fg mb-3"
                  style={{ textWrap: "pretty" }}
                >
                  {q.text}
                </div>
                <div className="flex items-end justify-between gap-4 flex-wrap">
                  <div>
                    <div className="text-[12.5px] font-medium">— {q.who}</div>
                    <div className="text-[11.5px] text-mute mt-0.5">
                      {q.context}
                    </div>
                  </div>
                  <SourceChip
                    url={q.source.url}
                    icon={<SourceIcon srcType={q.source.srcType} />}
                  >
                    {q.source.url.replace(/^https?:\/\//, "")}
                  </SourceChip>
                </div>
              </div>
            </div>
            <div className="absolute top-3 right-3 flex items-center gap-1">
              <FeedbackBar />
              <button
                type="button"
                className="opacity-0 group-hover:opacity-100 t150 h-6 px-2 rounded text-[10.5px] mono text-mute hover:text-bad hover:bg-[#2A1817] flex items-center gap-1 border border-transparent hover:border-[#3a2422]"
              >
                <Flag size={10} /> flag
              </button>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
