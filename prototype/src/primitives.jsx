// Shared small UI primitives.

const Btn = ({ variant = "secondary", size = "md", children, className = "", icon, iconRight, ...rest }) => {
  const base = "inline-flex items-center gap-2 t150 font-medium rounded-btn select-none";
  const sizes = {
    sm: "h-7 px-2.5 text-[12px]",
    md: "h-8 px-3 text-[13px]",
    lg: "h-10 px-4 text-[14px]",
  };
  const variants = {
    primary: "bg-accent hover:bg-accentD text-white border border-[#5A97FF]",
    secondary: "bg-surf2 hover:bg-[#222834] text-fg border border-line2",
    ghost: "bg-transparent hover:bg-surf1 text-fg border border-transparent",
    outline: "bg-transparent hover:bg-surf1 text-fg border border-line2",
    danger: "bg-transparent hover:bg-[#2a1b1a] text-bad border border-[#3a2422]",
    link: "text-accent hover:text-[#7AAEFF] bg-transparent border-0 px-0",
  };
  return (
    <button {...rest} className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}>
      {icon}{children}{iconRight}
    </button>
  );
};

const Pill = ({ children, tone = "neutral", className = "" }) => {
  const tones = {
    neutral: "bg-[#141821] text-[#B9BEC7] border-line2",
    accent:  "bg-[#131C2E] text-[#9AB4E8] border-[#2A3B5E]",
    ok:      "bg-[#12241B] text-ok border-[#1E3A2A]",
    warn:    "bg-[#2A2314] text-warn border-[#3E331E]",
    bad:     "bg-[#2A1817] text-bad border-[#3E2322]",
    tier:    "bg-transparent text-fg border-line2",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 h-[20px] rounded-[4px] text-[11px] font-medium border ${tones[tone]} ${className}`}>
      {children}
    </span>
  );
};

const SourceChip = ({ url, icon, children, className = "" }) => (
  <a
    href="#"
    onClick={e => e.preventDefault()}
    className={`src mono inline-flex items-center gap-1 text-[11px] text-[#8C929A] hover:text-[#9AB4E8] t150 ${className}`}
    title={url}
  >
    {icon || <I.Globe size={11} stroke={1.5} />}
    <span className="text-[10.5px]">source:</span>
    <u style={{ textDecorationColor: "#3E4756", textUnderlineOffset: "2px" }}>{children || url}</u>
    <I.External size={10} stroke={1.5} className="opacity-60" />
  </a>
);

const Card = ({ children, className = "", hoverable = false }) => (
  <div className={`bg-surf1 border border-line rounded-card ${hoverable ? "t150 hover:border-line2 hover:bg-[#161A21]" : ""} ${className}`}>
    {children}
  </div>
);

const SectionHead = ({ title, kicker, right, className = "" }) => (
  <div className={`flex items-end justify-between mb-3 ${className}`}>
    <div className="flex items-baseline gap-3">
      {kicker && <span className="mono text-[10.5px] uppercase tracking-[0.14em] text-mute2">{kicker}</span>}
      <h2 className="text-[15px] font-semibold tracking-tightish">{title}</h2>
    </div>
    {right}
  </div>
);

const FeedbackBar = ({ onUp, onDown, className = "" }) => {
  const [v, setV] = React.useState(null);
  return (
    <div className={`flex items-center gap-0.5 opacity-0 group-hover:opacity-100 t150 ${className}`}>
      <button
        aria-label="helpful"
        onClick={() => setV(v === "up" ? null : "up")}
        className={`w-6 h-6 rounded flex items-center justify-center t150 ${v === "up" ? "text-ok bg-[#12241B]" : "text-mute hover:text-fg hover:bg-surf2"}`}
      ><I.ThumbsUp size={12} /></button>
      <button
        aria-label="not helpful"
        onClick={() => setV(v === "down" ? null : "down")}
        className={`w-6 h-6 rounded flex items-center justify-center t150 ${v === "down" ? "text-bad bg-[#2A1817]" : "text-mute hover:text-fg hover:bg-surf2"}`}
      ><I.ThumbsDown size={12} /></button>
    </div>
  );
};

// Rectangular, monochrome logo placeholder
const LogoTile = ({ letters, size = 48, className = "" }) => (
  <div
    className={`shrink-0 border border-line2 flex items-center justify-center hatch-dense ${className}`}
    style={{ width: size, height: size, borderRadius: 4, background: "#10141A" }}
  >
    <span className="mono font-semibold text-[11px] tracking-wider text-fg" style={{ letterSpacing: "0.08em" }}>
      {letters}
    </span>
  </div>
);

// Trend arrow w/ delta
const Trend = ({ delta }) => {
  const up = delta > 0;
  const flat = Math.abs(delta) < 0.01;
  if (flat) return <span className="mono text-[10.5px] text-mute2">—</span>;
  const color = up ? "text-ok" : "text-bad";
  return (
    <span className={`mono inline-flex items-center gap-0.5 text-[10.5px] ${color}`}>
      {up ? <I.ArrowUp size={10} stroke={1.8} /> : <I.ArrowDown size={10} stroke={1.8} />}
      {Math.abs(delta).toFixed(delta % 1 === 0 ? 0 : 2).replace(/\.?0+$/, "")}%
    </span>
  );
};

// Avatar placeholder 40x40
const Avatar = ({ initials, size = 40, className = "" }) => (
  <div
    className={`shrink-0 border border-line2 flex items-center justify-center ${className}`}
    style={{ width: size, height: size, borderRadius: 4, background: "#10141A" }}
  >
    <span className="font-semibold text-[13px] text-fg">{initials}</span>
  </div>
);

Object.assign(window, { Btn, Pill, SourceChip, Card, SectionHead, FeedbackBar, LogoTile, Trend, Avatar });
