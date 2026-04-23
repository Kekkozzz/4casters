"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Btn } from "@/components/ui/primitives";
import { Refresh } from "@/components/ui/icons";

interface Props {
  matchId: string;
  label?: string;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
}

export function GenerateButton({
  matchId,
  label = "Generate sheet",
  variant = "primary",
  size = "md",
}: Props) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const trigger = async () => {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/sheet/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ match_id: matchId }),
      });
      if (!res.ok) {
        const body: { error?: string; message?: string } = await res.json().catch(() => ({}));
        setError(body.message ?? `Generation failed (HTTP ${res.status}).`);
        return;
      }
      // Server now has the sheet persisted; refresh so the server component
      // re-renders with the generated content.
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex flex-col items-stretch gap-2">
      <Btn
        variant={variant}
        size={size}
        onClick={trigger}
        disabled={pending}
        icon={pending ? <Refresh size={13} className="animate-spin" /> : undefined}
      >
        {pending ? "Generating…" : label}
      </Btn>
      {error ? (
        <div className="text-[11.5px] text-bad mono">{error}</div>
      ) : null}
    </div>
  );
}
