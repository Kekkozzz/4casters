import { cn } from "@/lib/cn";

/**
 * In-page section header: optional kicker (numeric/label monospace),
 * title, and right-slot for secondary actions like "expand all".
 */
export function SectionHead({
  title,
  kicker,
  right,
  className,
}: {
  title: string;
  kicker?: string;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-end justify-between mb-3", className)}>
      <div className="flex items-baseline gap-3">
        {kicker && (
          <span className="mono text-[10.5px] uppercase tracking-[0.14em] text-mute2">
            {kicker}
          </span>
        )}
        <h2 className="text-[15px] font-semibold tracking-tightish">{title}</h2>
      </div>
      {right}
    </div>
  );
}
