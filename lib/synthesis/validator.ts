/**
 * Three-layer validation for a raw model output against the packet it
 * was generated from.
 *
 *   1. citation   — every `backing` path resolves to a real node in the packet
 *   2. quote      — every `selected_quotes[].text` matches a candidate_quote
 *                   letter-for-letter (whitespace-tolerant)
 *   3. number     — every digit sequence that appears in hooks /
 *                   talking_points / player_notables exists somewhere
 *                   in the packet's textual content
 *
 * Failures are collected — the caller decides whether to regenerate
 * (max 1 retry) or strip the offending field.
 */

import type { MatchContextPacket, SheetOutput } from "./types";

export type ValidationViolation = {
  kind: "citation" | "quote" | "number";
  path: string;
  detail: string;
};

export type ValidationResult = {
  ok: boolean;
  violations: ValidationViolation[];
};

const NUMBER_RE = /\b\d+(?:\.\d+)?\b/g;
const WS_RE = /\s+/g;

function normalizeForQuoteMatch(s: string): string {
  return s
    .trim()
    .replace(WS_RE, " ")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .toLowerCase();
}

/**
 * Walk a `backing` path like `roster_crossings[0]` or `player_stats_30d[2].player_id`
 * against the packet. Returns whether the path resolves.
 */
export function resolveBacking(
  packet: MatchContextPacket,
  path: string,
): boolean {
  if (!path) return false;
  const parts = path.match(/[^.[\]]+/g);
  if (!parts) return false;
  let cur: unknown = packet;
  for (const part of parts) {
    if (cur === null || typeof cur !== "object") return false;
    if (Array.isArray(cur)) {
      const idx = Number.parseInt(part, 10);
      if (!Number.isFinite(idx)) return false;
      cur = cur[idx];
    } else {
      cur = (cur as Record<string, unknown>)[part];
    }
  }
  return cur !== undefined && cur !== null;
}

function collectPacketText(packet: MatchContextPacket): string {
  return JSON.stringify(packet);
}

function extractNumbers(text: string): string[] {
  return text.match(NUMBER_RE) ?? [];
}

/**
 * Walk the packet recursively and return every numeric value encountered,
 * as their native Number form. Lets us validate output numbers like "1.0"
 * against packet values like `1` (JSON drops the trailing zero).
 */
function collectPacketNumericValues(packet: MatchContextPacket): Set<number> {
  const values = new Set<number>();
  const walk = (node: unknown): void => {
    if (typeof node === "number" && Number.isFinite(node)) {
      values.add(node);
      return;
    }
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (node && typeof node === "object") {
      for (const v of Object.values(node as Record<string, unknown>)) {
        walk(v);
      }
    }
  };
  walk(packet);
  return values;
}

export function validateCitations(
  packet: MatchContextPacket,
  output: SheetOutput,
): ValidationViolation[] {
  const violations: ValidationViolation[] = [];
  const check = (parentPath: string, backing: string) => {
    if (!resolveBacking(packet, backing)) {
      violations.push({
        kind: "citation",
        path: parentPath,
        detail: `backing "${backing}" does not resolve in packet`,
      });
    }
  };
  output.narrative_hooks.forEach((h, i) =>
    check(`narrative_hooks[${i}]`, h.backing),
  );
  output.talking_points.forEach((t, i) =>
    check(`talking_points[${i}]`, t.backing),
  );
  output.player_notables.forEach((p, i) =>
    p.notables.forEach((n, j) =>
      check(`player_notables[${i}].notables[${j}]`, n.backing),
    ),
  );
  return violations;
}

export function validateQuotes(
  packet: MatchContextPacket,
  output: SheetOutput,
): ValidationViolation[] {
  const violations: ValidationViolation[] = [];
  const candidateNormalized = new Map<string, string>();
  for (const q of packet.candidate_quotes) {
    candidateNormalized.set(q.id, normalizeForQuoteMatch(q.text));
  }

  output.selected_quotes.forEach((sel, i) => {
    const path = `selected_quotes[${i}]`;
    const expected = candidateNormalized.get(sel.candidate_id);
    if (!expected) {
      violations.push({
        kind: "quote",
        path,
        detail: `candidate_id ${sel.candidate_id} not in packet`,
      });
      return;
    }
    if (normalizeForQuoteMatch(sel.text) !== expected) {
      violations.push({
        kind: "quote",
        path,
        detail: "quote text does not match candidate (whitespace-tolerant)",
      });
    }
  });

  return violations;
}

export function validateNumbers(
  packet: MatchContextPacket,
  output: SheetOutput,
): ValidationViolation[] {
  const packetText = collectPacketText(packet);
  const packetNumberStrings = new Set(extractNumbers(packetText));
  const packetNumberValues = collectPacketNumericValues(packet);

  const violations: ValidationViolation[] = [];
  const checkString = (path: string, str: string) => {
    for (const n of extractNumbers(str)) {
      if (packetNumberStrings.has(n)) continue;
      const asNumber = Number(n);
      if (Number.isFinite(asNumber) && packetNumberValues.has(asNumber)) {
        continue;
      }
      violations.push({
        kind: "number",
        path,
        detail: `number "${n}" not found in packet`,
      });
    }
  };

  output.narrative_hooks.forEach((h, i) => {
    checkString(`narrative_hooks[${i}].title`, h.title);
    checkString(`narrative_hooks[${i}].body`, h.body);
  });
  output.talking_points.forEach((t, i) => {
    checkString(`talking_points[${i}].trigger`, t.trigger);
    checkString(`talking_points[${i}].say`, t.say);
  });
  output.player_notables.forEach((p, i) =>
    p.notables.forEach((n, j) =>
      checkString(`player_notables[${i}].notables[${j}].text`, n.text),
    ),
  );

  return violations;
}

export function validateSheet(
  packet: MatchContextPacket,
  output: SheetOutput,
): ValidationResult {
  const violations = [
    ...validateCitations(packet, output),
    ...validateQuotes(packet, output),
    ...validateNumbers(packet, output),
  ];
  return { ok: violations.length === 0, violations };
}

/**
 * Strip fields whose validator flagged them. Used as the second-chance
 * after a retry: we'd rather render a smaller, correct sheet than
 * retry forever or show fabricated content.
 */
export function stripInvalidFields(
  output: SheetOutput,
  violations: ValidationViolation[],
): SheetOutput {
  const paths = new Set(violations.map((v) => v.path));

  const hooks = output.narrative_hooks.filter(
    (_, i) => !paths.has(`narrative_hooks[${i}]`),
  );
  const points = output.talking_points.filter(
    (_, i) => !paths.has(`talking_points[${i}]`),
  );
  const quotes = output.selected_quotes.filter(
    (_, i) => !paths.has(`selected_quotes[${i}]`),
  );
  const notables = output.player_notables.map((p, i) => ({
    ...p,
    notables: p.notables.filter(
      (_, j) => !paths.has(`player_notables[${i}].notables[${j}]`),
    ),
  }));

  return {
    narrative_hooks: hooks,
    talking_points: points,
    selected_quotes: quotes,
    player_notables: notables,
  };
}
