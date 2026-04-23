import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import type { SynthesisProvider, SynthesisResult } from "./provider";
import type { MatchContextPacket } from "./types";
import { SheetOutputSchema } from "./types";
import { SYSTEM_PROMPT, buildUserPrompt } from "./prompt";

/**
 * Default model string. Gemini 3 Flash Preview is the user-stated
 * choice; if it's not live at request time the AI SDK returns a
 * clear error and we can swap to "gemini-2.5-flash" here.
 */
const DEFAULT_MODEL = "gemini-3-flash-preview";

export class GeminiFlashProvider implements SynthesisProvider {
  readonly name = "gemini-flash";
  readonly model: string;

  constructor(modelId: string = DEFAULT_MODEL) {
    this.model = modelId;
  }

  async generateSheet(packet: MatchContextPacket): Promise<SynthesisResult> {
    const started = Date.now();
    const result = await generateObject({
      model: google(this.model),
      schema: SheetOutputSchema,
      system: SYSTEM_PROMPT,
      prompt: buildUserPrompt(packet),
      // Deterministic-ish: low temperature keeps the model from embellishing,
      // which is exactly what our validators punish.
      temperature: 0.2,
    });
    return {
      output: result.object,
      tokensInput: result.usage?.inputTokens ?? 0,
      tokensOutput: result.usage?.outputTokens ?? 0,
      latencyMs: Date.now() - started,
    };
  }
}
