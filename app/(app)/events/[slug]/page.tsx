"use client";

import * as React from "react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { Btn, Pill } from "@/components/ui/primitives";
import { LogoTile } from "@/components/ui/logo-tile";
import { ArrowLeft, External, Bookmark, AlertTri } from "@/components/ui/icons";
import { MatchRow } from "@/components/events/match-row";
import { EVENTS } from "@/lib/mock/events";
import { MATCHES, type MockMatch } from "@/lib/mock/matches";
import { TEAMS } from "@/lib/mock/teams";

const TICK_MS = 700;
const MIN_INC = 0.06;
const MAX_EXTRA = 0.04;

export default function EventDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const event = EVENTS.find((e) => e.slug === slug);
  if (!event) notFound();

  const initial = React.useMemo(
    () => MATCHES.filter((m) => m.event === slug),
    [slug],
  );

  const [matches, setMatches] = React.useState<MockMatch[]>(initial);

  // Simulated generate-progress tick (stays client-only until Sub-plan #7
  // wires it to a real RQ job status endpoint).
  React.useEffect(() => {
    const id = setInterval(() => {
      setMatches((current) =>
        current.map((m) => {
          if (m.status !== "generating") return m;
          const next = (m.progress ?? 0) + MIN_INC + Math.random() * MAX_EXTRA;
          if (next >= 1) {
            return { ...m, status: "ready", progress: 1 };
          }
          return { ...m, progress: next };
        }),
      );
    }, TICK_MS);
    return () => clearInterval(id);
  }, []);

  const generateOne = (id: string) => {
    setMatches((current) =>
      current.map((m) =>
        m.id === id ? { ...m, status: "generating", progress: 0.05 } : m,
      ),
    );
  };

  const generateAll = () => {
    setMatches((current) =>
      current.map((m) =>
        m.status === "idle" ? { ...m, status: "generating", progress: 0.05 } : m,
      ),
    );
  };

  const idleCount = matches.filter((m) => m.status === "idle").length;

  return (
    <>
      {/* Header */}
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
                  href={`https://${event.liquipedia}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 hover:text-fg t150"
                >
                  <span className="mono text-[11.5px]">{event.liquipedia}</span>
                  <External size={11} />
                </a>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <Btn variant="ghost" size="md" icon={<Bookmark size={13} />}>
              Save
            </Btn>
            <div className="relative group">
              <Btn variant="secondary" size="md" onClick={generateAll}>
                Generate all matches
              </Btn>
              <div className="absolute -bottom-2 right-0 translate-y-full bg-surf2 border border-line2 rounded-card p-3 w-64 text-[11.5px] text-mute z-40 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto t150">
                <div className="flex items-center gap-1.5 text-warn font-medium mb-1">
                  <AlertTri size={11} /> Heads up
                </div>
                Each sheet takes 10–30s. Generating {idleCount} sheets will take
                roughly {idleCount * 20}s and count against today&apos;s quota.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="px-8 py-6">
        <div className="border border-line rounded-card overflow-hidden bg-surf1">
          <div className="grid grid-cols-[140px_minmax(0,1fr)_100px_80px_180px] h-10 px-4 items-center border-b border-line bg-[#10141A]">
            <ColHead>Time</ColHead>
            <ColHead className="justify-center text-center">Matchup</ColHead>
            <ColHead>Stage</ColHead>
            <ColHead>Format</ColHead>
            <ColHead className="justify-end">Status</ColHead>
          </div>
          {matches.map((m, i) => (
            <MatchRow
              key={m.id}
              m={m}
              teamA={TEAMS[m.a]!}
              teamB={TEAMS[m.b]!}
              last={i === matches.length - 1}
              onGenerate={() => generateOne(m.id)}
            />
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between text-[11.5px] text-mute2 mono">
          <span>
            {matches.filter((m) => m.status === "ready").length} ready ·{" "}
            {matches.filter((m) => m.status === "generating").length} generating
            · {idleCount} idle
          </span>
          <span>sources: liquipedia · blast · youtube</span>
        </div>
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
