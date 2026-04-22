/**
 * Sticky page header used on pages inside the (app) route group.
 * Left side: optional kicker + title + optional sub-text.
 * Right side: actions slot (search field, primary buttons, etc.).
 */
export function PageHeader({
  title,
  sub,
  right,
  kicker,
}: {
  title: string;
  sub?: string;
  right?: React.ReactNode;
  kicker?: string;
}) {
  return (
    <div className="h-14 border-b border-line px-8 flex items-center justify-between bg-bg sticky top-0 z-20">
      <div className="flex items-baseline gap-3">
        {kicker && (
          <span className="mono text-[10.5px] uppercase tracking-[0.16em] text-mute2">
            {kicker}
          </span>
        )}
        <h1 className="text-[17px] font-semibold tracking-tighter2">{title}</h1>
        {sub && <span className="text-[12px] text-mute">{sub}</span>}
      </div>
      <div className="flex items-center gap-2">{right}</div>
    </div>
  );
}
