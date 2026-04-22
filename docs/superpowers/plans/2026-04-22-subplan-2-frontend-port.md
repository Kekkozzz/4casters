# 4casters Sub-plan #2 — Frontend Port (Mock Data)

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the remaining four prototype pages (`/events`, `/events/[slug]`, `/matches/[id]`, `/sheets`) to Next.js 16 App Router with the full primitives set, sidebar app shell, and 1:1 visual parity with the prototype — using inline mock data so the UI is fully navigable end-to-end before any backend wiring lands.

**Architecture:** Single-package Next.js 16 + Tailwind v4 (scaffolded in Sub-plan #1). Pages use Client Components where interactive state is needed (event detail generate-progress, player accordion, sort headers); Server Components otherwise. All pages read mock data from `lib/mock/` (isolated so it's trivial to swap to real APIs in Sub-plan #7). `(app)` route group holds the sidebar layout; `/login` stays outside the group to remain chromeless.

**Tech Stack:** Same as Sub-plan #1. Adds: mock data module, one new route group, four new routes, six additional primitives (FeedbackBar, LogoTile, Avatar, Trend, SectionHead, PageHeader), Sidebar + Shell layout components.

**Prereq:** Sub-plan #1 complete (tag `v0.1.0-scaffold`). Git state clean on `main`, CI green.

**Reference prototype files** (1:1 targets):

- `prototype/src/events.jsx` → `app/(app)/events/page.tsx`
- `prototype/src/event_detail.jsx` → `app/(app)/events/[slug]/page.tsx`
- `prototype/src/sheet.jsx` → `app/(app)/matches/[id]/page.tsx`
- `prototype/src/my_sheets.jsx` → `app/(app)/sheets/page.tsx`
- `prototype/src/layout.jsx` → `app/(app)/layout.tsx` (Shell + Sidebar) + stub screens for `/saved`, `/settings`
- `prototype/src/primitives.jsx` → extended `components/ui/primitives.tsx` + split where responsibility grows
- `prototype/src/data.jsx` → `lib/mock/*.ts` (typed against `types/sheet.ts`)

---

## File structure after Sub-plan #2

```text
4casters/
├── app/
│   ├── (app)/
│   │   ├── layout.tsx                       (Shell with Sidebar)
│   │   ├── events/
│   │   │   ├── page.tsx
│   │   │   └── [slug]/page.tsx
│   │   ├── matches/
│   │   │   └── [id]/page.tsx
│   │   ├── sheets/page.tsx
│   │   ├── saved/page.tsx                   (stub)
│   │   └── settings/page.tsx                (stub)
│   ├── layout.tsx                           (root, unchanged)
│   ├── login/page.tsx                       (unchanged)
│   └── page.tsx                             (unchanged — redirects to /login)
├── components/
│   ├── ui/
│   │   ├── primitives.tsx                   (extended)
│   │   ├── feedback-bar.tsx
│   │   ├── logo-tile.tsx
│   │   ├── avatar.tsx
│   │   ├── trend.tsx
│   │   ├── section-head.tsx
│   │   └── page-header.tsx
│   ├── shell/
│   │   ├── sidebar.tsx
│   │   └── stub-screen.tsx
│   ├── sheet/
│   │   ├── hooks-section.tsx
│   │   ├── h2h-section.tsx
│   │   ├── player-profiles-section.tsx
│   │   ├── quotes-section.tsx
│   │   ├── talking-points-card.tsx
│   │   ├── freshness-card.tsx
│   │   └── team-head.tsx
│   └── events/
│       ├── event-card.tsx
│       ├── filter-group.tsx
│       └── match-row.tsx
├── lib/
│   ├── cn.ts                                (unchanged)
│   └── mock/
│       ├── events.ts
│       ├── teams.ts
│       ├── matches.ts
│       ├── sheet.ts                         (SHEET typed as SheetOutput)
│       └── my-sheets.ts
└── tests/
    ├── unit/
    │   ├── primitives.test.tsx              (extended)
    │   ├── feedback-bar.test.tsx
    │   ├── trend.test.tsx
    │   └── sheet-mock.test.ts               (shape conformance)
    └── e2e/
        ├── login.spec.ts                    (unchanged)
        ├── events.spec.ts
        ├── event-detail.spec.ts
        ├── sheet.spec.ts
        └── my-sheets.spec.ts
```

**Why this decomposition:**

- **`(app)` route group** — Next.js App Router convention: folder wrapped in `()` doesn't appear in the URL but shares a layout. Puts every authenticated page under the sidebar shell without affecting URLs.
- **Component folders per feature** (`components/sheet/`, `components/events/`, `components/shell/`) — pages stay small and compose, which is what you need when multiple pages share a primitive (e.g., `match-row` used by event detail, potentially shared later).
- **Sheet viewer broken into sections** — the prototype's `sheet.jsx` is 383 lines in one file. Splitting by section (`hooks-section`, `h2h-section`, etc.) keeps each file focused and makes it possible to test a single section in isolation.
- **`lib/mock/` isolated** — every mock import is a single swap-point for Sub-plan #7 (replace mock with server-side DB/API fetch).

---

## Design principles for this sub-plan

- **1:1 visual parity** — pixel-faithful to prototype. If something looks different, prototype wins unless there's a concrete accessibility/correctness reason.
- **Preserve component API** — primitive prop names, variant/tone/size names match prototype exactly. Swapping a component in a page should be mechanical.
- **Types over strings** — mock data is typed against `types/sheet.ts`. Any divergence surfaces as a TS error, not a runtime crash.
- **Server-first where possible** — pages default to Server Components; mark `"use client"` only where useState/useEffect/event handlers live.
- **Playwright per page** — each new page gets at least one smoke E2E (loads, renders key content, one interaction).
- **No backend wiring** — auth placeholders, Generate progress simulation, Export buttons inert. Wire-up is Sub-plan #7.
- **Frequent commits** — target 1 commit per task, 12-15 total for this sub-plan.

---

## Task 1: Extract mock data from prototype into typed `lib/mock/`

**Files:**

- Create: `lib/mock/teams.ts`, `lib/mock/events.ts`, `lib/mock/matches.ts`, `lib/mock/sheet.ts`, `lib/mock/my-sheets.ts`, `lib/mock/index.ts`
- Create test: `tests/unit/sheet-mock.test.ts`

Reference source: `prototype/src/data.jsx`.

- [ ] **Step 1.1: Write TEAMS mock**

File: `lib/mock/teams.ts`

Port the `TEAMS` object. Shape:

```ts
export interface MockTeam {
  liquipediaSlug: string;
  short: string;
  name: string;
  letters: string;
}

export const TEAMS: Record<string, MockTeam> = {
  halcyon:   { liquipediaSlug: "halcyon",   short: "HLC", name: "Halcyon",          letters: "HA" },
  verdant:   { liquipediaSlug: "verdant",   short: "VRD", name: "Verdant GG",        letters: "VD" },
  // ... copy remaining entries from prototype/src/data.jsx:78-87
};
```

- [ ] **Step 1.2: Write EVENTS mock**

File: `lib/mock/events.ts`

Mirror the `EVENTS` array from `prototype/src/data.jsx:3-76` with TS type:

```ts
export interface MockEvent {
  slug: string;
  name: string;
  letters: string;
  region: "EU" | "NA" | "APAC" | "SAM";
  tier: "S" | "A" | "B";
  dates: string;
  short: string;
  upcoming: number;
  matchesTotal: number;
  liquipedia: string;
}

export const EVENTS: MockEvent[] = [ /* copy entries */ ];
```

- [ ] **Step 1.3: Write MATCHES mock**

File: `lib/mock/matches.ts`

```ts
export interface MockMatch {
  id: string;
  event: string;             // MockEvent.slug
  time: string;              // human-readable, e.g. "Wed 20:00 CET"
  date: string;              // ISO 8601
  a: string;                 // TEAMS key
  b: string;                 // TEAMS key
  stage: string;
  format: "Bo3" | "Bo5" | "Bo7" | "Bo9";
  status: "ready" | "idle" | "generating";
  progress?: number;         // 0..1 when generating
}

export const MATCHES: MockMatch[] = [ /* copy from prototype/src/data.jsx:89-99 */ ];
```

- [ ] **Step 1.4: Write SHEET mock typed as `SheetOutput`**

File: `lib/mock/sheet.ts`

```ts
import type { SheetOutput } from "@/types/sheet";

export const SHEET: SheetOutput = { /* port from prototype/src/data.jsx:102-274 */ };
```

Map prototype fields to the typed shape:

- Prototype `source` string → typed `{ url, srcType }` SourceRef. Extract srcType from the `srcType` field already present; wrap `source` URL in an object.
- Add `backing` field to each hook. Use simple paths like `"roster_history[0]"`, `"h2h[0]"`, `"player_stats.milo.gpg"` — they don't need to resolve now (validation lands in Sub-plan #6), but having non-null values is required by the type.
- Add `liquipediaSlug` to team/player entries using lowercase name.

- [ ] **Step 1.5: Write MY_SHEETS mock**

File: `lib/mock/my-sheets.ts`

```ts
export interface MockMySheet {
  id: string;
  match: string;
  event: string;
  generated: string;
  status: "ready" | "outdated";
}

export const MY_SHEETS: MockMySheet[] = [ /* port */ ];
```

- [ ] **Step 1.6: Write barrel `lib/mock/index.ts`**

```ts
export * from "./teams";
export * from "./events";
export * from "./matches";
export * from "./sheet";
export * from "./my-sheets";
```

- [ ] **Step 1.7: Write shape conformance test (TDD RED)**

File: `tests/unit/sheet-mock.test.ts`

```ts
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
      expect(h.source.url).toMatch(/^https?:|\.(net|tv|com)/);
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
```

- [ ] **Step 1.8: Run test — expect RED** (`@/lib/mock/sheet` not yet conforming)

```bash
npm test
```

- [ ] **Step 1.9: Fix SHEET mock until GREEN**

Iterate until all 4 tests pass. `tsc --noEmit` must also pass — this proves the mock conforms to `SheetOutput`.

- [ ] **Step 1.10: Commit**

```bash
git add lib/mock types tests/unit/sheet-mock.test.ts
git commit -m "feat(mock): typed mock data from prototype (events, matches, sheet, teams)"
```

---

## Task 2: Port remaining primitives (FeedbackBar, LogoTile, Avatar, Trend, SectionHead, PageHeader)

**Files:**

- Create: `components/ui/feedback-bar.tsx`, `components/ui/logo-tile.tsx`, `components/ui/avatar.tsx`, `components/ui/trend.tsx`, `components/ui/section-head.tsx`, `components/ui/page-header.tsx`
- Create test: `tests/unit/feedback-bar.test.tsx`, `tests/unit/trend.test.tsx`

Reference source: `prototype/src/primitives.jsx:71-126` and `prototype/src/layout.jsx:69-79`.

- [ ] **Step 2.1: Write `trend.test.tsx` (TDD RED)**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { Trend } from "@/components/ui/trend";

describe("Trend", () => {
  it("renders an em-dash for near-zero delta", () => {
    render(<Trend delta={0} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("uses ok color and up arrow on positive delta", () => {
    const { container } = render(<Trend delta={7.1} />);
    expect(container.textContent).toContain("7.1%");
    expect(container.querySelector(".text-ok")).toBeTruthy();
  });

  it("uses bad color and down arrow on negative delta", () => {
    const { container } = render(<Trend delta={-2.4} />);
    expect(container.textContent).toContain("2.4%");
    expect(container.querySelector(".text-bad")).toBeTruthy();
  });
});
```

- [ ] **Step 2.2: Write `feedback-bar.test.tsx` (TDD RED)**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { FeedbackBar } from "@/components/ui/feedback-bar";

describe("FeedbackBar", () => {
  it("toggles thumbs up selected state on click", async () => {
    const u = userEvent.setup();
    render(<FeedbackBar />);
    const up = screen.getByLabelText("helpful");
    await u.click(up);
    expect(up).toHaveAttribute("aria-pressed", "true");
    await u.click(up);
    expect(up).toHaveAttribute("aria-pressed", "false");
  });

  it("switches from up to down when the opposite is clicked", async () => {
    const u = userEvent.setup();
    render(<FeedbackBar />);
    await u.click(screen.getByLabelText("helpful"));
    await u.click(screen.getByLabelText("not helpful"));
    expect(screen.getByLabelText("helpful")).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByLabelText("not helpful")).toHaveAttribute("aria-pressed", "true");
  });
});
```

- [ ] **Step 2.3: Run tests — expect RED** (components don't exist yet)

- [ ] **Step 2.4: Implement `components/ui/trend.tsx`**

```tsx
import { ArrowUp, ArrowDown } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

export function Trend({ delta, className }: { delta: number; className?: string }) {
  const flat = Math.abs(delta) < 0.01;
  if (flat) {
    return <span className={cn("mono text-[10.5px] text-mute2", className)}>—</span>;
  }
  const up = delta > 0;
  const color = up ? "text-ok" : "text-bad";
  const value = Math.abs(delta).toFixed(delta % 1 === 0 ? 0 : 2).replace(/\.?0+$/, "");
  return (
    <span className={cn("mono inline-flex items-center gap-0.5 text-[10.5px]", color, className)}>
      {up ? <ArrowUp size={10} strokeWidth={1.8} /> : <ArrowDown size={10} strokeWidth={1.8} />}
      {value}%
    </span>
  );
}
```

- [ ] **Step 2.5: Implement `components/ui/feedback-bar.tsx`**

```tsx
"use client";
import * as React from "react";
import { ThumbsUp, ThumbsDown } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

type Vote = "up" | "down" | null;

export function FeedbackBar({
  onChange,
  className,
}: {
  onChange?: (v: Vote) => void;
  className?: string;
}) {
  const [v, setV] = React.useState<Vote>(null);
  const toggle = (next: Exclude<Vote, null>) => {
    const val = v === next ? null : next;
    setV(val);
    onChange?.(val);
  };
  return (
    <div className={cn("flex items-center gap-0.5 opacity-0 group-hover:opacity-100 t150", className)}>
      <button
        aria-label="helpful"
        aria-pressed={v === "up"}
        onClick={() => toggle("up")}
        className={cn(
          "w-6 h-6 rounded flex items-center justify-center t150",
          v === "up" ? "text-ok bg-[#12241B]" : "text-mute hover:text-fg hover:bg-surf2",
        )}
      >
        <ThumbsUp size={12} />
      </button>
      <button
        aria-label="not helpful"
        aria-pressed={v === "down"}
        onClick={() => toggle("down")}
        className={cn(
          "w-6 h-6 rounded flex items-center justify-center t150",
          v === "down" ? "text-bad bg-[#2A1817]" : "text-mute hover:text-fg hover:bg-surf2",
        )}
      >
        <ThumbsDown size={12} />
      </button>
    </div>
  );
}
```

- [ ] **Step 2.6: Implement `components/ui/logo-tile.tsx`**

```tsx
import { cn } from "@/lib/cn";

export function LogoTile({
  letters,
  size = 48,
  className,
}: {
  letters: string;
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "shrink-0 border border-line2 flex items-center justify-center hatch-dense",
        className,
      )}
      style={{ width: size, height: size, borderRadius: 4, background: "#10141A" }}
    >
      <span
        className="mono font-semibold text-[11px] tracking-wider text-fg"
        style={{ letterSpacing: "0.08em" }}
      >
        {letters}
      </span>
    </div>
  );
}
```

- [ ] **Step 2.7: Implement `components/ui/avatar.tsx`**

```tsx
import { cn } from "@/lib/cn";

export function Avatar({
  initials,
  size = 40,
  className,
}: {
  initials: string;
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "shrink-0 border border-line2 flex items-center justify-center",
        className,
      )}
      style={{ width: size, height: size, borderRadius: 4, background: "#10141A" }}
    >
      <span className="font-semibold text-[13px] text-fg">{initials}</span>
    </div>
  );
}
```

- [ ] **Step 2.8: Implement `components/ui/section-head.tsx`**

Port from `prototype/src/primitives.jsx:61-69`. Props: `title`, `kicker?`, `right?`, `className?`.

- [ ] **Step 2.9: Implement `components/ui/page-header.tsx`**

Port from `prototype/src/layout.jsx:69-79`. Props: `title`, `sub?`, `kicker?`, `right?`.

- [ ] **Step 2.10: Run tests — expect GREEN**

```bash
npm test
```

Expected: all previous tests + new Trend (3) + FeedbackBar (2) pass.

- [ ] **Step 2.11: Typecheck + commit**

```bash
npm run typecheck
git add components/ui tests/unit
git commit -m "feat(ui): port FeedbackBar, LogoTile, Avatar, Trend, SectionHead, PageHeader"
```

---

## Task 3: Shell layout (Sidebar + `(app)` route group + stub screens)

**Files:**

- Create: `app/(app)/layout.tsx`, `components/shell/sidebar.tsx`, `components/shell/stub-screen.tsx`, `app/(app)/saved/page.tsx`, `app/(app)/settings/page.tsx`

- [ ] **Step 3.1: Write `components/shell/sidebar.tsx`**

Port from `prototype/src/layout.jsx:3-60`. It's a `"use client"` component (uses `usePathname` from `next/navigation` to set active state). Use Next.js `Link` instead of `<button>` for navigation items. Items: Events (/events), My Sheets (/sheets), Saved Players (/saved), Settings (/settings).

- [ ] **Step 3.2: Write `components/shell/stub-screen.tsx`**

Port from `prototype/src/layout.jsx:82-90`.

- [ ] **Step 3.3: Write `app/(app)/layout.tsx`**

```tsx
import { Sidebar } from "@/components/shell/sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
```

- [ ] **Step 3.4: Write `app/(app)/saved/page.tsx` and `app/(app)/settings/page.tsx`**

Each renders `<StubScreen title="..." message="..." action={...} />`.

- [ ] **Step 3.5: Verify navigation works by hand**

Start dev server, manually click each sidebar item, verify URL changes and active state highlights correctly.

- [ ] **Step 3.6: Commit**

```bash
git add app/\(app\) components/shell
git commit -m "feat(web): (app) route group with Sidebar shell + /saved /settings stubs"
```

---

## Task 4: Port `/events` (Upcoming Events dashboard)

**Files:**

- Create: `app/(app)/events/page.tsx`, `components/events/event-card.tsx`, `components/events/filter-group.tsx`
- Create test: `tests/e2e/events.spec.ts`

Reference source: `prototype/src/events.jsx`.

- [ ] **Step 4.1: Write the E2E test first (TDD RED)**

File: `tests/e2e/events.spec.ts`

```ts
import { test, expect } from "@playwright/test";

test("/events lists upcoming events from mock data", async ({ page }) => {
  await page.goto("/events");
  await expect(page.getByRole("heading", { name: "Upcoming Events" })).toBeVisible();
  // mock data has at least one S-tier EU event
  await expect(page.getByText(/Orbital Open/i)).toBeVisible();
});

test("region filter narrows results", async ({ page }) => {
  await page.goto("/events");
  const initial = await page.getByText(/upcoming matches/).count();
  await page.getByRole("button", { name: "APAC" }).click();
  const filtered = await page.getByText(/upcoming matches/).count();
  expect(filtered).toBeLessThan(initial);
});

test("click event card navigates to /events/[slug]", async ({ page }) => {
  await page.goto("/events");
  await page.getByText(/Orbital Open/i).first().click();
  await expect(page).toHaveURL(/\/events\/orbital-open/);
});
```

- [ ] **Step 4.2: Write `components/events/filter-group.tsx`**

Port from `prototype/src/events.jsx:73-92`.

- [ ] **Step 4.3: Write `components/events/event-card.tsx`**

Port from `prototype/src/events.jsx:94-123`. Use Next.js `Link` wrapping the card instead of `onOpen` callback.

- [ ] **Step 4.4: Write `app/(app)/events/page.tsx`**

`"use client"` (uses `useState` for filter state). Port from `prototype/src/events.jsx:6-71`. Replace `go()` with `<Link href={...}>`. Uses `EVENTS` from `@/lib/mock`.

- [ ] **Step 4.5: Run E2E — expect GREEN**

```bash
npm run test:e2e -- events.spec
```

- [ ] **Step 4.6: Commit**

```bash
git add app/\(app\)/events/page.tsx components/events tests/e2e/events.spec.ts
git commit -m "feat(web): port /events dashboard with region/tier filters"
```

---

## Task 5: Port `/events/[slug]` (Event detail — match table)

**Files:**

- Create: `app/(app)/events/[slug]/page.tsx`, `components/events/match-row.tsx`
- Create test: `tests/e2e/event-detail.spec.ts`

Reference source: `prototype/src/event_detail.jsx`.

- [ ] **Step 5.1: Write E2E test (TDD RED)**

```ts
import { test, expect } from "@playwright/test";

test("/events/[slug] shows event header + match table", async ({ page }) => {
  await page.goto("/events/orbital-open-spring-26");
  await expect(page.getByRole("heading", { name: /Orbital Open/ })).toBeVisible();
  await expect(page.getByText("vs").first()).toBeVisible();
});

test("Generate button animates progress and flips to Sheet ready", async ({ page }) => {
  await page.goto("/events/orbital-open-spring-26");
  const generateBtn = page.getByRole("button", { name: "Generate" }).first();
  await generateBtn.click();
  await expect(page.getByText(/Generating/)).toBeVisible();
  // progress simulation completes in ~10s
  await expect(page.getByText(/Sheet ready/).first()).toBeVisible({ timeout: 15_000 });
});

test("Sheet ready link navigates to /matches/[id]", async ({ page }) => {
  await page.goto("/events/orbital-open-spring-26");
  // m-01 is seeded as status "ready" in mock
  await page.getByText(/Sheet ready/).first().click();
  await expect(page).toHaveURL(/\/matches\/m-01/);
});
```

- [ ] **Step 5.2: Write `components/events/match-row.tsx`**

Port from `prototype/src/event_detail.jsx:109-172`. Props: `match`, `onGenerate`, `openHref`. Uses `TEAMS` from mock. Three visual states (idle/generating/ready).

- [ ] **Step 5.3: Write `app/(app)/events/[slug]/page.tsx`**

`"use client"` (local match state + setInterval progress tick). Replace prototype's `useRef` + `setInterval` logic 1:1. Navigate via `useRouter` or `<Link>` from next/navigation. Use `params.slug` from `useParams()` or page props.

- [ ] **Step 5.4: Run E2E — expect GREEN**

- [ ] **Step 5.5: Commit**

```bash
git add app/\(app\)/events/\[slug\] components/events/match-row.tsx tests/e2e/event-detail.spec.ts
git commit -m "feat(web): port /events/[slug] match table with simulated generate progress"
```

---

## Task 6: Port `/matches/[id]` (Sheet Viewer — the hero page)

**Files:**

- Create: `app/(app)/matches/[id]/page.tsx`
- Create: `components/sheet/team-head.tsx`, `components/sheet/hooks-section.tsx`, `components/sheet/h2h-section.tsx`, `components/sheet/player-profiles-section.tsx`, `components/sheet/quotes-section.tsx`, `components/sheet/talking-points-card.tsx`, `components/sheet/freshness-card.tsx`
- Create test: `tests/e2e/sheet.spec.ts`

Reference source: `prototype/src/sheet.jsx` (383 lines) — split into 7 files matching sections 1–5 + sidebar cards + team header.

This is the most important page. **Dedicate extra care.** Every source chip must be visible and clickable. Every `missing` notable must render "no data available" in italic muted.

- [ ] **Step 6.1: Write E2E test (TDD RED)**

```ts
import { test, expect } from "@playwright/test";

test("/matches/[id] renders all 5 sheet sections", async ({ page }) => {
  await page.goto("/matches/m-01");
  await expect(page.getByRole("heading", { name: /Halcyon/ }).first()).toBeVisible();
  await expect(page.getByText("Narrative Hooks")).toBeVisible();
  await expect(page.getByText("Head-to-Head")).toBeVisible();
  await expect(page.getByText("Player Profiles")).toBeVisible();
  await expect(page.getByText("Quotes")).toBeVisible();
  await expect(page.getByText("Talking Points")).toBeVisible();
});

test("every narrative hook has a clickable source chip", async ({ page }) => {
  await page.goto("/matches/m-01");
  const chips = page.locator("a").filter({ hasText: /source:/ });
  const count = await chips.count();
  expect(count).toBeGreaterThanOrEqual(3);
  // verify first chip opens in a new tab
  await expect(chips.first()).toHaveAttribute("target", "_blank");
});

test("missing notable items show 'no data available' italic muted", async ({ page }) => {
  await page.goto("/matches/m-01");
  // player Rook has a missing notable in the mock
  await page.getByRole("button", { name: /Rook/ }).click();
  await expect(page.getByText("no data available").first()).toBeVisible();
});

test("data freshness card shows three source timestamps", async ({ page }) => {
  await page.goto("/matches/m-01");
  await expect(page.getByText(/Data freshness/)).toBeVisible();
  await expect(page.getByText(/Liquipedia/)).toBeVisible();
  await expect(page.getByText(/BLAST/)).toBeVisible();
  await expect(page.getByText(/YouTube/)).toBeVisible();
});
```

- [ ] **Step 6.2: Port TeamHead**

File: `components/sheet/team-head.tsx` — from `prototype/src/sheet.jsx:84-98`.

- [ ] **Step 6.3: Port HooksSection**

File: `components/sheet/hooks-section.tsx` — from `prototype/src/sheet.jsx:102-131`.

- [ ] **Step 6.4: Port H2HSection**

File: `components/sheet/h2h-section.tsx` — from `prototype/src/sheet.jsx:135-177`.

- [ ] **Step 6.5: Port PlayerProfilesSection**

File: `components/sheet/player-profiles-section.tsx` — from `prototype/src/sheet.jsx:181-289`. `"use client"` (accordion open state).

- [ ] **Step 6.6: Port QuotesSection**

File: `components/sheet/quotes-section.tsx` — from `prototype/src/sheet.jsx:292-322`.

- [ ] **Step 6.7: Port TalkingPointsCard**

File: `components/sheet/talking-points-card.tsx` — from `prototype/src/sheet.jsx:326-359`.

- [ ] **Step 6.8: Port FreshnessCard**

File: `components/sheet/freshness-card.tsx` — from `prototype/src/sheet.jsx:361-380`.

- [ ] **Step 6.9: Assemble `app/(app)/matches/[id]/page.tsx`**

`"use client"` (regenerate button toggles state). Reads `SHEET` from mock. Sticky header with Regenerate / Export MD / Export PDF / Share buttons (inert for now — wire-up in Sub-plan #7).

- [ ] **Step 6.10: Run E2E — expect GREEN**

- [ ] **Step 6.11: Manual visual check**

Open `/matches/m-01` and side-by-side compare to `prototype/4casters.html` (opened in a second browser tab). Fix any visual regressions.

- [ ] **Step 6.12: Commit**

```bash
git add app/\(app\)/matches components/sheet tests/e2e/sheet.spec.ts
git commit -m "feat(web): port /matches/[id] sheet viewer (hooks, h2h, players, quotes, talking points)"
```

---

## Task 7: Port `/sheets` (My Sheets — sortable table)

**Files:**

- Create: `app/(app)/sheets/page.tsx`
- Create test: `tests/e2e/my-sheets.spec.ts`

Reference source: `prototype/src/my_sheets.jsx`.

- [ ] **Step 7.1: Write E2E test (TDD RED)**

```ts
import { test, expect } from "@playwright/test";

test("/sheets lists generated sheets with sortable columns", async ({ page }) => {
  await page.goto("/sheets");
  await expect(page.getByRole("heading", { name: "My Sheets" })).toBeVisible();
  const rows = page.getByRole("button").filter({ hasText: /vs/ });
  expect(await rows.count()).toBeGreaterThan(3);
});

test("clicking a row opens the sheet", async ({ page }) => {
  await page.goto("/sheets");
  await page.getByRole("button").filter({ hasText: "Halcyon vs Verdant" }).first().click();
  await expect(page).toHaveURL(/\/matches\/m-01/);
});

test("sort by 'generated' toggles direction", async ({ page }) => {
  await page.goto("/sheets");
  const header = page.getByRole("button", { name: /Generated/ });
  await header.click();  // default was desc; now asc
  // first row should be oldest now
  await expect(page.getByText("sorted by generated asc")).toBeVisible();
});
```

- [ ] **Step 7.2: Port page**

`"use client"`. Sort state via `useState`, sorted array via `useMemo`. Navigate via `<Link>`.

- [ ] **Step 7.3: Run E2E — expect GREEN, commit**

```bash
git add app/\(app\)/sheets tests/e2e/my-sheets.spec.ts
git commit -m "feat(web): port /sheets sortable table of generated sheets"
```

---

## Task 8: Clean up + smoke suite

**Files:** various.

- [ ] **Step 8.1: Remove temporary smoke swatch from root page** (already replaced by redirect in Sub-plan #1, verify still correct).

- [ ] **Step 8.2: Confirm all previous E2Es still pass**

```bash
npm run test:e2e
```

Expected: original 3 (`/login` smokes) + 3 (events) + 3 (event detail) + 4 (sheet) + 3 (my sheets) = 16 E2E tests green.

- [ ] **Step 8.3: Confirm unit suite still passes**

```bash
npm test
```

Expected: primitives (10) + sheet-mock (4) + trend (3) + feedback-bar (2) = 19 unit tests green.

- [ ] **Step 8.4: Confirm build + lint + typecheck**

```bash
npm run typecheck && npm run lint && NEXT_PUBLIC_SUPABASE_URL=https://dummy.supabase.co NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_dummy npm run build
```

- [ ] **Step 8.5: Milestone tag + push**

```bash
git tag -a v0.2.0-frontend -m "Sub-plan #2: all 5 pages ported to Next.js with mock data, 16 E2E green"
git push origin main --tags
```

Verify CI green on GitHub Actions for the main branch.

---

## Definition of Done for Sub-plan #2

- [ ] All 5 pages navigable: `/login`, `/events`, `/events/[slug]`, `/matches/[id]`, `/sheets`
- [ ] Sidebar shell visible on every `(app)` page; active state highlights correct item on route change
- [ ] `/saved` and `/settings` render StubScreen
- [ ] Filter chips on `/events` narrow the grid correctly
- [ ] Event detail Generate button simulates progress and flips to Sheet ready
- [ ] Sheet viewer renders all 5 sections + sidebar cards, pixel-faithful to prototype
- [ ] Every data point on the sheet carries a visible, clickable source chip
- [ ] Missing notable items show "no data available" italic muted
- [ ] My Sheets table sortable by match/event/generated/status
- [ ] `npm test`: 19/19 unit green
- [ ] `npm run test:e2e`: 16/16 E2E green
- [ ] `npm run typecheck`: clean
- [ ] `npm run lint`: clean
- [ ] `npm run build`: clean
- [ ] Git tag `v0.2.0-frontend` pushed to `origin/main`
- [ ] GitHub Actions `verify` workflow green on `main`

---

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Sheet viewer port (383-line prototype) produces bugs because split across 7 files | Split in Task 6 is sequential, each section visually verified before moving to next. E2E in Step 6.1 catches section-presence regressions. |
| Tailwind v4 arbitrary values (`h-[20px]`, `bg-[#12241B]`) not pre-generated when used only inside TS variant maps | Test coverage catches missing classes; keep the variant map string literals verbatim from prototype to match the `content` globs. |
| Route group `(app)` confuses beginners | Document in the task comment header and in README. |
| E2E progress-simulation test flakes (setInterval timing) | Use Playwright `{ timeout: 15_000 }` on the "Sheet ready" assertion; ensure the mock's tick interval is deterministic. |
| Next.js 16 redirects or param types differ from training data | When in doubt, read `node_modules/next/dist/docs/01-app/03-api-reference/**`. Follow `AGENTS.md` guidance. |

---

## What's next (Sub-plan #3 preview)

After this sub-plan closes: **Liquipedia data pipeline** — Python FastAPI scraper service in `services/scraper/`, ingesting events/teams/players/roster_history/matches/h2h into Postgres via Drizzle-migrated tables. Replaces the `lib/mock/` entries one entity at a time via a server-side loader module that the pages switch to consuming.
