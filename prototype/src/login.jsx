// /login screen

const Login = ({ go }) => {
  const [email, setEmail] = React.useState("");
  const [sent, setSent] = React.useState(false);
  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <div className="h-14 border-b border-line flex items-center px-6 justify-between">
        <div className="flex items-baseline gap-[1px]">
          <span className="mono font-semibold text-[15px] tracking-tighter2 text-fg">4</span>
          <span className="font-semibold text-[15px] tracking-tighter2 text-fg">casters</span>
          <span className="ml-2 w-1 h-1 rounded-full bg-accent translate-y-[-2px]" />
        </div>
        <div className="flex items-center gap-4 text-[12px] text-mute">
          <a className="hover:text-fg t150" href="#" onClick={e=>e.preventDefault()}>Changelog</a>
          <a className="hover:text-fg t150" href="#" onClick={e=>e.preventDefault()}>Docs</a>
          <span className="mono text-[11px] text-mute2">v0.3.2</span>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <div className="mono text-[10.5px] uppercase tracking-[0.18em] text-mute2 mb-3">Caster prep · Rocket League</div>
          <h1 className="text-[32px] leading-[1.1] font-semibold tracking-tighter2 mb-2">
            Prep like Derek.<br />Without being Derek.
          </h1>
          <p className="text-[13.5px] leading-[1.55] text-mute mb-8">
            Match sheets for Rocket League casters. Data from Liquipedia and BLAST.
            Every quote sourced.
          </p>

          {!sent ? (
            <form
              onSubmit={e => { e.preventDefault(); if (email) setSent(true); }}
              className="space-y-3"
            >
              <label className="block">
                <span className="block mono text-[10.5px] uppercase tracking-[0.14em] text-mute2 mb-1.5">Work email</span>
                <div className="relative">
                  <I.Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-mute2" />
                  <input
                    autoFocus
                    type="email"
                    placeholder="you@studio.gg"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full h-10 pl-9 pr-3 bg-surf1 border border-line2 rounded-btn text-[13.5px] placeholder:text-mute2 focus:border-accent focus:outline-none t150"
                  />
                </div>
              </label>

              <Btn type="submit" variant="primary" size="lg" className="w-full justify-center">
                Send magic link
              </Btn>

              <div className="flex items-center gap-3 py-1">
                <div className="flex-1 h-px bg-line" />
                <span className="mono text-[10px] text-mute2 uppercase tracking-[0.14em]">or</span>
                <div className="flex-1 h-px bg-line" />
              </div>

              <Btn variant="outline" size="lg" className="w-full justify-center"
                icon={<I.Google size={15} />}
                onClick={() => go({ name: "events" })}
              >
                Continue with Google
              </Btn>
            </form>
          ) : (
            <div className="border border-line rounded-card bg-surf1 p-5">
              <div className="flex items-center gap-2 text-ok text-[13px] font-medium mb-1">
                <I.Check size={14} /> Magic link sent
              </div>
              <div className="text-[12.5px] text-mute mb-4 leading-[1.55]">
                Check <span className="mono text-fg">{email}</span>. Link expires in 15 minutes.
              </div>
              <Btn variant="outline" size="sm" onClick={() => go({ name: "events" })}>
                Simulate click — open app
                <I.ChevRight size={13} />
              </Btn>
            </div>
          )}

          <div className="mt-10">
            <div className="mono text-[10px] uppercase tracking-[0.14em] text-mute2 mb-2">A sheet looks like this</div>
            <SheetTeaser />
          </div>
        </div>
      </div>

      <footer className="px-6 py-4 border-t border-line flex items-center justify-between text-[11px] text-mute2">
        <div className="flex items-center gap-4">
          <span className="mono">© 2026 4casters</span>
          <a href="#" onClick={e=>e.preventDefault()} className="hover:text-fg t150">Privacy</a>
          <a href="#" onClick={e=>e.preventDefault()} className="hover:text-fg t150">Terms</a>
        </div>
        <span className="mono">built for casters, not marketers</span>
      </footer>
    </div>
  );
};

// Tiny teaser — not a full sheet, just a hint
const SheetTeaser = () => (
  <div className="border border-line rounded-card bg-surf1 overflow-hidden">
    <div className="px-3 py-2 flex items-center justify-between border-b border-line">
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded-[2px] hatch-dense border border-line2" />
        <span className="text-[11.5px] font-semibold">Halcyon vs Verdant GG</span>
        <Pill tone="neutral">QF</Pill>
        <Pill tone="neutral">Bo5</Pill>
      </div>
      <span className="mono text-[10px] text-mute2">22 Apr · 20:00</span>
    </div>
    <div className="p-3 space-y-2">
      <div className="flex items-start gap-2">
        <div className="mono text-[10px] text-mute2 pt-0.5">01</div>
        <div className="text-[12px] leading-[1.5]">
          Milo faces ex-teammate Vatira for the first time since Lisbon split.
          <span className="block mono text-[10px] text-mute2 mt-0.5">source: liquipedia.net/…</span>
        </div>
      </div>
      <div className="flex items-start gap-2">
        <div className="mono text-[10px] text-mute2 pt-0.5">02</div>
        <div className="text-[12px] leading-[1.5]">
          Halcyon undefeated in Bo5 on Champions Field since November.
          <span className="block mono text-[10px] text-mute2 mt-0.5">source: blast.tv/…</span>
        </div>
      </div>
      <div className="flex items-start gap-2 opacity-40">
        <div className="mono text-[10px] text-mute2 pt-0.5">03</div>
        <div className="text-[12px] leading-[1.5]">
          Verdant's rotation metric is the league's most extreme…
        </div>
      </div>
    </div>
  </div>
);

Object.assign(window, { Login });
