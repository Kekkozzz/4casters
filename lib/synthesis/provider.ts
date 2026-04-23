import type { MatchContextPacket, SheetOutput } from "./types";

/**
 * Adapter boundary between the synthesis route and the LLM.
 * Keeping this interface intentionally narrow means swapping to a
 * different provider (Claude, OpenAI, or direct Gemini REST) is a
 * one-file change.
 */
export interface SynthesisProvider {
  readonly name: string;
  readonly model: string;
  generateSheet(packet: MatchContextPacket): Promise<SynthesisResult>;
}

export type SynthesisResult = {
  output: SheetOutput;
  tokensInput: number;
  tokensOutput: number;
  latencyMs: number;
};
