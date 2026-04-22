/**
 * Temporary design-tokens smoke page.
 *
 * Purpose: verify Tailwind v4 @theme tokens, custom utilities, and
 * next/font wiring all render correctly before porting real pages.
 * Replaced by /login redirect in Task 6.
 */
export default function Home() {
  return (
    <main className="p-10 space-y-8 max-w-3xl">
      <header>
        <div className="mono text-[10.5px] uppercase tracking-[0.18em] text-mute2 mb-2">
          Design tokens · smoke
        </div>
        <h1 className="text-3xl font-semibold tracking-tighter2">4casters</h1>
        <p className="text-sm text-mute mt-1">
          If this renders dark with Inter + JetBrains Mono visible below, tokens work.
        </p>
      </header>

      <section className="space-y-2">
        <div className="mono text-[10.5px] uppercase tracking-[0.14em] text-mute2">Surfaces</div>
        <div className="flex gap-2">
          {[
            { name: "bg", cls: "bg-bg" },
            { name: "surf1", cls: "bg-surf1" },
            { name: "surf2", cls: "bg-surf2" },
            { name: "surf3", cls: "bg-surf3" },
          ].map((s) => (
            <div
              key={s.name}
              className={`${s.cls} w-20 h-14 border border-line rounded-card flex items-center justify-center`}
            >
              <span className="mono text-[11px] text-mute">{s.name}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <div className="mono text-[10.5px] uppercase tracking-[0.14em] text-mute2">
          Accent + status
        </div>
        <div className="flex gap-2">
          {[
            { name: "accent", cls: "bg-accent text-white" },
            { name: "accentD", cls: "bg-accentD text-white" },
            { name: "ok", cls: "bg-ok text-bg" },
            { name: "warn", cls: "bg-warn text-bg" },
            { name: "bad", cls: "bg-bad text-white" },
          ].map((s) => (
            <div
              key={s.name}
              className={`${s.cls} w-20 h-14 rounded-card flex items-center justify-center`}
            >
              <span className="mono text-[11px]">{s.name}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <div className="mono text-[10.5px] uppercase tracking-[0.14em] text-mute2">Text</div>
        <p className="text-fg text-base">foreground · high contrast body text</p>
        <p className="text-mute text-sm">muted · secondary</p>
        <p className="text-mute2 text-xs">mute2 · tertiary</p>
        <p className="mono text-[13px] text-fg">JetBrains Mono · 0123456789</p>
      </section>

      <section className="space-y-2">
        <div className="mono text-[10.5px] uppercase tracking-[0.14em] text-mute2">
          Custom utilities
        </div>
        <div className="flex gap-3 items-center">
          <button className="h-8 px-3 bg-accent hover:bg-accentD text-white rounded-btn text-[13px] font-medium t150">
            t150 button (hover)
          </button>
          <div className="w-14 h-14 border border-line2 rounded-[4px] hatch-dense bg-surf1" />
          <div className="w-14 h-14 border border-line2 rounded-[4px] hatch bg-surf1" />
          <div className="fadein px-3 py-2 border border-line rounded-btn text-[12px] mono">
            .fadein
          </div>
          <div className="qmark text-5xl text-mute2 select-none leading-none">&ldquo;</div>
        </div>
      </section>
    </main>
  );
}
