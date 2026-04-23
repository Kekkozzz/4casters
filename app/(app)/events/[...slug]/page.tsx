import Link from "next/link";
import { notFound } from "next/navigation";
import { Btn, Pill } from "@/components/ui/primitives";
import { LogoTile } from "@/components/ui/logo-tile";
import { ArrowLeft, External, Bookmark } from "@/components/ui/icons";
import { MatchRow } from "@/components/events/match-row";
import { getEvent } from "@/lib/data/events";
import { listMatchesForEvent } from "@/lib/data/matches";

export const dynamic = "force-dynamic";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  // Catch-all segment: Liquipedia slugs contain `/` (e.g.
  // "RLCS_2026/Boston_Major"), so the dynamic folder is `[...slug]` and
  // we rejoin the parts here into the DB lookup key.
  const decoded = slug.map(decodeURIComponent).join("/");
  const [event, matches] = await Promise.all([
    getEvent(decoded),
    listMatchesForEvent(decoded),
  ]);
  if (!event) notFound();

  const ready = matches.filter((m) => m.status === "ready").length;
  const idle = matches.filter((m) => m.status === "idle").length;

  return (
    <>
      <div className="border-b border-line px-8 pt-6 pb-5 bg-bg sticky top-0 z-20">
        <Link
          href="/events"
          className="mono text-[11px] text-mute hover:text-fg t150 flex items-center gap-1 mb-3"
        >
          <ArrowLeft size={11} /> all events
        </Link>
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <LogoTile letters={event.letters} size={56} />
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Pill tone="tier">{event.region}</Pill>
                <Pill tone={event.tier === "S" ? "accent" : "neutral"}>
                  Tier {event.tier}
                </Pill>
                <Pill tone="neutral">{event.matchesTotal} matches</Pill>
              </div>
              <h1 className="text-[22px] font-semibold tracking-tighter2 leading-tight">
                {event.name}
              </h1>
              <div className="flex items-center gap-3 mt-1.5 text-[12.5px] text-mute">
                <span className="mono">{event.dates}</span>
                <span className="text-mute2">·</span>
                <a
                  href={event.liquipediaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 hover:text-fg t150"
                >
                  <span className="mono text-[11.5px]">
                    {event.liquipediaUrl.replace(/^https?:\/\//, "")}
                  </span>
                  <External size={11} />
                </a>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <Btn variant="ghost" size="md" icon={<Bookmark size={13} />}>
              Save
            </Btn>
          </div>
        </div>
      </div>

      <div className="px-8 py-6">
        {matches.length === 0 ? (
          <div className="border border-dashed border-line rounded-card px-6 py-14 text-center">
            <div className="text-[13px] text-mute">
              No matches ingested for this event yet.
            </div>
          </div>
        ) : (
          <>
            <div className="border border-line rounded-card overflow-hidden bg-surf1">
              <div className="grid grid-cols-[140px_minmax(0,1fr)_100px_80px_180px] h-10 px-4 items-center border-b border-line bg-[#10141A]">
                <ColHead>Time</ColHead>
                <ColHead className="justify-center text-center">Matchup</ColHead>
                <ColHead>Stage</ColHead>
                <ColHead>Format</ColHead>
                <ColHead className="justify-end">Status</ColHead>
              </div>
              {matches.map((m, i) => (
                <MatchRow key={m.id} m={m} last={i === matches.length - 1} />
              ))}
            </div>

            <div className="mt-3 flex items-center justify-between text-[11.5px] text-mute2 mono">
              <span>
                {ready} ready · {idle} idle
              </span>
              <span>sources: liquipedia · ballchasing · youtube</span>
            </div>
          </>
        )}
      </div>
    </>
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
