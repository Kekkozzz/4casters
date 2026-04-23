import type { OrchestratorResult } from "./orchestrator";

/**
 * Minimal eval log for the synthesis pipeline. JSONL records piped to
 * stdout (picked up by Vercel log drain / Axiom in prod, visible in
 * `vercel logs` locally). Sub-plan #6 ships just the write; the
 * admin dashboard + golden-set regression runner are SP6.5 / v1.1.
 *
 * Records are terse on purpose: we want to be able to grep/filter a
 * day's logs without blowing out our log quota.
 */
export function logSynthesisRun(result: OrchestratorResult): void {
  const record = {
    ts: new Date().toISOString(),
    kind: "synthesis.generated",
    match_id: result.matchId,
    provider: result.provider.name,
    model: result.provider.model,
    tokens_in: result.tokensInput,
    tokens_out: result.tokensOutput,
    latency_ms: result.latencyMs,
    retried: result.retried,
    violations: result.violations.length,
    output_counts: {
      hooks: result.output.narrative_hooks.length,
      talking_points: result.output.talking_points.length,
      quotes: result.output.selected_quotes.length,
      notables: result.output.player_notables.reduce(
        (sum, p) => sum + p.notables.length,
        0,
      ),
    },
  };
  // Structured log sink (picked up by Vercel log drains).
  console.log(JSON.stringify(record));
}
