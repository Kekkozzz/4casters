"use client";

import * as React from "react";
import { Btn } from "@/components/ui/primitives";

interface AppErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AppError({ error, reset }: AppErrorProps) {
  React.useEffect(() => {
    console.error("[app/(app)/error]", error);
  }, [error]);

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-6">
      <div className="w-full max-w-xl border border-line rounded-card bg-surf1 p-6 text-center">
        <div className="mono text-[10.5px] uppercase tracking-[0.16em] text-mute2 mb-3">
          Protected app error
        </div>
        <h2 className="text-[24px] leading-tight font-semibold mb-2">This page couldn&apos;t load</h2>
        <p className="text-[13px] text-mute leading-relaxed mb-5">
          The request reached the authenticated area, but a server-rendering error occurred.
          Try reloading. If it persists in production, check server logs using the digest.
        </p>

        {error.digest ? (
          <div className="mono text-[11px] text-mute2 border border-line2 rounded-btn px-3 py-2 mb-5">
            digest: {error.digest}
          </div>
        ) : null}

        <div className="flex items-center justify-center gap-3">
          <Btn size="sm" variant="outline" onClick={reset}>
            Reload
          </Btn>
        </div>
      </div>
    </div>
  );
}
