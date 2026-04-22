import { describe, it, expect } from "vitest";
import { SHEET } from "@/lib/mock/sheet";

describe("SHEET mock", () => {
  it("has the expected match header", () => {
    expect(SHEET.matchId).toMatch(/^m-/);
    expect(SHEET.teams.a.short).toBeTruthy();
    expect(SHEET.teams.b.short).toBeTruthy();
  });

  it("every hook carries a source URL and a backing path", () => {
    for (const h of SHEET.hooks) {
      expect(h.source.url).toMatch(/^https?:/);
      expect(h.source.srcType).toMatch(/^(liquipedia|blast|youtube|twitter)$/);
      expect(h.backing.length).toBeGreaterThan(0);
    }
  });

  it("every quote carries a source URL (no-source-no-show guardrail)", () => {
    for (const q of SHEET.quotes) {
      expect(q.source.url).toBeTruthy();
      expect(q.source.srcType).toBeTruthy();
    }
  });

  it("missing notable items omit source and are flagged explicitly", () => {
    const missing = SHEET.players.flatMap((p) => p.notable).filter((n) => n.missing);
    expect(missing.length).toBeGreaterThan(0);
    for (const m of missing) {
      expect(m.source).toBeUndefined();
    }
  });
});
