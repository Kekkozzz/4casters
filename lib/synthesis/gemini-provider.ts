import { NoObjectGeneratedError, generateObject } from "ai";
import { google } from "@ai-sdk/google";
import type { SynthesisProvider, SynthesisResult } from "./provider";
import type { MatchContextPacket } from "./types";
import { SheetOutputSchema } from "./types";
import { SYSTEM_PROMPT, buildUserPrompt } from "./prompt";

/**
 * Default model. `gemini-2.5-flash` is the headline model but gets
 * "high demand" rejections (3 retries still fail) during peak hours,
 * so we default to the less-loaded `gemini-2.0-flash`. Override at
 * runtime via GEMINI_SYNTHESIS_MODEL, e.g.:
 *   "gemini-2.5-flash" (when capacity frees up)
 *   "gemini-3-flash-preview" (once live via @ai-sdk/google)
 *   "gemini-1.5-flash" (oldest stable, highest headroom)
 */
const DEFAULT_MODEL = process.env.GEMINI_SYNTHESIS_MODEL ?? "gemini-2.0-flash";

export class GeminiFlashProvider implements SynthesisProvider {
  readonly name = "gemini-flash";
  readonly model: string;

  constructor(modelId: string = DEFAULT_MODEL) {
    this.model = modelId;
  }

  async generateSheet(packet: MatchContextPacket): Promise<SynthesisResult> {
    const started = Date.now();
    try {
      const result = await generateObject({
        model: google(this.model),
        schema: SheetOutputSchema,
        system: SYSTEM_PROMPT,
        prompt: buildUserPrompt(packet),
        // Low-ish temperature so the model doesn't embellish beyond the packet.
        temperature: 0.2,
      });
      return {
        output: result.object,
        tokensInput: result.usage?.inputTokens ?? 0,
        tokensOutput: result.usage?.outputTokens ?? 0,
        latencyMs: Date.now() - started,
      };
    } catch (err) {
      // Surface the full failure chain so the operator sees the real cause
      // (overload, quota, auth, schema mismatch, transport) instead of a
      // wrapped generic error.
      const isNoObject = NoObjectGeneratedError.isInstance(err);
      const raw = isNoObject ? (err.text ?? "") : "";
      const preview = raw.length > 2000 ? raw.slice(0, 2000) + "…" : raw;
      const cause = err instanceof Error && err.cause instanceof Error
        ? err.cause.message
        : err instanceof Error
          ? err.message
          : String(err);
      console.error(
        JSON.stringify({
          ts: new Date().toISOString(),
          kind: isNoObject ? "synthesis.no_object" : "synthesis.provider_error",
          model: this.model,
          cause,
          raw_preview: preview || undefined,
        }),
      );
      throw new Error(
        isNoObject
          ? `model output failed schema validation: ${cause}`
          : `gemini provider failed: ${cause}`,
      );
    }
  }
}
