"use client";

import { cn } from "@/lib/cn";

/**
 * Horizontal group of toggleable monospace chips used for the region
 * and tier filters on /events.
 */
export function FilterGroup<T extends string>({
  label,
  options,
  active,
  onToggle,
}: {
  label: string;
  options: readonly T[];
  active: Set<T>;
  onToggle: (v: T) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="mono text-[10.5px] uppercase tracking-[0.14em] text-mute2">
        {label}
      </span>
      <div className="flex items-center gap-1">
        {options.map((o) => {
          const on = active.has(o);
          return (
            <button
              key={o}
              type="button"
              onClick={() => onToggle(o)}
              aria-pressed={on}
              className={cn(
                "h-7 px-2.5 rounded-btn border t150 text-[12px] font-medium mono",
                on
                  ? "bg-[#131C2E] text-[#9AB4E8] border-[#2A3B5E]"
                  : "bg-transparent text-[#B4B9C2] border-line2 hover:bg-surf1 hover:text-fg",
              )}
            >
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}
