import { cn } from "@/lib/cn";

/**
 * Monochrome rectangular logo placeholder with hatched texture.
 * Used as a team/event identity tile when real logos aren't available.
 */
export function LogoTile({
  letters,
  size = 48,
  className,
}: {
  letters: string;
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "shrink-0 border border-line2 flex items-center justify-center hatch-dense",
        className,
      )}
      style={{
        width: size,
        height: size,
        borderRadius: 4,
        background: "#10141A",
      }}
    >
      <span
        className="mono font-semibold text-[11px] tracking-wider text-fg"
        style={{ letterSpacing: "0.08em" }}
      >
        {letters}
      </span>
    </div>
  );
}
