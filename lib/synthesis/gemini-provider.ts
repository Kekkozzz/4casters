import { NoObjectGeneratedError, generateObject } from "ai";
import { google } from "@ai-sdk/google";
import type { SynthesisProvider, SynthesisResult } from "./provider";
import type { MatchContextPacket } from "./types";
import { SheetOutputSchema } from "./types";
import { SYSTEM_PROMPT, buildUserPrompt } from "./prompt";

/**
 * Default model. `gemini-3-flash-preview` is the user-stated choice but
 * isn't reliably live via `@ai-sdk/google` yet, so we default to the
 * GA `gemini-2.5-flash`. Override via constructor arg or the
 * `GEMINI_SYNTHESIS_MODEL` env var.
 */
const DEFAULT_MODEL = process.env.GEMINI_SYNTHESIS_MODEL ?? "gemini-2.5-flash";

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
      // AI SDK's NoObjectGeneratedError includes the raw text and the
      // underlying cause (schema validation issue). Surface both so the
      // operator can see exactly what Gemini produced and why it was
      // rejected, instead of the generic "response did not match schema".
      if (NoObjectGeneratedError.isInstance(err)) {
        const raw = err.text ?? "";
        const preview = raw.length > 2000 ? raw.slice(0, 2000) + "…" : raw;
        const cause = err.cause instanceof Error ? err.cause.message : String(err.cause);
        console.error(
          JSON.stringify({
            ts: new Date().toISOString(),
            kind: "synthesis.no_object",
            model: this.model,
            cause,
            raw_preview: preview,
          }),
        );
        throw new Error(`model output failed schema validation: ${cause}`);
      }
      throw err;
    }
  }
}
