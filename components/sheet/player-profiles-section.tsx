"use client";

import * as React from "react";
import { Card, Pill, SourceChip } from "@/components/ui/primitives";
import { SectionHead } from "@/components/ui/section-head";
import { FeedbackBar } from "@/components/ui/feedback-bar";
import { Avatar } from "@/components/ui/avatar";
import { Trend } from "@/components/ui/trend";
import { LogoTile } from "@/components/ui/logo-tile";
import { ChevDown } from "@/components/ui/icons";
import { SourceIcon } from "./source-icon";
import type {
  NotableItem,
  PlayerProfile,
  PlayerStats30d,
  TeamCard,
  TrendDelta,
} from "@/types/sheet";

type StatKey = keyof PlayerStats30d;
const STAT_LABELS: Record<StatKey, string> = {
  gpg: "GPG",
  savePct: "Save%",
  shotPct: "Shot%",
  demos: "Demos/g",
};

function formatStat(key: StatKey, v: number): string {
  if (key === "gpg" || key === "demos") return v.toFixed(2);
  return `${(v * 100).toFixed(0)}%`;
}

export function PlayerProfilesSection({
  players,
  A,
  B,
}: {
  players: PlayerProfile[];
  A: TeamCard;
  B: TeamCard;
}) {
  // Default: strikers (first of each team) expanded.
  const defaultOpen = React.useMemo(() => {
    const firstA = players.find((p) => p.team === "a");
    const firstB = players.find((p) => p.team === "b");
    return new Set(
      [firstA?.liquipediaSlug, firstB?.liquipediaSlug].filter(
        (x): x is string => Boolean(x),
      ),
    );
  }, [players]);

  const [open, setOpen] = React.useState<Set<string>>(defaultOpen);

  const toggle = (slug: string) => {
    const next = new Set(open);
    if (next.has(slug)) next.delete(slug);
    else next.add(slug);
    setOpen(next);
  };

  const expandAll = () => {
    if (open.size === players.length) setOpen(new Set());
    else setOpen(new Set(players.map((p) => p.liquipediaSlug)));
  };

  return (
    <section>
      <SectionHead
        kicker="03"
        title="Player Profiles"
        right={
          <button
            type="button"
            onClick={expandAll}
            className="mono text-[11px] text-mute hover:text-fg t150"
          >
            {open.size === players.length ? "collapse all" : "expand all"}
          </button>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        <div className="space-y-2">
          <TeamHeading team={A} />
          {players
            .filter((p) => p.team === "a")
            .map((p) => (
              <PlayerAccordion
                key={p.liquipediaSlug}
                p={p}
                team={A}
                open={open.has(p.liquipediaSlug)}
                onToggle={() => toggle(p.liquipediaSlug)}
              />
            ))}
        </div>
        <div className="space-y-2">
          <TeamHeading team={B} />
          {players
            .filter((p) => p.team === "b")
            .map((p) => (
              <PlayerAccordion
                key={p.liquipediaSlug}
                p={p}
                team={B}
                open={open.has(p.liquipediaSlug)}
                onToggle={() => toggle(p.liquipediaSlug)}
              />
            ))}
        </div>
      </div>
    </section>
  );
}

function TeamHeading({ team }: { team: TeamCard }) {
  return (
    <div className="flex items-center gap-2 px-1 pb-1">
      <LogoTile letters={team.letters} size={18} />
      <span className="mono text-[10.5px] uppercase tracking-[0.16em] text-mute2">
        {team.name}
      </span>
      <div className="flex-1 h-px bg-line ml-1" />
    </div>
  );
}

function PlayerAccordion({
  p,
  team,
  open,
  onToggle,
}: {
  p: PlayerProfile;
  team: TeamCard;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <Card className="overflow-hidden group relative">
      <div className="flex items-center pr-3 t150 hover:bg-[#161A21]">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="flex-1 min-w-0 px-3 py-3 flex items-center gap-3 text-left"
        >
          <Avatar initials={p.initials} size={36} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[13.5px] font-semibold tracking-tightish">
                {p.name}
              </span>
              <span className="mono text-[10px] text-mute2">{p.country}</span>
              <Pill tone="neutral" className="!h-[18px] !text-[10px]">
                {p.role}
              </Pill>
            </div>
            <div className="mono text-[10.5px] text-mute2 mt-0.5">
              {team.name}
            </div>
          </div>
          <ChevDown
            size={14}
            className={`text-mute2 t150 ${open ? "rotate-180" : ""}`}
          />
        </button>
        <FeedbackBar className="ml-2" />
      </div>

      {open && (
        <div className="border-t border-line px-3 pt-3 pb-4 fadein">
          <div className="grid grid-cols-4 gap-2 mb-4">
            {(Object.keys(STAT_LABELS) as StatKey[]).map((k) => (
              <Stat key={k} label={STAT_LABELS[k]} s={p.stats[k]} formatted={formatStat(k, p.stats[k].v)} />
            ))}
          </div>

          <div className="mono text-[10px] uppercase tracking-[0.14em] text-mute2 mb-2">
            Notable
          </div>
          <ul className="space-y-2">
            {p.notable.map((n, i) => (
              <NotableRow key={i} n={n} />
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

function Stat({
  label,
  s,
  formatted,
}: {
  label: string;
  s: TrendDelta;
  formatted: string;
}) {
  return (
    <div className="bg-bg border border-line rounded-[6px] px-2.5 py-2">
      <div className="mono text-[9.5px] uppercase tracking-[0.14em] text-mute2 mb-1">
        {label}
      </div>
      <div className="flex items-baseline justify-between gap-1">
        <span className="mono text-[15px] font-semibold tabular-nums">
          {formatted}
        </span>
        <Trend delta={s.d} />
      </div>
    </div>
  );
}

function NotableRow({ n }: { n: NotableItem }) {
  return (
    <li className="text-[12.5px] leading-[1.5] flex items-start gap-2">
      <span className="mono text-[10px] text-mute2 pt-1">·</span>
      {n.missing ? (
        <span className="italic text-mute">no data available</span>
      ) : (
        <div className="flex-1">
          <div className="text-[#D4D8DD]">{n.text}</div>
          {n.source && (
            <SourceChip
              url={n.source.url}
              icon={<SourceIcon srcType={n.source.srcType} />}
              className="mt-0.5"
            >
              {n.source.url.replace(/^https?:\/\//, "")}
            </SourceChip>
          )}
        </div>
      )}
    </li>
  );
}
