import {
  buildMatchContextPacket,
  trimToBudget,
  PacketBuilderError,
} from "./packet-builder";
import type { SynthesisProvider, SynthesisResult } from "./provider";
import type { MatchContextPacket, SheetOutput } from "./types";
import {
  stripInvalidFields,
  validateSheet,
  type ValidationViolation,
} from "./validator";

export type OrchestratorResult = {
  matchId: string;
  output: SheetOutput;
  packet: MatchContextPacket;
  violations: ValidationViolation[];
  retried: boolean;
  provider: { name: string; model: string };
  tokensInput: number;
  tokensOutput: number;
  latencyMs: number;
};

export class SynthesisError extends Error {
  constructor(
    public readonly code: "match_not_found" | "packet_too_large" | "model_failure",
    message: string,
  ) {
    super(message);
  }
}

/**
 * Generate a validated sheet for a match.
 *
 * Pipeline: build packet -> trim to budget -> call provider -> validate
 * -> (if any violations) retry once -> (still failing) strip invalid
 * fields. Consumers always get a sheet; the orchestrator surfaces
 * `retried` + `violations` for the eval log.
 */
export async function generateSheetForMatch(
  matchId: string,
  provider: SynthesisProvider,
): Promise<OrchestratorResult> {
  let packet: MatchContextPacket;
  try {
    const raw = await buildMatchContextPacket(matchId);
    packet = trimToBudget(raw);
  } catch (err) {
    if (err instanceof PacketBuilderError) {
      const code = err.message.includes("not found")
        ? "match_not_found"
        : "packet_too_large";
      throw new SynthesisError(code, err.message);
    }
    throw err;
  }

  const first = await safeGenerate(provider, packet);

  const firstCheck = validateSheet(packet, first.output);
  if (firstCheck.ok) {
    return toResult({
      matchId,
      packet,
      synthesis: first,
      provider,
      violations: [],
      retried: false,
    });
  }

  // One retry; on second failure we strip and accept.
  const second = await safeGenerate(provider, packet);
  const secondCheck = validateSheet(packet, second.output);
  if (secondCheck.ok) {
    return toResult({
      matchId,
      packet,
      synthesis: second,
      provider,
      violations: [],
      retried: true,
    });
  }

  const stripped = stripInvalidFields(second.output, secondCheck.violations);
  return toResult({
    matchId,
    packet,
    synthesis: { ...second, output: stripped },
    provider,
    violations: secondCheck.violations,
    retried: true,
  });
}

async function safeGenerate(
  provider: SynthesisProvider,
  packet: MatchContextPacket,
): Promise<SynthesisResult> {
  try {
    return await provider.generateSheet(packet);
  } catch (err) {
    throw new SynthesisError(
      "model_failure",
      err instanceof Error ? err.message : String(err),
    );
  }
}

function toResult(args: {
  matchId: string;
  packet: MatchContextPacket;
  synthesis: SynthesisResult;
  provider: SynthesisProvider;
  violations: ValidationViolation[];
  retried: boolean;
}): OrchestratorResult {
  return {
    matchId: args.matchId,
    output: args.synthesis.output,
    packet: args.packet,
    violations: args.violations,
    retried: args.retried,
    provider: { name: args.provider.name, model: args.provider.model },
    tokensInput: args.synthesis.tokensInput,
    tokensOutput: args.synthesis.tokensOutput,
    latencyMs: args.synthesis.latencyMs,
  };
}
