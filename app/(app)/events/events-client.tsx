"use client";

import * as React from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Btn } from "@/components/ui/primitives";
import { Search, Plus } from "@/components/ui/icons";
import { FilterGroup } from "@/components/events/filter-group";
import { EventCard } from "@/components/events/event-card";
import type {
  EventRegion,
  EventRow,
  EventTier,
} from "@/lib/data/events";

const REGION_OPTS: readonly EventRegion[] = ["EU", "NA", "APAC", "SAM"] as const;
const TIER_OPTS: readonly EventTier[] = ["S", "A", "B"] as const;

interface Props {
  events: EventRow[];
  loadError?: boolean;
}

export function EventsClient({ events, loadError = false }: Props) {
  const [regions, setRegions] = React.useState<Set<EventRegion>>(new Set());
  const [tiers, setTiers] = React.useState<Set<EventTier>>(new Set());
  const [query, setQuery] = React.useState("");

  const toggle = <T,>(set: Set<T>, setter: (s: Set<T>) => void, val: T) => {
    const next = new Set(set);
    if (next.has(val)) next.delete(val);
    else next.add(val);
    setter(next);
  };

  const filtered = events.filter((e) => {
    if (regions.size > 0 && !regions.has(e.region)) return false;
    if (tiers.size > 0 && !tiers.has(e.tier)) return false;
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      if (!e.name.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const clear = () => {
    setRegions(new Set());
    setTiers(new Set());
    setQuery("");
  };

  const hasFilters = regions.size > 0 || tiers.size > 0 || query.trim().length > 0;

  return (
    <>
      <PageHeader
        title="Upcoming Events"
        kicker="Dashboard"
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
                placeholder="Search events…"
                className="h-8 w-60 pl-8 pr-2 bg-surf1 border border-line2 rounded-btn text-[12.5px] placeholder:text-mute2 focus:border-accent focus:outline-none t150"
              />
            </div>
            <Btn variant="secondary" size="md" icon={<Plus size={13} />}>
              Add event
            </Btn>
          </>
        }
      />

      <div className="px-8 py-6">
        {loadError ? (
          <LoadErrorState />
        ) : events.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div className="flex items-center gap-6 mb-6">
              <FilterGroup
                label="Region"
                options={REGION_OPTS}
                active={regions}
                onToggle={(v) => toggle(regions, setRegions, v)}
              />
              <div className="w-px h-5 bg-line" />
              <FilterGroup
                label="Tier"
                options={TIER_OPTS}
                active={tiers}
                onToggle={(v) => toggle(tiers, setTiers, v)}
              />
              <div className="flex-1" />
              <div className="mono text-[11px] text-mute2">
                {filtered.length} <span className="opacity-70">of</span>{" "}
                {events.length} events
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="border border-dashed border-line rounded-card px-6 py-14 text-center">
                <div className="text-[13px] text-mute mb-3">
                  {hasFilters
                    ? "No events match that filter."
                    : "No events ingested yet."}
                </div>
                {hasFilters && (
                  <Btn size="sm" variant="outline" onClick={clear}>
                    Clear filters
                  </Btn>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filtered.map((ev) => (
                  <EventCard key={ev.slug} ev={ev} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

function LoadErrorState() {
  return (
    <div className="border border-line rounded-card px-8 py-16 text-center max-w-2xl mx-auto bg-surf1">
      <div className="text-[14px] font-semibold mb-2">Couldn&apos;t load events</div>
      <p className="text-[12.5px] text-mute leading-relaxed max-w-lg mx-auto mb-4">
        The app reached the protected page, but loading event data failed on the server.
        Check deployment environment variables and database migrations, then reload.
      </p>
      <p className="mono text-[11px] text-mute2">
        Required in production: DATABASE_URL + migrated schema
      </p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="border border-dashed border-line rounded-card px-8 py-16 text-center max-w-2xl mx-auto">
      <div className="text-[14px] font-semibold mb-2">No events ingested yet</div>
      <p className="text-[12.5px] text-mute leading-relaxed max-w-lg mx-auto mb-4">
        The database is empty. Once an operator runs the Liquipedia scraper for
        an event, upcoming matches will appear here and sheets become
        generable on demand.
      </p>
      <code className="mono text-[11.5px] text-mute2 bg-surf1 border border-line rounded-btn px-3 py-2 inline-block">
        uv run scraper backfill &lt;event_slug&gt;
      </code>
    </div>
  );
}
