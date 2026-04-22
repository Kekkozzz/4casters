// /matches/[id] — THE hero sheet viewer.

const srcIcon = (t) => {
  if (t === "youtube")   return <I.Youtube  size={11} />;
  if (t === "twitter")   return <I.Twitter  size={11} />;
  if (t === "liquipedia")return <I.Globe    size={11} />;
  if (t === "blast")     return <I.Globe    size={11} />;
  return <I.Globe size={11} />;
};

const SheetViewer = ({ id, go }) => {
  const s = SHEET; // only one mock; any id maps to it
  const A = s.teams.a; const B = s.teams.b;
  const [regenerating, setRegenerating] = React.useState(false);

  return (
    <div className="bg-bg">
      {/* Sticky header */}
      <header className="sticky top-0 z-30 border-b border-line bg-bg/95 backdrop-blur-sm">
        <div className="px-8 h-[68px] flex items-center gap-6">
          <button
            onClick={() => go({ name: "eventDetail", slug: s.eventSlug })}
            className="w-8 h-8 rounded-btn border border-line2 bg-surf1 hover:bg-surf2 t150 flex items-center justify-center"
            aria-label="Back"
          >
            <I.ArrowLeft size={14} />
          </button>

          {/* Matchup header */}
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <TeamHead team={A} align="right" />
            <div className="px-3 py-1.5 rounded-[4px] border border-line2 bg-surf1">
              <div className="mono text-[10px] text-mute2 uppercase tracking-[0.16em] text-center">vs</div>
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

          {/* Actions */}
          <div className="flex items-center gap-1.5">
            <Btn
              variant="ghost" size="md"
              icon={<I.Refresh size={13} className={regenerating ? "animate-spin" : ""} />}
              onClick={() => { setRegenerating(true); setTimeout(() => setRegenerating(false), 2000); }}
            >
              Regenerate
            </Btn>
            <div className="w-px h-5 bg-line mx-1" />
            <Btn variant="ghost" size="md" icon={<I.Download size={13} />}>Export MD</Btn>
            <Btn variant="ghost" size="md" icon={<I.Download size={13} />}>Export PDF</Btn>
            <Btn variant="secondary" size="md" icon={<I.Share size={13} />}>Share</Btn>
          </div>
        </div>
      </header>

      <div className="px-8 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main column */}
        <div className="lg:col-span-8 space-y-8 min-w-0">
          <HooksSection hooks={s.hooks} />
          <H2HSection h2h={s.h2h} A={A} B={B} />
          <PlayerProfilesSection players={s.players} A={A} B={B} />
          <QuotesSection quotes={s.quotes} />
        </div>

        {/* Right column */}
        <aside className="lg:col-span-4">
          <div className="sticky top-[84px] space-y-4">
            <TalkingPointsCard points={s.talkingPoints} />
            <FreshnessCard freshness={s.freshness} />
          </div>
        </aside>
      </div>
    </div>
  );
};

const TeamHead = ({ team, align }) => (
  <div className={`flex items-center gap-2.5 min-w-0 ${align === "right" ? "flex-row-reverse text-right" : ""}`}>
    <LogoTile letters={team.letters} size={36} />
    <div className="min-w-0">
      <div className="text-[15px] font-semibold tracking-tightish truncate">{team.name}</div>
      <div className="mono text-[10.5px] text-mute2 flex items-center gap-2 justify-start">
        <span>{team.seed}</span>
        <span className="text-mute2">·</span>
        <span>{team.record}</span>
        <span className="text-mute2">·</span>
        <span>{team.region}</span>
      </div>
    </div>
  </div>
);

/* ───────────── Hooks ───────────── */

const HooksSection = ({ hooks }) => (
  <section>
    <SectionHead
      kicker="01"
      title="Narrative Hooks"
      right={<span className="mono text-[11px] text-mute2">{hooks.length} hooks</span>}
    />
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
      {hooks.map((h, i) => (
        <div key={i} className="group relative">
          <Card className="p-4 h-full t150 hover:border-line2">
            <div className="flex items-start gap-3">
              <div className="mono text-[11px] text-mute2 tracking-wider pt-0.5 select-none">
                {String(i + 1).padStart(2, "0")}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-[14px] font-semibold leading-[1.35] tracking-tightish mb-1.5 text-fg">
                  {h.title}
                </h4>
                <p className="text-[12.5px] leading-[1.55] text-[#B4B9C2] mb-3">{h.body}</p>
                <SourceChip icon={srcIcon(h.srcType)} url={h.source}>{h.source}</SourceChip>
              </div>
              <FeedbackBar className="-mr-1 -mt-1" />
            </div>
          </Card>
        </div>
      ))}
    </div>
  </section>
);

/* ───────────── Head-to-Head ───────────── */

