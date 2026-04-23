import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Supabase magic-link / OAuth callback handler.
 *
 * Why cookies go on the NextResponse directly (not via `cookies()` from
 * next/headers): in a route handler that returns `NextResponse.redirect`,
 * the redirect response is constructed independently of the `cookies()`
 * helper, so `cookieStore.set(...)` never propagates. Setting cookies on
 * the NextResponse instance via `response.cookies.set(...)` IS honored
 * across the redirect, which is what the Supabase session needs to stick.
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const redirectTo = req.nextUrl.searchParams.get("redirect_to") ?? "/events";

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", req.url));
  }

  const response = NextResponse.redirect(new URL(redirectTo, req.url));

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent(error.message)}`,
        req.url,
      ),
    );
  }

  return response;
}
