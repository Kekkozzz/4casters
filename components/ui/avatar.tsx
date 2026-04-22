import { cn } from "@/lib/cn";

/**
 * Initials-only square avatar placeholder. Used on player profile cards.
 */
export function Avatar({
  initials,
  size = 40,
  className,
}: {
  initials: string;
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "shrink-0 border border-line2 flex items-center justify-center",
        className,
      )}
      style={{
        width: size,
        height: size,
        borderRadius: 4,
        background: "#10141A",
      }}
    >
      <span className="font-semibold text-[13px] text-fg">{initials}</span>
    </div>
  );
}