const H2HSection = ({ h2h, A, B }) => (
  <section>
    <SectionHead
      kicker="02"
      title="Head-to-Head"
      right={
        <div className="flex items-center gap-3">
          <span className="mono text-[11px] text-mute2">last 5 meetings</span>
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-[4px] border border-line2 bg-surf1">
            <span className="mono text-[11.5px] font-semibold">{A.short}</span>
            <span className="mono text-[13px] font-semibold tabular-nums">
              <span className={h2h.aggregate.a > h2h.aggregate.b ? "text-fg" : "text-mute"}>{h2h.aggregate.a}</span>
              <span className="text-mute2 mx-1">—</span>
              <span className={h2h.aggregate.b > h2h.aggregate.a ? "text-fg" : "text-mute"}>{h2h.aggregate.b}</span>
            </span>
            <span className="mono text-[11.5px] font-semibold">{B.short}</span>
          </div>
        </div>
      }
    />
    <Card className="overflow-hidden group relative">
      <FeedbackBar className="absolute right-2 top-2 z-10" />
      <div className="grid grid-cols-[120px_1fr_160px_60px] h-9 px-4 items-center border-b border-line bg-[#10141A]">
        <ColHead>Date</ColHead>
        <ColHead>Event</ColHead>
        <ColHead>Result</ColHead>
        <ColHead className="justify-end">Won</ColHead>
      </div>
      {h2h.rows.map((r, i) => (
        <div key={i} className={`grid grid-cols-[120px_1fr_160px_60px] h-10 px-4 items-center text-[12.5px] ${i < h2h.rows.length - 1 ? "border-b border-line" : ""}`}>
          <div className="mono text-[11.5px] text-mute">{r.date}</div>
          <div className="text-[#D4D8DD] truncate">{r.event}</div>
          <div className="mono tabular-nums">{r.result}</div>
          <div className="flex justify-end">
            <span className={`mono text-[11px] font-semibold ${r.won === "a" ? "text-[#9AB4E8]" : "text-mute"}`}>
              {r.won === "a" ? A.short : B.short}
            </span>
          </div>
        </div>
      ))}
    </Card>
  </section>
);

/* ───────────── Player Profiles ───────────── */

