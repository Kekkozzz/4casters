import { ArrowUp, ArrowDown } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

/**
 * Inline trend indicator: small arrow + percentage with color semantics.
 * Near-zero deltas render as em-dash (flat).
 */
export function Trend({
  delta,
  className,
}: {
  delta: number;
  className?: string;
}) {
  const flat = Math.abs(delta) < 0.01;
  if (flat) {
    return (
      <span className={cn("mono text-[10.5px] text-mute2", className)}>—</span>
    );
  }
  const up = delta > 0;
  const color = up ? "text-ok" : "text-bad";
  const abs = Math.abs(delta);
  // Show decimals only when needed; drop trailing zeros.
  const value = (abs % 1 === 0
    ? abs.toFixed(0)
    : abs.toFixed(2).replace(/\.?0+$/, ""));
  return (
    <span
      className={cn(
        "mono inline-flex items-center gap-0.5 text-[10.5px]",
        color,
        className,
      )}
    >
      {up ? (
        <ArrowUp size={10} strokeWidth={1.8} />
      ) : (
        <ArrowDown size={10} strokeWidth={1.8} />
      )}
      {value}%
    </span>
  );
}
