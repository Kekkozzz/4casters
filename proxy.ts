import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

/** Routes that require an authenticated session. */
const PROTECTED_PREFIXES = [
  "/events",
  "/matches",
  "/sheets",
  "/saved",
  "/settings",
];

/**
 * Guard protected app routes behind Supabase auth (Next.js 16 proxy).
 * Set `NEXT_PUBLIC_DEV_NO_AUTH=true` in `.env.local` to skip the check
 * during local smoke testing when email delivery is unreliable.
 */
export async function proxy(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_DEV_NO_AUTH === "true") {
    return NextResponse.next({ request });
  }

  const { supabaseResponse, user } = await updateSession(request);

  const needsAuth = PROTECTED_PREFIXES.some((p) =>
    request.nextUrl.pathname.startsWith(p),
  );
  if (needsAuth && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect_to", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Exclude Next.js assets, the auth callback, and API routes that
    // handle their own auth. Everything else passes through the guard.
    "/((?!_next/static|_next/image|favicon.ico|auth/callback|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
