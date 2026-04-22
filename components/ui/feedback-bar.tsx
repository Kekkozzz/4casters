"use client";

import * as React from "react";
import { ThumbsUp, ThumbsDown } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

export type FeedbackVote = "up" | "down" | null;

/**
 * Thumbs up/down pair used for per-card feedback in the eval loop.
 * Mutually exclusive: clicking one un-selects the other. Clicking the
 * same one again clears the vote.
 */
export function FeedbackBar({
  onChange,
  className,
}: {
  onChange?: (vote: FeedbackVote) => void;
  className?: string;
}) {
  const [v, setV] = React.useState<FeedbackVote>(null);
  const toggle = (next: Exclude<FeedbackVote, null>) => {
    const val: FeedbackVote = v === next ? null : next;
    setV(val);
    onChange?.(val);
  };
  return (
    <div
      className={cn(
        "flex items-center gap-0.5 opacity-0 group-hover:opacity-100 t150",
        className,
      )}
    >
      <button
        type="button"
        aria-label="helpful"
        aria-pressed={v === "up"}
        onClick={() => toggle("up")}
        className={cn(
          "w-6 h-6 rounded flex items-center justify-center t150",
          v === "up"
            ? "text-ok bg-[#12241B]"
            : "text-mute hover:text-fg hover:bg-surf2",
        )}
      >
        <ThumbsUp size={12} />
      </button>
      <button
        type="button"
        aria-label="not helpful"
        aria-pressed={v === "down"}
        onClick={() => toggle("down")}
        className={cn(
          "w-6 h-6 rounded flex items-center justify-center t150",
          v === "down"
            ? "text-bad bg-[#2A1817]"
            : "text-mute hover:text-fg hover:bg-surf2",
        )}
      >
        <ThumbsDown size={12} />
      </button>
    </div>
  );
}
