// /events/[slug] — Match table for a single event.

const EventDetail = ({ slug, go }) => {
  const ev = EVENTS.find(e => e.slug === slug) || EVENTS[0];
  const rows = MATCHES.filter(m => m.event === ev.slug);

  // Local copy so Generate animates.
  const [matches, setMatches] = React.useState(rows);
  const tickRef = React.useRef(null);

  React.useEffect(() => {
    tickRef.current = setInterval(() => {
      setMatches(ms => ms.map(m => {
        if (m.status !== "generating") return m;
        const next = (m.progress || 0) + 0.06 + Math.random() * 0.04;
        if (next >= 1) return { ...m, status: "ready", progress: 1 };
        return { ...m, progress: next };
      }));
    }, 700);
    return () => clearInterval(tickRef.current);
  }, []);

  const generateOne = (id) => setMatches(ms => ms.map(m => m.id === id ? { ...m, status: "generating", progress: 0.05 } : m));
  const generateAll = () => setMatches(ms => ms.map(m => m.status === "idle" ? { ...m, status: "generating", progress: 0.05 } : m));

  return (
    <>
      {/* Header */}
      <div className="border-b border-line px-8 pt-6 pb-5 bg-bg sticky top-0 z-20">
        <button
          onClick={() => go({ name: "events" })}
          className="mono text-[11px] text-mute hover:text-fg t150 flex items-center gap-1 mb-3"
        >
          <I.ArrowLeft size={11} /> all events
        </button>
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <LogoTile letters={ev.letters} size={56} />
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Pill tone="tier">{ev.region}</Pill>
                <Pill tone={ev.tier === "S" ? "accent" : "neutral"}>Tier {ev.tier}</Pill>
                <Pill tone="neutral">{ev.matchesTotal} matches</Pill>
              </div>
              <h1 className="text-[22px] font-semibold tracking-tighter2 leading-tight">{ev.name}</h1>
              <div className="flex items-center gap-3 mt-1.5 text-[12.5px] text-mute">
                <span className="mono">{ev.dates}</span>
                <span className="text-mute2">·</span>
                <a href="#" onClick={e=>e.preventDefault()}
                  className="inline-flex items-center gap-1 hover:text-fg t150">
                  <span className="mono text-[11.5px]">{ev.liquipedia}</span>
                  <I.External size={11} />
                </a>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <Btn variant="ghost" size="md" icon={<I.Bookmark size={13} />}>Save</Btn>
            <div className="tip">
              <Btn variant="secondary" size="md" onClick={generateAll}>
                Generate all matches
              </Btn>
              <div className="tip-body -bottom-2 right-0 translate-y-full bg-surf2 border border-line2 rounded-card p-3 w-64 text-[11.5px] text-mute z-40">
                <div className="flex items-center gap-1.5 text-warn font-medium mb-1">
                  <I.AlertTri size={11} /> Heads up
                </div>
                Each sheet takes 10–30s. Generating {matches.filter(m=>m.status==="idle").length} sheets will take roughly {matches.filter(m=>m.status==="idle").length * 20}s and count against today's quota.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="px-8 py-6">
        <div className="border border-line rounded-card overflow-hidden bg-surf1">
          {/* head */}
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
              last={i === matches.length - 1}
              onGenerate={() => generateOne(m.id)}
              onOpen={() => go({ name: "sheet", id: m.id })}
            />
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between text-[11.5px] text-mute2 mono">
          <span>{matches.filter(m => m.status === "ready").length} ready · {matches.filter(m => m.status === "generating").length} generating · {matches.filter(m => m.status === "idle").length} idle</span>
          <span>sources: liquipedia · blast · youtube</span>
        </div>
      </div>
    </>
  );
};

const ColHead = ({ children, className = "" }) => (
  <div className={`mono text-[10.5px] uppercase tracking-[0.14em] text-mute2 flex items-center ${className}`}>{children}</div>
);

const MatchRow = ({ m, last, onGenerate, onOpen }) => {
  const A = TEAMS[m.a]; const B = TEAMS[m.b];
  return (
    <div className={`grid grid-cols-[140px_minmax(0,1fr)_100px_80px_180px] h-[68px] px-4 items-center row-hover t150 ${last ? "" : "border-b border-line"}`}>
      {/* time */}
      <div className="mono text-[12px]">
        <div className="text-fg">{m.time.split(" ").slice(0,2).join(" ")}</div>
        <div className="text-mute2 text-[10.5px]">{m.time.split(" ").slice(2).join(" ")}</div>
      </div>

      {/* matchup */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="flex items-center gap-2 justify-end min-w-0">
          <div className="text-right min-w-0">
            <div className="text-[13px] font-medium truncate">{A.name}</div>
            <div className="mono text-[10.5px] text-mute2">{A.short}</div>
          </div>
          <LogoTile letters={A.letters} size={32} />
        </div>
        <span className="mono text-[10.5px] text-mute2 uppercase tracking-[0.14em]">vs</span>
        <div className="flex items-center gap-2 min-w-0">
          <LogoTile letters={B.letters} size={32} />
          <div className="min-w-0">
            <div className="text-[13px] font-medium truncate">{B.name}</div>
            <div className="mono text-[10.5px] text-mute2">{B.short}</div>
          </div>
        </div>
      </div>

      {/* stage */}
      <div><Pill tone={m.stage.includes("Final") ? "accent" : "neutral"}>{m.stage}</Pill></div>
      {/* format */}
      <div><Pill tone="neutral">{m.format}</Pill></div>

      {/* status */}
      <div className="flex items-center justify-end">
        {m.status === "idle" && (
          <Btn variant="primary" size="md" onClick={onGenerate}>Generate</Btn>
        )}
        {m.status === "generating" && (
          <div className="w-full max-w-[180px]">
            <div className="flex items-center justify-between mb-1">
              <span className="mono text-[11px] text-mute">Generating…</span>
              <span className="mono text-[11px] text-accent">{Math.floor((m.progress || 0) * 100)}%</span>
            </div>
            <div className="h-1 rounded-full bg-[#1E2430] overflow-hidden">
              <div
                className="h-full bg-accent t150"
                style={{ width: `${Math.max(4, (m.progress || 0) * 100)}%` }}
              />
            </div>
          </div>
        )}
        {m.status === "ready" && (
          <button onClick={onOpen}
            className="text-[12.5px] text-accent hover:text-[#7AAEFF] t150 inline-flex items-center gap-1 font-medium">
            Sheet ready
            <I.ChevRight size={13} />
          </button>
        )}
      </div>
    </div>
  );
};

Object.assign(window, { EventDetail });
