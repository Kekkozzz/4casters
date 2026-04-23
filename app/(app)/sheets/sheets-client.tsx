"use client";

import * as React from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Btn, Pill } from "@/components/ui/primitives";
import {
  Search,
  Download,
  ChevRight,
  ChevUp,
  ChevDown,
  Sort,
} from "@/components/ui/icons";
import type { SheetListRow } from "@/lib/data/sheets";

type SortKey = "match" | "event" | "generated" | "status";
type SortDir = "asc" | "desc";

interface SortState {
  key: SortKey;
  dir: SortDir;
}

export function SheetsClient({ sheets }: { sheets: SheetListRow[] }) {
  const [sort, setSort] = React.useState<SortState>({
    key: "generated",
    dir: "desc",
  });
  const [query, setQuery] = React.useState("");

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? sheets.filter(
          (s) =>
            s.matchLabel.toLowerCase().includes(q) ||
            s.eventName.toLowerCase().includes(q),
        )
      : sheets;
    const copy = [...list];
    copy.sort((a, b) => {
      const av = getSortValue(a, sort.key);
      const bv = getSortValue(b, sort.key);
      if (av < bv) return sort.dir === "asc" ? -1 : 1;
      if (av > bv) return sort.dir === "asc" ? 1 : -1;
      return 0;
    });
    return copy;
  }, [sheets, sort, query]);

  const setSortKey = (key: SortKey) => {
    setSort((current) =>
      current.key === key
        ? { key, dir: current.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "desc" },
    );
  };

  return (
    <>
      <PageHeader
        title="My Sheets"
        kicker="Library"
        right={
          <>
            <div className="relative">
              <Search
                size={13}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-mute2"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search sheets…"
                className="h-8 w-60 pl-8 pr-2 bg-surf1 border border-line2 rounded-btn text-[12.5px] placeholder:text-mute2 focus:border-accent focus:outline-none t150"
              />
            </div>
            <Btn variant="secondary" size="md" icon={<Download size={13} />}>
              Export all
            </Btn>
          </>
        }
      />

      <div className="px-8 py-6">
        {filtered.length === 0 ? (
          <div className="border border-dashed border-line rounded-card px-6 py-14 text-center">
            <div className="text-[13px] text-mute mb-3">
              {sheets.length === 0
                ? "No sheets yet. Pick a match from an event to generate your first."
                : "No sheets match that filter."}
            </div>
            {sheets.length === 0 ? (
              <Link href="/events">
                <Btn variant="primary" size="md">
                  Browse events
                </Btn>
              </Link>
            ) : null}
          </div>
        ) : (
          <div className="border border-line rounded-card overflow-hidden bg-surf1">
            <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_180px_120px_40px] h-10 px-4 items-center border-b border-line bg-[#10141A]">
              <SortHead col="match" label="Match" sort={sort} onClick={setSortKey} />
              <SortHead col="event" label="Event" sort={sort} onClick={setSortKey} />
              <SortHead col="generated" label="Generated" sort={sort} onClick={setSortKey} />
              <SortHead col="status" label="Status" sort={sort} onClick={setSortKey} />
              <div />
            </div>
            {filtered.map((r, i) => (
              <Link
                key={r.matchId}
                href={`/matches/${r.matchId}`}
                className={`grid grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_180px_120px_40px] h-12 px-4 items-center t150 row-hover ${
                  i < filtered.length - 1 ? "border-b border-line" : ""
                }`}
              >
                <div className="text-[13px] font-medium truncate">
                  {r.matchLabel}
                </div>
                <div className="text-[12.5px] text-mute truncate">
                  {r.eventName}
                </div>
                <div className="mono text-[11.5px] text-[#B4B9C2]">
                  {relativeFromNow(r.generatedAtISO)}
                </div>
                <div>
                  {r.hasViolations ? (
                    <Pill tone="warn">
                      <span className="w-1 h-1 rounded-full bg-warn" /> Review
                    </Pill>
                  ) : (
                    <Pill tone="ok">
                      <span className="w-1 h-1 rounded-full bg-ok" /> Ready
                    </Pill>
                  )}
                </div>
                <div className="flex justify-end">
                  <ChevRight size={13} className="text-mute2" />
                </div>
              </Link>
            ))}
          </div>
        )}
        <div className="mt-3 mono text-[11px] text-mute2">
          {filtered.length} sheets · sorted by {sort.key} {sort.dir}
        </div>
      </div>
    </>
  );
}

function getSortValue(r: SheetListRow, key: SortKey): string {
  switch (key) {
    case "match":
      return r.matchLabel;
    case "event":
      return r.eventName;
    case "generated":
      return r.generatedAtISO;
    case "status":
      return r.hasViolations ? "review" : "ready";
  }
}

function relativeFromNow(iso: string): string {
  const delta = Date.now() - new Date(iso).getTime();
  const mins = Math.round(delta / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

function SortHead({
  col,
  label,
  sort,
  onClick,
}: {
  col: SortKey;
  label: string;
  sort: SortState;
  onClick: (c: SortKey) => void;
}) {
  const active = sort.key === col;
  return (
    <button
      type="button"
      onClick={() => onClick(col)}
      className={`mono text-[10.5px] uppercase tracking-[0.14em] flex items-center gap-1 t150 ${
        active ? "text-fg" : "text-mute2 hover:text-fg"
      }`}
    >
      {label}
      {active ? (
        sort.dir === "asc" ? (
          <ChevUp size={11} />
        ) : (
          <ChevDown size={11} />
        )
      ) : (
        <Sort size={11} className="opacity-40" />
      )}
    </button>
  );
}