const PlayerProfilesSection = ({ players, A, B }) => {
  const [open, setOpen] = React.useState(new Set([players[0].name, players[3].name])); // both strikers open by default
  const toggle = (name) => {
    const next = new Set(open);
    next.has(name) ? next.delete(name) : next.add(name);
    setOpen(next);
  };

  return (
    <section>
      <SectionHead
        kicker="03"
        title="Player Profiles"
        right={
          <button
            onClick={() => setOpen(open.size === players.length ? new Set() : new Set(players.map(p => p.name)))}
            className="mono text-[11px] text-mute hover:text-fg t150"
          >
            {open.size === players.length ? "collapse all" : "expand all"}
          </button>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        {/* Team A column */}
        <div className="space-y-2">
          <TeamHeading team={A} side="Halcyon" />
          {players.filter(p => p.team === "a").map(p => (
            <PlayerAccordion key={p.name} p={p} open={open.has(p.name)} onToggle={() => toggle(p.name)} team={A} />
          ))}
        </div>
        {/* Team B column */}
        <div className="space-y-2">
          <TeamHeading team={B} />
          {players.filter(p => p.team === "b").map(p => (
            <PlayerAccordion key={p.name} p={p} open={open.has(p.name)} onToggle={() => toggle(p.name)} team={B} />
          ))}
        </div>
      </div>
    </section>
  );
};

const TeamHeading = ({ team }) => (
  <div className="flex items-center gap-2 px-1 pb-1">
    <LogoTile letters={team.letters} size={18} />
    <span className="mono text-[10.5px] uppercase tracking-[0.16em] text-mute2">{team.name}</span>
    <div className="flex-1 h-px bg-line ml-1" />
  </div>
);

const PlayerAccordion = ({ p, open, onToggle, team }) => (
  <Card className="overflow-hidden group relative">
    <button onClick={onToggle} className="w-full px-3 py-3 flex items-center gap-3 t150 hover:bg-[#161A21]">
      <Avatar initials={p.initials} size={36} />
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-2">
          <span className="text-[13.5px] font-semibold tracking-tightish">{p.name}</span>
          <span className="mono text-[10px] text-mute2">{p.country}</span>
          <Pill tone="neutral" className="!h-[18px] !text-[10px]">{p.role}</Pill>
        </div>
        <div className="mono text-[10.5px] text-mute2 mt-0.5">{team.name}</div>
      </div>
      <FeedbackBar />
      <I.ChevDown size={14} className={`text-mute2 t150 ${open ? "rotate-180" : ""}`} />
    </button>

    {open && (
      <div className="border-t border-line px-3 pt-3 pb-4 fadein">
        {/* Stat grid */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          <Stat label="GPG"       s={p.stats.gpg}     fmt={v => v.toFixed(2)} />
          <Stat label="Save%"     s={p.stats.savePct} fmt={v => (v*100).toFixed(0) + "%"} />
          <Stat label="Shot%"     s={p.stats.shotPct} fmt={v => (v*100).toFixed(0) + "%"} />
          <Stat label="Demos/g"   s={p.stats.demos}   fmt={v => v.toFixed(2)} />
        </div>

        {/* Notable */}
        <div className="mono text-[10px] uppercase tracking-[0.14em] text-mute2 mb-2">Notable</div>
        <ul className="space-y-2">
          {p.notable.map((n, i) => (
            <li key={i} className="text-[12.5px] leading-[1.5] flex items-start gap-2">
              <span className="mono text-[10px] text-mute2 pt-1">·</span>
              {n.missing ? (
                <span className="italic text-mute">no data available</span>
              ) : (
                <div className="flex-1">
                  <div className="text-[#D4D8DD]">{n.text}</div>
                  <SourceChip icon={srcIcon(n.srcType)} url={n.src} className="mt-0.5">{n.src}</SourceChip>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    )}
  </Card>
);

const Stat = ({ label, s, fmt }) => (
  <div className="bg-bg border border-line rounded-[6px] px-2.5 py-2">
    <div className="mono text-[9.5px] uppercase tracking-[0.14em] text-mute2 mb-1">{label}</div>
    <div className="flex items-baseline justify-between gap-1">
      <span className="mono text-[15px] font-semibold tabular-nums">{fmt(s.v)}</span>
      <Trend delta={s.d} />
    </div>
  </div>
);

/* ───────────── Quotes ───────────── */

const QuotesSection = ({ quotes }) => (
  <section>
    <SectionHead kicker="04" title="Quotes" right={<span className="mono text-[11px] text-mute2">{quotes.length} · max 3</span>} />
    <div className="space-y-3">
      {quotes.map((q, i) => (
        <Card key={i} className="p-5 group relative t150 hover:border-line2">
          <div className="flex gap-4">
            <div className="qmark text-[64px] text-[#2A3244] select-none leading-[0.7] pt-1">“</div>
            <div className="flex-1 min-w-0">
              <div className="text-[15px] leading-[1.5] italic text-fg mb-3" style={{ textWrap: "pretty" }}>
                {q.text}
              </div>
              <div className="flex items-end justify-between gap-4 flex-wrap">
                <div>
                  <div className="text-[12.5px] font-medium">— {q.who}</div>
                  <div className="text-[11.5px] text-mute mt-0.5">{q.context}</div>
                </div>
                <SourceChip icon={srcIcon(q.srcType)} url={q.url}>{q.url}</SourceChip>
              </div>
            </div>
          </div>
          <div className="absolute top-3 right-3 flex items-center gap-1">
            <FeedbackBar />
            <button className="opacity-0 group-hover:opacity-100 t150 h-6 px-2 rounded text-[10.5px] mono text-mute hover:text-bad hover:bg-[#2A1817] flex items-center gap-1 border border-transparent hover:border-[#3a2422]">
              <I.Flag size={10} /> flag
            </button>
          </div>
        </Card>
      ))}
    </div>
  </section>
);

/* ───────────── Right column ───────────── */

const TalkingPointsCard = ({ points }) => (
  <Card className="p-4 group relative">
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-baseline gap-2">
        <span className="mono text-[10px] uppercase tracking-[0.14em] text-mute2">05</span>
        <h3 className="text-[13.5px] font-semibold tracking-tightish">Talking Points</h3>
      </div>
      <FeedbackBar />
    </div>
    <ul className="space-y-2.5">
      {points.map((p, i) => {
        // split "if X → Y" for visual rhythm
        const arrow = p.indexOf("→");
        const before = arrow > 0 ? p.slice(0, arrow).trim() : p;
        const after  = arrow > 0 ? p.slice(arrow + 1).trim() : "";
        return (
          <li key={i} className="mono text-[13px] leading-[1.55] flex items-start gap-2">
            <span className="text-mute2 pt-[1px] select-none">{String(i+1).padStart(2,"0")}</span>
            <span className="flex-1">
              <span className="text-[#B4B9C2]">{before}</span>
              {after && (
                <>
                  <span className="text-accent px-1">→</span>
                  <span className="text-fg">{after}</span>
                </>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  </Card>
);

const FreshnessCard = ({ freshness }) => (
  <Card className="p-4">
    <div className="flex items-center justify-between mb-2.5">
      <span className="mono text-[10px] uppercase tracking-[0.14em] text-mute2">Data freshness</span>
      <span className="w-1.5 h-1.5 rounded-full bg-ok" />
    </div>
    <div className="space-y-1.5 mono text-[11.5px]">
      <FreshRow label="Liquipedia" val={freshness.liquipedia} />
      <FreshRow label="BLAST"      val={freshness.blast} />
      <FreshRow label="YouTube"    val={freshness.youtube} />
    </div>
  </Card>
);

const FreshRow = ({ label, val }) => (
  <div className="flex items-center justify-between">
    <span className="text-mute">{label}</span>
    <span className="text-[#B4B9C2]">{val}</span>
  </div>
);

Object.assign(window, { SheetViewer });
