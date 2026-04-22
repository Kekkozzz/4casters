// Sidebar + app shell layout.

const Sidebar = ({ route, go }) => {
  const items = [
    { id: "events",  label: "Events",        icon: I.Calendar, active: route.name === "events" || route.name === "eventDetail" || route.name === "sheet" },
    { id: "sheets",  label: "My Sheets",     icon: I.List,     active: route.name === "sheets" },
    { id: "saved",   label: "Saved Players", icon: I.Bookmark, active: route.name === "saved" },
    { id: "settings",label: "Settings",      icon: I.Settings, active: route.name === "settings" },
  ];
  return (
    <aside className="w-60 shrink-0 border-r border-line bg-bg flex flex-col">
      {/* Wordmark */}
      <div className="h-14 flex items-center px-5 border-b border-line">
        <div className="flex items-baseline gap-[1px]">
          <span className="mono font-semibold text-[15px] tracking-tighter2 text-fg">4</span>
          <span className="font-semibold text-[15px] tracking-tighter2 text-fg">casters</span>
          <span className="ml-2 w-1 h-1 rounded-full bg-accent translate-y-[-2px]" aria-hidden />
        </div>
      </div>

      {/* Nav */}
      <nav className="p-2 flex-1">
        {items.map(it => (
          <button
            key={it.id}
            onClick={() => {
              if (it.id === "events")  go({ name: "events" });
              if (it.id === "sheets")  go({ name: "sheets" });
              if (it.id === "saved")   go({ name: "saved" });
              if (it.id === "settings") go({ name: "settings" });
            }}
            className={`w-full flex items-center gap-2.5 px-2.5 h-9 rounded-btn t150 text-[13px]
              ${it.active ? "bg-surf1 text-fg" : "text-[#B4B9C2] hover:bg-surf1 hover:text-fg"}`}
          >
            <it.icon size={15} className={it.active ? "text-accent" : ""} />
            <span className="font-medium">{it.label}</span>
            {it.active && <span className="ml-auto w-1 h-1 rounded-full bg-accent" />}
          </button>
        ))}
      </nav>

      {/* User footer */}
      <div className="p-3 border-t border-line">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded border border-line2 bg-surf2 flex items-center justify-center text-[11px] font-semibold">DA</div>
          <div className="flex-1 min-w-0">
            <div className="text-[12.5px] font-medium truncate">Derek A.</div>
            <div className="text-[10.5px] text-mute2 mono truncate">derek@castercraft.gg</div>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="mono text-[10px] text-mute2 uppercase tracking-[0.14em]">v0.3.2 · beta</span>
          <span className="flex items-center gap-1 text-[10px] text-mute">
            <span className="w-1.5 h-1.5 rounded-full bg-ok" /> all sources up
          </span>
        </div>
      </div>
    </aside>
  );
};

const Shell = ({ route, go, children }) => (
  <div className="min-h-screen flex">
    <Sidebar route={route} go={go} />
    <main className="flex-1 min-w-0">{children}</main>
  </div>
);

// Generic page header strip used on Events / Sheets / stubs
const PageHeader = ({ title, sub, right, kicker }) => (
  <div className="h-14 border-b border-line px-8 flex items-center justify-between bg-bg sticky top-0 z-20">
    <div className="flex items-baseline gap-3">
      {kicker && <span className="mono text-[10.5px] uppercase tracking-[0.16em] text-mute2">{kicker}</span>}
      <h1 className="text-[17px] font-semibold tracking-tighter2">{title}</h1>
      {sub && <span className="text-[12px] text-mute">{sub}</span>}
    </div>
    <div className="flex items-center gap-2">{right}</div>
  </div>
);

// Stub screen for Saved Players / Settings — nods to the empty-state rule
const StubScreen = ({ title, message, action }) => (
  <>
    <PageHeader title={title} />
    <div className="px-8 py-20 flex flex-col items-center text-center">
      <div className="text-[13px] text-mute max-w-sm mb-4">{message}</div>
      {action}
    </div>
  </>
);

Object.assign(window, { Sidebar, Shell, PageHeader, StubScreen });
