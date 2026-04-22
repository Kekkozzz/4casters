// /sheets — user's generated sheets, sortable table.

const MySheets = ({ go }) => {
  const [sort, setSort] = React.useState({ key: "generated", dir: "desc" });
  const sorted = React.useMemo(() => {
    const copy = [...MY_SHEETS];
    copy.sort((a, b) => {
      const av = a[sort.key] || ""; const bv = b[sort.key] || "";
      if (av < bv) return sort.dir === "asc" ? -1 : 1;
      if (av > bv) return sort.dir === "asc" ?  1 : -1;
      return 0;
    });
    return copy;
  }, [sort]);

  const setSortKey = (key) => {
    setSort(s => s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" });
  };

  return (
    <>
      <PageHeader
        title="My Sheets"
        kicker="Library"
        right={
          <>
            <div className="relative">
              <I.Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-mute2" />
              <input placeholder="Search sheets…" className="h-8 w-60 pl-8 pr-2 bg-surf1 border border-line2 rounded-btn text-[12.5px] placeholder:text-mute2 focus:border-accent focus:outline-none t150" />
            </div>
            <Btn variant="secondary" size="md" icon={<I.Download size={13} />}>Export all</Btn>
          </>
        }
      />

      <div className="px-8 py-6">
        {sorted.length === 0 ? (
          <div className="border border-dashed border-line rounded-card px-6 py-14 text-center">
            <div className="text-[13px] text-mute mb-3">No sheets yet. Pick a match from an event to generate your first.</div>
            <Btn variant="primary" size="md" onClick={() => go({ name: "events" })}>Browse events</Btn>
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
            {sorted.map((r, i) => (
              <button
                key={r.id}
                onClick={() => go({ name: "sheet", id: r.id })}
                className={`w-full grid grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_180px_120px_40px] h-12 px-4 items-center text-left t150 row-hover ${i < sorted.length - 1 ? "border-b border-line" : ""}`}
              >
                <div className="text-[13px] font-medium truncate">{r.match}</div>
                <div className="text-[12.5px] text-mute truncate">{r.event}</div>
                <div className="mono text-[11.5px] text-[#B4B9C2]">{r.generated}</div>
                <div>
                  {r.status === "ready" ? (
                    <Pill tone="ok"><span className="w-1 h-1 rounded-full bg-ok" /> Ready</Pill>
                  ) : (
                    <Pill tone="warn"><span className="w-1 h-1 rounded-full bg-warn" /> Outdated</Pill>
                  )}
                </div>
                <div className="flex justify-end">
                  <I.ChevRight size={13} className="text-mute2" />
                </div>
              </button>
            ))}
          </div>
        )}
        <div className="mt-3 mono text-[11px] text-mute2">
          {sorted.length} sheets · sorted by {sort.key} {sort.dir}
        </div>
      </div>
    </>
  );
};

const SortHead = ({ col, label, sort, onClick }) => {
  const active = sort.key === col;
  return (
    <button onClick={() => onClick(col)}
      className={`mono text-[10.5px] uppercase tracking-[0.14em] flex items-center gap-1 t150 ${active ? "text-fg" : "text-mute2 hover:text-fg"}`}>
      {label}
      {active ? (sort.dir === "asc" ? <I.ChevUp size={11} /> : <I.ChevDown size={11} />) : <I.Sort size={11} className="opacity-40" />}
    </button>
  );
};

Object.assign(window, { MySheets });
