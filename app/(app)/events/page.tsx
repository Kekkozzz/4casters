"use client";

import * as React from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Btn } from "@/components/ui/primitives";
import { Search, Plus } from "@/components/ui/icons";
import { FilterGroup } from "@/components/events/filter-group";
import { EventCard } from "@/components/events/event-card";
import { EVENTS, type Region, type Tier } from "@/lib/mock/events";

const REGION_OPTS: readonly Region[] = ["EU", "NA", "APAC", "SAM"] as const;
const TIER_OPTS: readonly Tier[] = ["S", "A", "B"] as const;

export default function EventsPage() {
  const [regions, setRegions] = React.useState<Set<Region>>(new Set());
  const [tiers, setTiers] = React.useState<Set<Tier>>(new Set());

  const toggle = <T,>(set: Set<T>, setter: (s: Set<T>) => void, val: T) => {
    const next = new Set(set);
    if (next.has(val)) {
      next.delete(val);
    } else {
      next.add(val);
    }
    setter(next);
  };

  const filtered = EVENTS.filter(
    (e) =>
      (regions.size === 0 || regions.has(e.region)) &&
      (tiers.size === 0 || tiers.has(e.tier)),
  );

  const clear = () => {
    setRegions(new Set());
    setTiers(new Set());
  };

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
            {EVENTS.length} events
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="border border-dashed border-line rounded-card px-6 py-14 text-center">
            <div className="text-[13px] text-mute mb-3">
              No events match that filter.
            </div>
            <Btn size="sm" variant="outline" onClick={clear}>
              Clear filters
            </Btn>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((ev) => (
              <EventCard key={ev.slug} ev={ev} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
