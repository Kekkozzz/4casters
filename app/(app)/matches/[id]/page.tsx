"use client";

import * as React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Btn, Pill } from "@/components/ui/primitives";
import { ArrowLeft, Refresh, Download, Share } from "@/components/ui/icons";
import { TeamHead } from "@/components/sheet/team-head";
import { HooksSection } from "@/components/sheet/hooks-section";
import { H2HSection } from "@/components/sheet/h2h-section";
import { PlayerProfilesSection } from "@/components/sheet/player-profiles-section";
import { QuotesSection } from "@/components/sheet/quotes-section";
import { TalkingPointsCard } from "@/components/sheet/talking-points-card";
import { FreshnessCard } from "@/components/sheet/freshness-card";
import { SHEET } from "@/lib/mock/sheet";

export default function SheetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Next.js 16 dynamic route params are Promise; use React.use() in client.
  const { id } = React.use(params);

  // MVP: only m-01 resolves; other ids render notFound until synthesis
  // layer (Sub-plan #6) produces real sheets.
  if (id !== SHEET.matchId) notFound();

  const s = SHEET;
  const A = s.teams.a;
  const B = s.teams.b;
  const [regenerating, setRegenerating] = React.useState(false);

  const handleRegenerate = () => {
    setRegenerating(true);
    setTimeout(() => setRegenerating(false), 2000);
  };

  return (
    <div className="bg-bg">
      <header className="sticky top-0 z-30 border-b border-line bg-bg/95 backdrop-blur-sm">
        <div className="px-8 h-[68px] flex items-center gap-6">
          <Link
            href={`/events/${s.eventSlug}`}
            aria-label="Back"
            className="w-8 h-8 rounded-btn border border-line2 bg-surf1 hover:bg-surf2 t150 flex items-center justify-center"
          >
            <ArrowLeft size={14} />
          </Link>

          <div className="flex items-center gap-4 min-w-0 flex-1">
            <TeamHead team={A} align="right" />
            <div className="px-3 py-1.5 rounded-[4px] border border-line2 bg-surf1">
              <div className="mono text-[10px] text-mute2 uppercase tracking-[0.16em] text-center">
                vs
              </div>
            </div>
            <TeamHead team={B} align="left" />

            <div className="ml-4 pl-4 border-l border-line hidden xl:block">
              <div className="flex items-center gap-1.5">
                <Pill tone="neutral">{s.stage}</Pill>
                <Pill tone="neutral">{s.format}</Pill>
              </div>
              <div className="mono text-[11px] text-mute mt-1">{s.scheduled}</div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Btn
              variant="ghost"
              size="md"
              onClick={handleRegenerate}
              icon={
                <Refresh
                  size={13}
                  className={regenerating ? "animate-spin" : ""}
                />
              }
            >
              Regenerate
            </Btn>
            <div className="w-px h-5 bg-line mx-1" />
            <Btn variant="ghost" size="md" icon={<Download size={13} />}>
              Export MD
            </Btn>
            <Btn variant="ghost" size="md" icon={<Download size={13} />}>
              Export PDF
            </Btn>
            <Btn variant="secondary" size="md" icon={<Share size={13} />}>
              Share
            </Btn>
          </div>
        </div>
      </header>

      <div className="px-8 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-8 min-w-0">
          <HooksSection hooks={s.hooks} />
          <H2HSection h2h={s.h2h} A={A} B={B} />
          <PlayerProfilesSection players={s.players} A={A} B={B} />
          <QuotesSection quotes={s.quotes} />
        </div>

        <aside className="lg:col-span-4">
          <div className="sticky top-[84px] space-y-4">
            <TalkingPointsCard points={s.talkingPoints} />
            <FreshnessCard freshness={s.freshness} />
          </div>
        </aside>
      </div>
    </div>
  );
}
