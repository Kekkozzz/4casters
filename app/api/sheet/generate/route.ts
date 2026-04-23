import { NextResponse } from "next/server";
import { z } from "zod";
import { generateSheetForMatch, SynthesisError } from "@/lib/synthesis/orchestrator";
import { GeminiFlashProvider } from "@/lib/synthesis/gemini-provider";
import { logSynthesisRun } from "@/lib/synthesis/eval-log";

// Synthesis is 10–30s on average; budget 60s.
export const maxDuration = 60;
export const runtime = "nodejs";

const BodySchema = z.object({
  match_id: z.string().min(1),
});

export async function POST(req: Request) {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return NextResponse.json(
      {
        error: "server_not_configured",
        message:
          "GOOGLE_GENERATIVE_AI_API_KEY is not set; ask ops to populate it.",
      },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "bad_request", message: "Body must be valid JSON" },
      { status: 400 },
    );
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "bad_request",
        message: "Expected { match_id: string }",
        issues: parsed.error.issues,
      },
      { status: 400 },
    );
  }

  const provider = new GeminiFlashProvider();
  try {
    const result = await generateSheetForMatch(parsed.data.match_id, provider);
    logSynthesisRun(result);
    return NextResponse.json({
      match_id: result.matchId,
      output: result.output,
      violations: result.violations,
      retried: result.retried,
      provider: result.provider,
      tokens: { input: result.tokensInput, output: result.tokensOutput },
      latency_ms: result.latencyMs,
    });
  } catch (err) {
    if (err instanceof SynthesisError) {
      const status =
        err.code === "match_not_found"
          ? 404
          : err.code === "packet_too_large"
          ? 413
          : 502;
      return NextResponse.json(
        { error: err.code, message: err.message },
        { status },
      );
    }
    // Unexpected error: log but don't leak internals.
    console.error(JSON.stringify({
      ts: new Date().toISOString(),
      kind: "synthesis.unexpected_error",
      message: err instanceof Error ? err.message : String(err),
    }));
    return NextResponse.json(
      { error: "internal", message: "Synthesis failed unexpectedly." },
      { status: 500 },
    );
  }
}
