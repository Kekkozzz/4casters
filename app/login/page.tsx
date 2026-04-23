"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Btn } from "@/components/ui/primitives";
import { Mail, Check, ChevRight } from "@/components/ui/icons";
import { SheetTeaser } from "./sheet-teaser";
import { createClient } from "@/utils/supabase/client";

const DEV_BYPASS = process.env.NEXT_PUBLIC_DEV_NO_AUTH === "true";

// useSearchParams() needs to sit inside a Suspense boundary so Next.js
// can static-render the page shell. Split the body out and wrap it.
export default function LoginPage() {
  return (
    <React.Suspense fallback={null}>
      <LoginBody />
    </React.Suspense>
  );
}

function LoginBody() {
  const router = useRouter();
  const search = useSearchParams();
  const redirectTo = search.get("redirect_to") ?? "/events";

  const [email, setEmail] = React.useState("");
  const [sent, setSent] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setPending(true);
    setError(null);
    try {
      const supabase = createClient();
      const callback =
        typeof window !== "undefined"
          ? `${window.location.origin}/auth/callback?redirect_to=${encodeURIComponent(redirectTo)}`
          : undefined;
      const { error: authErr } = await supabase.auth.signInWithOtp({
        email,
        options: callback ? { emailRedirectTo: callback } : undefined,
      });
      if (authErr) {
        setError(authErr.message);
        return;
      }
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setPending(false);
    }
  };

  const onGoogle = async () => {
    setPending(true);
    setError(null);
    try {
      const supabase = createClient();
      const callback =
        typeof window !== "undefined"
          ? `${window.location.origin}/auth/callback?redirect_to=${encodeURIComponent(redirectTo)}`
          : undefined;
      const { error: authErr } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: callback ? { redirectTo: callback } : undefined,
      });
      if (authErr) setError(authErr.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="h-14 border-b border-line flex items-center px-6 justify-between">
        <div className="flex items-baseline gap-[1px]">
          <span className="mono font-semibold text-[15px] tracking-tighter2 text-fg">4</span>
          <span className="font-semibold text-[15px] tracking-tighter2 text-fg">casters</span>
          <span className="ml-2 w-1 h-1 rounded-full bg-accent translate-y-[-2px]" />
        </div>
        <nav className="flex items-center gap-4 text-[12px] text-mute">
          <a className="hover:text-fg t150" href="#">
            Changelog
          </a>
          <a className="hover:text-fg t150" href="#">
            Docs
          </a>
          <span className="mono text-[11px] text-mute2">v0.1.0</span>
        </nav>
      </header>

      <section className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <div className="mono text-[10.5px] uppercase tracking-[0.18em] text-mute2 mb-3">
            Caster prep · Rocket League
          </div>
          <h1 className="text-[32px] leading-[1.1] font-semibold tracking-tighter2 mb-2">
            Prep like Derek.
            <br />
            Without being Derek.
          </h1>
          <p className="text-[13.5px] leading-[1.55] text-mute mb-8">
            Match sheets for Rocket League casters. Data from Liquipedia and BLAST.
            Every quote sourced.
          </p>

          {!sent ? (
            <form onSubmit={onSubmit} className="space-y-3">
              <label className="block">
                <span className="block mono text-[10.5px] uppercase tracking-[0.14em] text-mute2 mb-1.5">
                  Work email
                </span>
                <div className="relative">
                  <Mail
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-mute2"
                  />
                  <input
                    autoFocus
                    type="email"
                    placeholder="you@studio.gg"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-10 pl-9 pr-3 bg-surf1 border border-line2 rounded-btn text-[13.5px] placeholder:text-mute2 focus:border-accent focus:outline-none t150"
                  />
                </div>
              </label>

              <Btn
                type="submit"
                variant="primary"
                size="lg"
                className="w-full justify-center"
                disabled={pending}
              >
                {pending ? "Sending…" : "Send magic link"}
              </Btn>

              <div className="flex items-center gap-3 py-1">
                <div className="flex-1 h-px bg-line" />
                <span className="mono text-[10px] text-mute2 uppercase tracking-[0.14em]">or</span>
                <div className="flex-1 h-px bg-line" />
              </div>

              <Btn
                variant="outline"
                size="lg"
                className="w-full justify-center"
                type="button"
                onClick={onGoogle}
                disabled={pending}
              >
                Continue with Google
              </Btn>

              {error ? (
                <div className="mt-2 text-[11.5px] text-bad mono break-words">
                  {error}
                </div>
              ) : null}

              {DEV_BYPASS ? (
                <Btn
                  variant="ghost"
                  size="sm"
                  className="w-full justify-center mt-2"
                  type="button"
                  onClick={() => router.push(redirectTo)}
                >
                  Dev bypass — skip auth
                  <ChevRight size={12} />
                </Btn>
              ) : null}
            </form>
          ) : (
            <div className="border border-line rounded-card bg-surf1 p-5">
              <div className="flex items-center gap-2 text-ok text-[13px] font-medium mb-1">
                <Check size={14} /> Magic link sent
              </div>
              <div className="text-[12.5px] text-mute mb-4 leading-[1.55]">
                Check <span className="mono text-fg">{email}</span>. Link expires in 15 minutes. If
                it doesn&apos;t arrive within a minute, check spam — Supabase&apos;s free tier
                defaults to 3 auth emails per hour.
              </div>
              <Btn
                variant="outline"
                size="sm"
                onClick={() => {
                  setSent(false);
                  setError(null);
                }}
              >
                Use a different email
                <ChevRight size={13} />
              </Btn>
            </div>
          )}

          <div className="mt-10">
            <div className="mono text-[10px] uppercase tracking-[0.14em] text-mute2 mb-2">
              A sheet looks like this
            </div>
            <SheetTeaser />
          </div>
        </div>
      </section>

      <footer className="px-6 py-4 border-t border-line flex items-center justify-between text-[11px] text-mute2">
        <div className="flex items-center gap-4">
          <span className="mono">© 2026 4casters</span>
          <Link href="#" className="hover:text-fg t150">
            Privacy
          </Link>
          <Link href="#" className="hover:text-fg t150">
            Terms
          </Link>
        </div>
        <span className="mono">built for casters, not marketers</span>
      </footer>
    </div>
  );
}
