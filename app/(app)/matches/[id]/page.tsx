import Link from "next/link";
import { notFound } from "next/navigation";
import { Btn, Pill } from "@/components/ui/primitives";
import { LogoTile } from "@/components/ui/logo-tile";
import { ArrowLeft, Download, Share } from "@/components/ui/icons";
import { TeamHead } from "@/components/sheet/team-head";
import { HooksSection } from "@/components/sheet/hooks-section";
import { H2HSection } from "@/components/sheet/h2h-section";
import { PlayerProfilesSection } from "@/components/sheet/player-profiles-section";
import { QuotesSection } from "@/components/sheet/quotes-section";
import { TalkingPointsCard } from "@/components/sheet/talking-points-card";
import { FreshnessCard } from "@/components/sheet/freshness-card";
import { GenerateButton } from "@/components/sheet/generate-button";
import { getMatchHeader } from "@/lib/data/matches";
import { getPersistedSheet } from "@/lib/data/sheets";
import { toUiSheet } from "@/lib/synthesis/ui-adapter";

export const dynamic = "force-dynamic";

export default async function SheetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const matchId = decodeURIComponent(id);

  const [header, persisted] = await Promise.all([
    getMatchHeader(matchId),
    getPersistedSheet(matchId),
  ]);
  if (!header) notFound();

  if (!persisted) {
    return <NotGeneratedYet header={header} />;
  }

  const s = toUiSheet({
    packet: persisted.packet,
    output: persisted.output,
    generatedAtISO: persisted.generatedAtISO,
  });
  const A = s.teams.a;
  const B = s.teams.b;

  return (
    <div className="bg-bg">
      <header className="sticky top-0 z-30 border-b border-line bg-bg/95 backdrop-blur-sm">
        <div className="px-8 h-[68px] flex items-center gap-6">
          <Link
            href={`/events/${encodeURIComponent(s.eventSlug)}`}
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
            <GenerateButton matchId={matchId} label="Regenerate" variant="ghost" />
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

      {persisted.violations.length > 0 ? (
        <div className="mx-8 mb-8 rounded-card border border-warn/40 bg-warn/5 px-4 py-3 text-[12px] text-mute">
          <span className="mono text-warn">{persisted.violations.length}</span>{" "}
          field(s) were stripped because they failed validation. Regenerate
          to retry.
        </div>
      ) : null}
    </div>
  );
}

function NotGeneratedYet({
  header,
}: {
  header: NonNullable<Awaited<ReturnType<typeof getMatchHeader>>>;
}) {
  return (
    <div className="bg-bg min-h-screen">
      <header className="sticky top-0 z-30 border-b border-line bg-bg/95 backdrop-blur-sm">
        <div className="px-8 h-[68px] flex items-center gap-4">
          <Link
            href={`/events/${encodeURIComponent(header.eventSlug)}`}
            aria-label="Back"
            className="w-8 h-8 rounded-btn border border-line2 bg-surf1 hover:bg-surf2 t150 flex items-center justify-center"
          >
            <ArrowLeft size={14} />
          </Link>
          <span className="mono text-[11px] text-mute2 uppercase tracking-[0.14em]">
            {header.eventName}
          </span>
        </div>
      </header>

      <div className="px-8 py-16 max-w-2xl mx-auto">
        <div className="flex items-center justify-center gap-6 mb-8">
          <TeamInfo
            name={header.teamA.name}
            short={header.teamA.short}
            align="right"
          />
          <div className="mono text-[11px] text-mute2 uppercase tracking-[0.16em]">
            vs
          </div>
          <TeamInfo
            name={header.teamB.name}
            short={header.teamB.short}
            align="left"
          />
        </div>

        <div className="text-center space-y-3 mb-8">
          <div className="flex items-center justify-center gap-2">
            {header.stage ? <Pill tone="neutral">{header.stage}</Pill> : null}
            {header.format ? <Pill tone="neutral">{header.format}</Pill> : null}
          </div>
          {header.scheduledAtISO ? (
            <div className="mono text-[12px] text-mute">
              {new Date(header.scheduledAtISO).toLocaleString("en-US", {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
                timeZoneName: "short",
              })}
            </div>
          ) : null}
        </div>

        <div className="border border-dashed border-line rounded-card px-6 py-10 text-center">
          <div className="text-[14px] font-semibold mb-2">
            No sheet generated yet
          </div>
          <p className="text-[12.5px] text-mute leading-relaxed max-w-lg mx-auto mb-5">
            Synthesis runs in the background against Liquipedia, ballchasing,
            and the quote corpus. Expect 10–30 seconds. Every data point in the
            resulting sheet carries a clickable source.
          </p>
          <div className="flex justify-center">
            <GenerateButton matchId={header.id} label="Generate sheet" />
          </div>
        </div>
      </div>
    </div>
  );
}

function TeamInfo({
  name,
  short,
  align,
}: {
  name: string;
  short: string;
  align: "left" | "right";
}) {
  return (
    <div className={`flex items-center gap-3 ${align === "right" ? "flex-row-reverse text-right" : ""}`}>
      <LogoTile letters={(short || name.slice(0, 2)).toUpperCase()} size={40} />
      <div>
        <div className="text-[14px] font-semibold">{name}</div>
        {short ? (
          <div className="mono text-[11px] text-mute2">{short}</div>
        ) : null}
      </div>
    </div>
  );
}
