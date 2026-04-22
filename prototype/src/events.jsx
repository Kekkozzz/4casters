// /events — Upcoming events dashboard.

const REGION_OPTS = ["EU", "NA", "APAC", "SAM"];
const TIER_OPTS   = ["S", "A", "B"];

const EventsPage = ({ go }) => {
  const [regions, setRegions] = React.useState(new Set());
  const [tiers,   setTiers]   = React.useState(new Set());

  const toggle = (set, setter, val) => {
    const next = new Set(set);
    next.has(val) ? next.delete(val) : next.add(val);
    setter(next);
  };

  const filtered = EVENTS.filter(e =>
    (regions.size === 0 || regions.has(e.region)) &&
    (tiers.size   === 0 || tiers.has(e.tier))
  );

  return (
    <>
      <PageHeader
        title="Upcoming Events"
        kicker="Dashboard"
        right={
          <>
            <div className="relative">
              <I.Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-mute2" />
              <input
                placeholder="Search events…"
                className="h-8 w-60 pl-8 pr-2 bg-surf1 border border-line2 rounded-btn text-[12.5px] placeholder:text-mute2 focus:border-accent focus:outline-none t150"
              />
            </div>
            <Btn variant="secondary" size="md" icon={<I.Plus size={13} />}>Add event</Btn>
          </>
        }
      />

      <div className="px-8 py-6">
        {/* Filter row */}
        <div className="flex items-center gap-6 mb-6">
          <FilterGroup label="Region" options={REGION_OPTS} active={regions}
            onToggle={v => toggle(regions, setRegions, v)} />
          <div className="w-px h-5 bg-line" />
          <FilterGroup label="Tier" options={TIER_OPTS} active={tiers}
            onToggle={v => toggle(tiers, setTiers, v)} />

          <div className="flex-1" />
          <div className="mono text-[11px] text-mute2">
            {filtered.length} <span className="opacity-70">of</span> {EVENTS.length} events
          </div>
        </div>

        {/* Cards grid */}
        {filtered.length === 0 ? (
          <div className="border border-dashed border-line rounded-card px-6 py-14 text-center">
            <div className="text-[13px] text-mute mb-3">No events match that filter.</div>
            <Btn size="sm" variant="outline" onClick={() => { setRegions(new Set()); setTiers(new Set()); }}>
              Clear filters
            </Btn>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(ev => <EventCard key={ev.slug} ev={ev} onOpen={() => go({ name: "eventDetail", slug: ev.slug })} />)}
          </div>
        )}
      </div>
    </>
  );
};

const FilterGroup = ({ label, options, active, onToggle }) => (
  <div className="flex items-center gap-2">
    <span className="mono text-[10.5px] uppercase tracking-[0.14em] text-mute2">{label}</span>
    <div className="flex items-center gap-1">
      {options.map(o => {
        const on = active.has(o);
        return (
          <button
            key={o}
            onClick={() => onToggle(o)}
            className={`h-7 px-2.5 rounded-btn border t150 text-[12px] font-medium mono
              ${on ? "bg-[#131C2E] text-[#9AB4E8] border-[#2A3B5E]" : "bg-transparent text-[#B4B9C2] border-line2 hover:bg-surf1 hover:text-fg"}`}
          >
            {o}
          </button>
        );
      })}
    </div>
  </div>
);

const EventCard = ({ ev, onOpen }) => (
  <button
    onClick={onOpen}
    className="text-left group"
  >
    <Card hoverable className="p-4 t150 group-hover:translate-y-[-1px]">
      <div className="flex items-start gap-3 mb-4">
        <LogoTile letters={ev.letters} size={48} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-1">
            <Pill tone="tier">{ev.region}</Pill>
            <Pill tone={ev.tier === "S" ? "accent" : ev.tier === "A" ? "neutral" : "neutral"}>Tier {ev.tier}</Pill>
          </div>
          <h3 className="text-[14.5px] font-semibold tracking-tightish leading-[1.3] truncate">{ev.name}</h3>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-line">
        <div className="flex items-center gap-1.5 text-[12px] text-mute">
          <I.Calendar size={12} className="text-mute2" />
          <span className="mono text-[11.5px]">{ev.short}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[12px] text-mute">
          <span>{ev.upcoming} upcoming matches</span>
          <I.ChevRight size={13} className="text-mute2 t150 group-hover:translate-x-0.5 group-hover:text-accent" />
        </div>
      </div>
    </Card>
  </button>
);

Object.assign(window, { EventsPage });
