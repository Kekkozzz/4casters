# 4casters Sub-plan #1 — Scaffolding & Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a Next.js single-package app at repo root, with design tokens from the prototype applied via Tailwind v4, Supabase client wiring, a local Drizzle setup, and a smoke-tested `/login` page, so every subsequent sub-plan has a working substrate to build into.

**Architecture:** Single-package Next.js 16 App Router at repo root (no pnpm workspace). Shared types and DB schema live as internal folders (`types/`, `db/`) not as pnpm packages — they can be promoted to workspace packages later if a second TS consumer materializes. Python scraper stays in `services/scraper/` (different language ecosystem, always separate). Prototype kept in `prototype/` as canonical design reference.

**Tech Stack:** npm, Node 24 (engines >=20), Next.js 16.2.4, React 19.2.4, TypeScript strict, Tailwind CSS v4, lucide-react, Drizzle ORM, Postgres (Supabase), Vitest + Testing Library, Playwright.

**Repo:** https://github.com/Kekkozzz/4casters

**Reference design spec:** `C:\Users\Windows\.claude\plans\ciao-in-questi-giorni-snazzy-pine.md` (Sezione 7, 14, 17, Appendix B).

---

## REVISION 2026-04-22 (post-Task-3)

Tasks 1–3 superseded by manual scaffolding. Current git state:

| Commit | Summary |
|---|---|
| `682bfbc` | chore: initial monorepo layout, move prototype and research under their homes |
| `92fe666` | chore(repo): pnpm workspace, shared TS base config *(reverted by next commit)* |
| `75ca96f` | chore: scaffold Next.js 16 + Tailwind v4 at repo root (single-package) |

**Deviations from the original plan:**

1. **Single-package instead of monorepo.** `apps/web/` merged into root. `packages/db/` → `db/` folder. `packages/shared-types/` → `types/` folder. No `pnpm-workspace.yaml`.
2. **npm instead of pnpm.** `package-lock.json` is the lockfile. All commands use `npm` / `npx`.
3. **Next.js 16.2.4** (not 15). Breaking changes from training data — see `AGENTS.md` / `node_modules/next/dist/docs/` before writing Next.js code.
4. **Tailwind v4** (not v3). No `tailwind.config.ts` — design tokens live in `app/globals.css` via `@theme` directive. `@import "tailwindcss";` replaces `@tailwind base/components/utilities`.
5. **React 19** (not 18).
6. **Agent rules files present:** `AGENTS.md` and `CLAUDE.md` at root flag that Next.js 16 may differ from training data.

**What's done:** git init, prototype moved, research moved, Next.js scaffolded with default starter, Tailwind v4 wired, ESLint 9 flat config, npm lockfile committed.

**What's next:** Task 4 onward, revised for the new stack. Tasks 4–12 below are updated where paths/commands need adapting; task intent is unchanged.

---

---

## Roadmap across sub-plans

| # | Sub-plan | Deliverable | Prereq |
|---|---|---|---|
| **1** | **Scaffolding & Foundation** (this doc) | Monorepo + Next.js + design tokens + smoke-tested `/login` | — |
| 2 | Frontend port (mock data) | All 5 pages ported to Next.js with primitives, mock inline | 1 |
| 3 | Liquipedia pipeline | Scraper + DB entities + backfill script | 1 |
| 4 | BLAST stats pipeline | Stats ingestion for players/teams | 1, 3 |
| 5 | Quote corpus pipeline | YouTube + Twitter + Liquipedia Quotes with pgvector | 1, 3 |
| 6 | Synthesis layer | Packet builder + Gemini adapter + 3 validators + API | 3, 4, 5 |
| 7 | Wire-up | Auth + real generate flow + export + eval loop | 2, 6 |
| 8 | Deploy & beta launch | Vercel + Railway + monitoring + beta invites | 7 |

---

## File structure after Sub-plan #1

```text
4casters/
├── .github/workflows/ci.yml                   (lint + typecheck + test)
├── .gitignore
├── .nvmrc
├── README.md
├── package.json                               (root, private, workspace)
├── pnpm-workspace.yaml
├── tsconfig.base.json                         (shared TS config)
├── apps/
│   └── web/
│       ├── .env.local.example
│       ├── app/
│       │   ├── layout.tsx
│       │   ├── globals.css
│       │   └── login/page.tsx                 (smoke port of login.jsx)
│       ├── components/
│       │   └── ui/
│       │       ├── primitives.tsx             (Btn, Pill, Card, SourceChip)
│       │       └── icons.ts                   (lucide-react re-exports)
│       ├── lib/
│       │   ├── cn.ts                          (tailwind-merge wrapper)
│       │   └── supabase/
│       │       ├── client.ts                  (browser client)
│       │       └── server.ts                  (server client, stub)
│       ├── tests/
│       │   ├── unit/primitives.test.tsx
│       │   └── e2e/login.spec.ts
│       ├── next.config.mjs
│       ├── package.json
│       ├── playwright.config.ts
│       ├── postcss.config.mjs
│       ├── tailwind.config.ts                 (design tokens from Appendix B)
│       ├── tsconfig.json
│       └── vitest.config.ts
├── packages/
│   ├── db/
│   │   ├── drizzle.config.ts
│   │   ├── package.json
│   │   ├── schema.ts                          (placeholder: app_health table)
│   │   ├── migrations/                        (generated)
│   │   └── tsconfig.json
│   └── shared-types/
│       ├── index.ts                           (SheetOutput stub, NarrativeHook, QuoteWithSource)
│       ├── package.json
│       └── tsconfig.json
├── prototype/                                 (moved from repo root)
│   ├── 4casters.html
│   └── src/*.jsx
├── docs/
│   ├── research/
│   │   ├── esports-market-research-2026.md
│   │   └── twitter-customer-discovery-report-2026-04-22.md
│   └── superpowers/
│       ├── plans/2026-04-22-subplan-1-scaffolding.md   (this file)
│       └── specs/                              (future specs)
└── services/
    └── scraper/
        └── .gitkeep                            (placeholder for Sub-plan #3)
```

---

## Design principles for this sub-plan

- **Prototype is canonical** — if a style or component API is ambiguous, the prototype wins. Port 1:1 then refactor only what TypeScript forces.
- **TDD where honest** — scaffolding has a lot of config that isn't testable. Write tests for the things that have behavior (primitives component rendering, smoke E2E on login page). Skip tests for config files.
- **Frequent commits** — every task ends with a commit. Target 15-20 commits in this sub-plan.
- **No production secrets in git** — `.env.local` stays gitignored. `.env.local.example` with placeholders is committed.
- **No dead code** — if a task installs a dep, the next task uses it. Don't pre-install for future sub-plans.

---

## Task 0: Verify prerequisites

**Files:** none.

- [ ] **Step 0.1: Verify Node and pnpm versions**

Run:
```bash
node --version    # expect v20.x or v22.x
pnpm --version    # expect v9.x or v10.x
git --version     # expect 2.40+
```

If pnpm is missing: `npm install -g pnpm@latest`.

- [ ] **Step 0.2: Verify current working directory contents**

Run:
```bash
ls -la c:/Users/Windows/Desktop/Francesco_Urban_Labs/4casters
```

Expect: `4casters.html`, `src/`, `esports-market-research-2026.md`, `twitter-customer-discovery-report-2026-04-22.md`, `docs/` (newly created).

---

## Task 1: Initialize git + move existing files into new layout

**Files:**
- Create: `.gitignore`, `.nvmrc`, `README.md`
- Move: `4casters.html` → `prototype/4casters.html`
- Move: `src/` → `prototype/src/`
- Move: `esports-market-research-2026.md` → `docs/research/esports-market-research-2026.md`
- Move: `twitter-customer-discovery-report-2026-04-22.md` → `docs/research/twitter-customer-discovery-report-2026-04-22.md`

- [ ] **Step 1.1: `git init` and set default branch**

```bash
cd c:/Users/Windows/Desktop/Francesco_Urban_Labs/4casters
git init -b main
```

- [ ] **Step 1.2: Write `.nvmrc`**

Content (single line):
```text
20
```

- [ ] **Step 1.3: Write `.gitignore`**

Content:
```gitignore
# Node
node_modules/
.pnpm-store/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# Next.js
.next/
out/
next-env.d.ts

# Build output
dist/
build/
*.tsbuildinfo

# Env
.env
.env.local
.env.*.local

# Test
coverage/
playwright-report/
test-results/
playwright/.cache/

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp

# Drizzle
/packages/db/drizzle/
```

- [ ] **Step 1.4: Create directory structure and move files**

```bash
mkdir -p prototype docs/research services/scraper
git mv 4casters.html prototype/4casters.html
git mv src prototype/src
git mv esports-market-research-2026.md docs/research/esports-market-research-2026.md
git mv twitter-customer-discovery-report-2026-04-22.md docs/research/twitter-customer-discovery-report-2026-04-22.md
touch services/scraper/.gitkeep
```

NOTE: `git mv` fails before first commit because there's no baseline. Use plain `mv` instead and let `git add` pick it up:

```bash
mkdir -p prototype docs/research services/scraper
mv 4casters.html prototype/4casters.html
mv src prototype/src
mv esports-market-research-2026.md docs/research/esports-market-research-2026.md
mv twitter-customer-discovery-report-2026-04-22.md docs/research/twitter-customer-discovery-report-2026-04-22.md
touch services/scraper/.gitkeep
```

- [ ] **Step 1.5: Update prototype HTML script paths**

The prototype HTML references `src/*.jsx` which now sits at `prototype/src/*.jsx`. Since the HTML itself also moved into `prototype/`, the relative paths still work unchanged. Verify by opening `prototype/4casters.html` in a browser and checking the app renders.

- [ ] **Step 1.6: Write a minimal `README.md`**

Content:
```markdown
# 4casters

AI caster prep tool for Rocket League — match sheets with verifiable sources.

## Status
Early scaffolding. See `docs/superpowers/plans/` for the implementation roadmap.

## Quickstart

```bash
pnpm install
pnpm --filter web dev
```

Open http://localhost:3000/login.

## Monorepo layout

- `apps/web` — Next.js 15 app (UI + synthesis API routes)
- `packages/db` — Drizzle schema + migrations
- `packages/shared-types` — TS types shared across packages
- `services/scraper` — Python FastAPI scraper (Sub-plan #3+)
- `prototype/` — Claude design prototype (canonical visual reference)
- `docs/research/` — market + customer discovery
- `docs/superpowers/plans/` — executable implementation plans
```

- [ ] **Step 1.7: First commit**

```bash
git add -A
git commit -m "chore: initial monorepo layout, move prototype and research under their homes"
```

- [ ] **Step 1.8: Add GitHub remote**

```bash
git remote add origin https://github.com/Kekkozzz/4casters.git
git push -u origin main
```

If the remote repo has an initial commit (README, license), fetch first and decide:
```bash
git fetch origin
git pull --rebase origin main   # if non-empty and history is a single initial commit
git push -u origin main
```

---

## Task 2: Initialize pnpm workspace + root tooling

**Files:**
- Create: `package.json` (root), `pnpm-workspace.yaml`, `tsconfig.base.json`

- [ ] **Step 2.1: Write `pnpm-workspace.yaml`**

Content:
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

- [ ] **Step 2.2: Write root `package.json`**

Content:
```json
{
  "name": "4casters",
  "version": "0.1.0",
  "private": true,
  "packageManager": "pnpm@10.0.0",
  "engines": {
    "node": ">=20.0.0"
  },
  "scripts": {
    "dev": "pnpm --filter web dev",
    "build": "pnpm -r build",
    "lint": "pnpm -r lint",
    "typecheck": "pnpm -r typecheck",
    "test": "pnpm -r test",
    "test:e2e": "pnpm --filter web test:e2e"
  },
  "devDependencies": {
    "typescript": "^5.6.3"
  }
}
```

- [ ] **Step 2.3: Write `tsconfig.base.json`**

Content:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "jsx": "preserve",
    "incremental": true,
    "verbatimModuleSyntax": false
  }
}
```

- [ ] **Step 2.4: Install root devDependency**

```bash
pnpm install
```

Expected: lockfile created, `node_modules/` populated with `typescript`.

- [ ] **Step 2.5: Commit**

```bash
git add package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json
git commit -m "chore(repo): pnpm workspace, shared TS base config"
```

---

## Task 3: Initialize Next.js app with TS + Tailwind

**Files:**
- Create: `apps/web/package.json`, `apps/web/tsconfig.json`, `apps/web/next.config.mjs`, `apps/web/postcss.config.mjs`, `apps/web/tailwind.config.ts`, `apps/web/app/layout.tsx`, `apps/web/app/page.tsx`, `apps/web/app/globals.css`, `apps/web/.env.local.example`, `apps/web/.eslintrc.json`

- [ ] **Step 3.1: Scaffold with create-next-app**

```bash
cd apps
pnpm dlx create-next-app@15 web --ts --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-pnpm --turbopack
cd ../..
```

Answer `No` to any remaining prompts. The tool writes `apps/web/package.json`, `tsconfig.json`, `next.config.mjs`, `postcss.config.mjs`, `tailwind.config.ts`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `.eslintrc.json`, `.gitignore`.

- [ ] **Step 3.2: Verify dev server starts**

```bash
pnpm --filter web dev
```

Open http://localhost:3000. Expect the create-next-app placeholder page. Kill with `Ctrl+C`.

- [ ] **Step 3.3: Extend `apps/web/tsconfig.json` to inherit base**

Edit `apps/web/tsconfig.json` — set `extends: "../../tsconfig.base.json"` and remove options already in the base. Final file:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"]
    },
    "allowJs": true,
    "noEmit": true
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3.4: Commit scaffold**

```bash
git add apps/web
git commit -m "feat(web): scaffold Next.js 15 app with TS + Tailwind + ESLint"
```

---

## Task 4: Apply design tokens from Appendix B

**Files:**
- Modify: `apps/web/tailwind.config.ts`
- Modify: `apps/web/app/globals.css`
- Modify: `apps/web/app/layout.tsx`

Reference source: `prototype/4casters.html:11-99` for the full token list + auxiliary CSS.

- [ ] **Step 4.1: Replace `apps/web/tailwind.config.ts` with prototype tokens**

Content:
```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg:      "#0B0D10",
        surf1:   "#14181D",
        surf2:   "#1B2028",
        surf3:   "#232932",
        line:    "#242A33",
        line2:   "#2E3542",
        fg:      "#E8EBEE",
        mute:    "#8C929A",
        mute2:   "#5E6470",
        accent:  "#4F8DFF",
        accentD: "#3D75DB",
        ok:      "#2EB872",
        warn:    "#D9A441",
        bad:     "#E0524A",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui"],
        mono: ["var(--font-jetbrains)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        btn: "6px",
        card: "10px",
      },
      letterSpacing: {
        tightish: "-0.01em",
        tighter2: "-0.02em",
      },
      keyframes: {
        fadein: {
          from: { opacity: "0", transform: "translateY(2px)" },
          to:   { opacity: "1", transform: "none" },
        },
        barmove: {
          "0%":   { transform: "translateX(-40%)" },
          "100%": { transform: "translateX(140%)" },
        },
      },
      animation: {
        fadein: "fadein 180ms ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 4.2: Replace `apps/web/app/globals.css` with prototype base styles**

Content:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html, body {
    background: #0B0D10;
    color: #E8EBEE;
  }
  body {
    font-feature-settings: "ss01", "cv11";
  }
  ::-webkit-scrollbar { width: 10px; height: 10px; }
  ::-webkit-scrollbar-thumb { background: #232932; border-radius: 6px; }
  ::-webkit-scrollbar-thumb:hover { background: #2E3542; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::selection { background: rgba(79, 141, 255, 0.28); color: #fff; }
  :focus-visible {
    outline: 2px solid #4F8DFF;
    outline-offset: 2px;
    border-radius: 4px;
  }
}

@layer utilities {
  .mono {
    font-family: var(--font-jetbrains), ui-monospace, monospace;
  }
  .t150 {
    transition:
      background-color 150ms ease-out,
      border-color 150ms ease-out,
      color 150ms ease-out,
      transform 150ms ease-out,
      opacity 150ms ease-out;
  }
  .hatch {
    background-image: repeating-linear-gradient(135deg, rgba(255,255,255,0.06) 0 1px, transparent 1px 6px);
  }
  .hatch-dense {
    background-image: repeating-linear-gradient(135deg, rgba(255,255,255,0.10) 0 1px, transparent 1px 4px);
  }
  .qmark {
    font-family: Georgia, serif;
    line-height: 0.8;
  }
  .fadein {
    animation: fadein 180ms ease-out both;
  }
  .row-hover:hover {
    background: #121519;
  }
  .src:hover { color: #9AB4E8; }
  .src:hover u { text-decoration-color: #9AB4E8; }
}
```

- [ ] **Step 4.3: Wire Inter + JetBrains Mono via `next/font` in `app/layout.tsx`**

Content:
```tsx
import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "4casters",
  description: "Match sheets for Rocket League casters. Every quote sourced.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen bg-bg text-fg font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 4.4: Smoke-test tokens render**

Replace `apps/web/app/page.tsx` temporarily:
```tsx
export default function Home() {
  return (
    <main className="p-10 space-y-4">
      <h1 className="text-2xl font-semibold tracking-tighter2">Design tokens smoke</h1>
      <div className="flex gap-2">
        <div className="w-10 h-10 bg-bg border border-line" />
        <div className="w-10 h-10 bg-surf1 border border-line" />
        <div className="w-10 h-10 bg-surf2 border border-line" />
        <div className="w-10 h-10 bg-accent" />
        <div className="w-10 h-10 bg-ok" />
        <div className="w-10 h-10 bg-warn" />
        <div className="w-10 h-10 bg-bad" />
      </div>
      <p className="mono text-mute">mono text · muted</p>
      <button className="h-8 px-3 bg-accent hover:bg-accentD rounded-btn text-[13px] font-medium t150">
        Primary button
      </button>
    </main>
  );
}
```

Run `pnpm --filter web dev`, open http://localhost:3000, verify: dark background, the 7 color swatches, mono font on the "mono text" line, primary button hover transitions smoothly.

- [ ] **Step 4.5: Commit design tokens**

```bash
git add apps/web/tailwind.config.ts apps/web/app/globals.css apps/web/app/layout.tsx apps/web/app/page.tsx
git commit -m "feat(web): design tokens, Inter + JetBrains Mono, base CSS utilities"
```

---

## Task 5: Port primitives (Btn, Pill, Card, SourceChip) to TypeScript

**Files:**
- Create: `apps/web/lib/cn.ts`
- Create: `apps/web/components/ui/icons.ts`
- Create: `apps/web/components/ui/primitives.tsx`
- Create: `apps/web/tests/unit/primitives.test.tsx`

Reference source: `prototype/src/primitives.jsx`. Preserve API (prop names, variant/tone/size names) identical.

- [ ] **Step 5.1: Install helper deps**

```bash
pnpm --filter web add clsx tailwind-merge lucide-react
pnpm --filter web add -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @types/react @types/react-dom
```

- [ ] **Step 5.2: Write `apps/web/lib/cn.ts`**

Content:
```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 5.3: Write `apps/web/components/ui/icons.ts`**

Central re-export layer so pages import from `@/components/ui/icons` instead of deep lucide paths. This keeps the prototype's `I.Calendar` ergonomics.

Content:
```ts
export {
  Calendar,
  List,
  Bookmark,
  Settings,
  Search,
  Plus,
  Mail,
  Check,
  ChevronRight as ChevRight,
  ChevronDown as ChevDown,
  ChevronUp as ChevUp,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  ExternalLink as External,
  Download,
  Share2 as Share,
  RefreshCw as Refresh,
  Flag,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle as AlertTri,
  Globe,
  Youtube,
  Twitter,
  ArrowUpDown as Sort,
} from "lucide-react";
```

- [ ] **Step 5.4: Write the primitives test FIRST (RED)**

File: `apps/web/tests/unit/primitives.test.tsx`

Content:
```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { Btn, Pill, Card, SourceChip } from "@/components/ui/primitives";

describe("Btn", () => {
  it("renders children", () => {
    render(<Btn>Generate</Btn>);
    expect(screen.getByRole("button", { name: "Generate" })).toBeInTheDocument();
  });

  it("applies primary variant classes", () => {
    render(<Btn variant="primary">Go</Btn>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("bg-accent");
  });

  it("applies size classes", () => {
    render(<Btn size="lg">Big</Btn>);
    expect(screen.getByRole("button").className).toContain("h-10");
  });
});

describe("Pill", () => {
  it("renders children with neutral tone by default", () => {
    render(<Pill>QF</Pill>);
    const pill = screen.getByText("QF");
    expect(pill.className).toContain("text-");
  });
});

describe("Card", () => {
  it("renders children inside a div with card radius", () => {
    render(<Card>hello</Card>);
    expect(screen.getByText("hello").className).toContain("rounded-card");
  });
});

describe("SourceChip", () => {
  it("renders source URL as an anchor that opens new tab", () => {
    render(<SourceChip url="https://liquipedia.net/rocketleague/Halcyon">hi</SourceChip>);
    const a = screen.getByRole("link");
    expect(a).toHaveAttribute("target", "_blank");
    expect(a).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });
});
```

- [ ] **Step 5.5: Add Vitest config**

File: `apps/web/vitest.config.ts`

Content:
```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: false,
    setupFiles: [],
    include: ["tests/unit/**/*.{test,spec}.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
```

- [ ] **Step 5.6: Install Vite React plugin**

```bash
pnpm --filter web add -D @vitejs/plugin-react
```

- [ ] **Step 5.7: Add test script to `apps/web/package.json`**

In `apps/web/package.json`, extend `scripts`:
```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test"
  }
}
```

- [ ] **Step 5.8: Run test — expect RED**

```bash
pnpm --filter web test
```
Expected: tests fail with "Cannot find module '@/components/ui/primitives'".

- [ ] **Step 5.9: Implement primitives (GREEN)**

File: `apps/web/components/ui/primitives.tsx`

Content:
```tsx
import * as React from "react";
import { cn } from "@/lib/cn";

type BtnVariant = "primary" | "secondary" | "ghost" | "outline" | "danger" | "link";
type BtnSize = "sm" | "md" | "lg";

const btnSizes: Record<BtnSize, string> = {
  sm: "h-7 px-2.5 text-[12px]",
  md: "h-8 px-3 text-[13px]",
  lg: "h-10 px-4 text-[14px]",
};

const btnVariants: Record<BtnVariant, string> = {
  primary:   "bg-accent hover:bg-accentD text-white border border-[#5A97FF]",
  secondary: "bg-surf2 hover:bg-[#222834] text-fg border border-line2",
  ghost:     "bg-transparent hover:bg-surf1 text-fg border border-transparent",
  outline:   "bg-transparent hover:bg-surf1 text-fg border border-line2",
  danger:    "bg-transparent hover:bg-[#2a1b1a] text-bad border border-[#3a2422]",
  link:      "text-accent hover:text-[#7AAEFF] bg-transparent border-0 px-0",
};

export interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant;
  size?: BtnSize;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
}

export const Btn = React.forwardRef<HTMLButtonElement, BtnProps>(
  ({ variant = "secondary", size = "md", icon, iconRight, className, children, ...rest }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center gap-2 t150 font-medium rounded-btn select-none",
        btnSizes[size],
        btnVariants[variant],
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
      {iconRight}
    </button>
  ),
);
Btn.displayName = "Btn";

type PillTone = "neutral" | "accent" | "ok" | "warn" | "bad" | "tier";

const pillTones: Record<PillTone, string> = {
  neutral: "bg-[#141821] text-[#B9BEC7] border-line2",
  accent:  "bg-[#131C2E] text-[#9AB4E8] border-[#2A3B5E]",
  ok:      "bg-[#12241B] text-ok border-[#1E3A2A]",
  warn:    "bg-[#2A2314] text-warn border-[#3E331E]",
  bad:     "bg-[#2A1817] text-bad border-[#3E2322]",
  tier:    "bg-transparent text-fg border-line2",
};

export interface PillProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: PillTone;
}

export function Pill({ tone = "neutral", className, children, ...rest }: PillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 h-[20px] rounded-[4px] text-[11px] font-medium border",
        pillTones[tone],
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
}

export function Card({ hoverable, className, children, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        "bg-surf1 border border-line rounded-card",
        hoverable && "t150 hover:border-line2 hover:bg-[#161A21]",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export interface SourceChipProps {
  url: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export function SourceChip({ url, icon, children, className }: SourceChipProps) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title={url}
      className={cn(
        "src mono inline-flex items-center gap-1 text-[11px] text-[#8C929A] hover:text-[#9AB4E8] t150",
        className,
      )}
    >
      {icon}
      <span className="text-[10.5px]">source:</span>
      <u style={{ textDecorationColor: "#3E4756", textUnderlineOffset: "2px" }}>
        {children ?? url}
      </u>
    </a>
  );
}
```

- [ ] **Step 5.10: Run test — expect GREEN**

```bash
pnpm --filter web test
```
Expected: 5 passing tests.

- [ ] **Step 5.11: Commit**

```bash
git add apps/web/lib apps/web/components apps/web/tests apps/web/vitest.config.ts apps/web/package.json apps/web/pnpm-lock.yaml pnpm-lock.yaml
git commit -m "feat(web): Btn, Pill, Card, SourceChip primitives with TS + Vitest"
```

---

## Task 6: Port `/login` page (smoke port — no auth yet)

**Files:**
- Delete: `apps/web/app/page.tsx` (smoke swatch no longer needed; root will redirect in Sub-plan #7)
- Create: `apps/web/app/login/page.tsx`
- Create: `apps/web/app/login/sheet-teaser.tsx`

Reference source: `prototype/src/login.jsx`.

- [ ] **Step 6.1: Write `apps/web/app/login/page.tsx`**

This is a smoke port — magic link stays fake (no Supabase wiring yet). Goal: pixel-identical to prototype, primitives imported from `@/components/ui/primitives`, icons from `@/components/ui/icons`.

Content:
```tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { Btn } from "@/components/ui/primitives";
import { Mail, Check, ChevRight } from "@/components/ui/icons";
import { SheetTeaser } from "./sheet-teaser";

export default function LoginPage() {
  const [email, setEmail] = React.useState("");
  const [sent, setSent] = React.useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="h-14 border-b border-line flex items-center px-6 justify-between">
        <div className="flex items-baseline gap-[1px]">
          <span className="mono font-semibold text-[15px] tracking-tighter2 text-fg">4</span>
          <span className="font-semibold text-[15px] tracking-tighter2 text-fg">casters</span>
          <span className="ml-2 w-1 h-1 rounded-full bg-accent translate-y-[-2px]" />
        </div>
        <nav className="flex items-center gap-4 text-[12px] text-mute">
          <a className="hover:text-fg t150" href="#">Changelog</a>
          <a className="hover:text-fg t150" href="#">Docs</a>
          <span className="mono text-[11px] text-mute2">v0.1.0</span>
        </nav>
      </header>

      <section className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <div className="mono text-[10.5px] uppercase tracking-[0.18em] text-mute2 mb-3">
            Caster prep · Rocket League
          </div>
          <h1 className="text-[32px] leading-[1.1] font-semibold tracking-tighter2 mb-2">
            Prep like Derek.<br />Without being Derek.
          </h1>
          <p className="text-[13.5px] leading-[1.55] text-mute mb-8">
            Match sheets for Rocket League casters. Data from Liquipedia and BLAST.
            Every quote sourced.
          </p>

          {!sent ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (email) setSent(true);
              }}
              className="space-y-3"
            >
              <label className="block">
                <span className="block mono text-[10.5px] uppercase tracking-[0.14em] text-mute2 mb-1.5">
                  Work email
                </span>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-mute2" />
                  <input
                    autoFocus
                    type="email"
                    placeholder="you@studio.gg"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-10 pl-9 pr-3 bg-surf1 border border-line2 rounded-btn text-[13.5px] placeholder:text-mute2 focus:border-accent focus:outline-none t150"
                  />
                </div>
              </label>

              <Btn type="submit" variant="primary" size="lg" className="w-full justify-center">
                Send magic link
              </Btn>

              <div className="flex items-center gap-3 py-1">
                <div className="flex-1 h-px bg-line" />
                <span className="mono text-[10px] text-mute2 uppercase tracking-[0.14em]">or</span>
                <div className="flex-1 h-px bg-line" />
              </div>

              <Btn variant="outline" size="lg" className="w-full justify-center" type="button">
                Continue with Google
              </Btn>
            </form>
          ) : (
            <div className="border border-line rounded-card bg-surf1 p-5">
              <div className="flex items-center gap-2 text-ok text-[13px] font-medium mb-1">
                <Check size={14} /> Magic link sent
              </div>
              <div className="text-[12.5px] text-mute mb-4 leading-[1.55]">
                Check <span className="mono text-fg">{email}</span>. Link expires in 15 minutes.
              </div>
              <Btn variant="outline" size="sm">
                Simulate click — open app
                <ChevRight size={13} />
              </Btn>
            </div>
          )}

          <div className="mt-10">
            <div className="mono text-[10px] uppercase tracking-[0.14em] text-mute2 mb-2">
              A sheet looks like this
            </div>
            <SheetTeaser />
          </div>
        </div>
      </section>

      <footer className="px-6 py-4 border-t border-line flex items-center justify-between text-[11px] text-mute2">
        <div className="flex items-center gap-4">
          <span className="mono">© 2026 4casters</span>
          <Link href="#" className="hover:text-fg t150">Privacy</Link>
          <Link href="#" className="hover:text-fg t150">Terms</Link>
        </div>
        <span className="mono">built for casters, not marketers</span>
      </footer>
    </div>
  );
}
```

- [ ] **Step 6.2: Write `apps/web/app/login/sheet-teaser.tsx`**

Content:
```tsx
import { Pill } from "@/components/ui/primitives";

export function SheetTeaser() {
  return (
    <div className="border border-line rounded-card bg-surf1 overflow-hidden">
      <div className="px-3 py-2 flex items-center justify-between border-b border-line">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-[2px] hatch-dense border border-line2" />
          <span className="text-[11.5px] font-semibold">Halcyon vs Verdant GG</span>
          <Pill>QF</Pill>
          <Pill>Bo5</Pill>
        </div>
        <span className="mono text-[10px] text-mute2">22 Apr · 20:00</span>
      </div>
      <div className="p-3 space-y-2">
        {[
          "Milo faces ex-teammate Vatira for the first time since Lisbon split.",
          "Halcyon undefeated in Bo5 on Champions Field since November.",
        ].map((line, i) => (
          <div key={i} className="flex items-start gap-2">
            <div className="mono text-[10px] text-mute2 pt-0.5">{String(i + 1).padStart(2, "0")}</div>
            <div className="text-[12px] leading-[1.5]">
              {line}
              <span className="block mono text-[10px] text-mute2 mt-0.5">
                source: {i === 0 ? "liquipedia.net/…" : "blast.tv/…"}
              </span>
            </div>
          </div>
        ))}
        <div className="flex items-start gap-2 opacity-40">
          <div className="mono text-[10px] text-mute2 pt-0.5">03</div>
          <div className="text-[12px] leading-[1.5]">
            Verdant&apos;s rotation metric is the league&apos;s most extreme…
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 6.3: Replace `apps/web/app/page.tsx` with redirect to `/login`**

Content:
```tsx
import { redirect } from "next/navigation";

export default function Root() {
  redirect("/login");
}
```

- [ ] **Step 6.4: Run dev server and smoke-test**

```bash
pnpm --filter web dev
```

Open http://localhost:3000 — expect redirect to `/login`, page renders with correct fonts (Inter + JetBrains Mono), dark background, "Prep like Derek" headline, working email form that toggles to "Magic link sent" state.

- [ ] **Step 6.5: Commit**

```bash
git add apps/web/app
git commit -m "feat(web): port /login page from prototype (no auth wiring yet)"
```

---

## Task 7: Playwright E2E smoke test for `/login`

**Files:**
- Create: `apps/web/playwright.config.ts`
- Create: `apps/web/tests/e2e/login.spec.ts`
- Modify: `apps/web/.gitignore` — ensure `test-results/`, `playwright-report/`, `playwright/.cache/` are ignored (already in repo root `.gitignore`).

- [ ] **Step 7.1: Install Playwright**

```bash
pnpm --filter web add -D @playwright/test
pnpm --filter web exec playwright install --with-deps chromium
```

- [ ] **Step 7.2: Write `apps/web/playwright.config.ts`**

Content:
```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  fullyParallel: true,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000/login",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
});
```

- [ ] **Step 7.3: Write E2E smoke test (RED)**

File: `apps/web/tests/e2e/login.spec.ts`

Content:
```ts
import { test, expect } from "@playwright/test";

test("/login renders the headline and teaser", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Prep like Derek");
  await expect(page.getByRole("button", { name: "Send magic link" })).toBeVisible();
  await expect(page.getByText("A sheet looks like this")).toBeVisible();
});

test("magic link flow toggles to confirmation state", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Work email").fill("caster@studio.gg");
  await page.getByRole("button", { name: "Send magic link" }).click();
  await expect(page.getByText("Magic link sent")).toBeVisible();
  await expect(page.getByText("caster@studio.gg")).toBeVisible();
});

test("root / redirects to /login", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
});
```

- [ ] **Step 7.4: Run E2E — expect GREEN**

```bash
pnpm --filter web test:e2e
```
Expected: 3 passing tests. If fails, fix before committing.

- [ ] **Step 7.5: Commit**

```bash
git add apps/web/playwright.config.ts apps/web/tests/e2e apps/web/package.json apps/web/pnpm-lock.yaml pnpm-lock.yaml
git commit -m "test(web): Playwright E2E smoke for /login"
```

---

## Task 8: Create `packages/shared-types`

**Files:**
- Create: `packages/shared-types/package.json`, `packages/shared-types/tsconfig.json`, `packages/shared-types/index.ts`

These types are derived from `prototype/src/data.jsx` `SHEET` object shape. Stubs now, real usage in Sub-plans #6/#7.

- [ ] **Step 8.1: Write `packages/shared-types/package.json`**

Content:
```json
{
  "name": "@4casters/shared-types",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "./index.ts",
  "types": "./index.ts",
  "scripts": {
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.6.3"
  }
}
```

- [ ] **Step 8.2: Write `packages/shared-types/tsconfig.json`**

Content:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "composite": false
  },
  "include": ["**/*.ts"]
}
```

- [ ] **Step 8.3: Write `packages/shared-types/index.ts`**

Content:
```ts
/**
 * Canonical types shared across apps/web and services/scraper (via codegen).
 * Shape derived from prototype/src/data.jsx SHEET object.
 */

export type SourceType = "liquipedia" | "blast" | "youtube" | "twitter";

export interface SourceRef {
  url: string;
  srcType: SourceType;
  capturedAt?: string;
}

export interface TrendDelta {
  /** Current value */
  v: number;
  /** Delta vs prior 30d, as percentage (e.g., 7.1 = +7.1%) */
  d: number;
}

export interface PlayerStats30d {
  gpg: TrendDelta;
  savePct: TrendDelta;
  shotPct: TrendDelta;
  demos: TrendDelta;
}

export interface NotableItem {
  text: string;
  source?: SourceRef;
  /** True when the field is explicitly missing; excludes `source`. */
  missing?: boolean;
}

export interface PlayerProfile {
  liquipediaSlug: string;
  name: string;
  initials: string;
  role: string;
  country: string;
  stats: PlayerStats30d;
  notable: NotableItem[];
}

export interface NarrativeHook {
  title: string;
  body: string;
  source: SourceRef;
  /** Path into the MatchContextPacket that backs this hook. */
  backing: string;
}

export interface H2HRow {
  date: string;
  event: string;
  result: string;
  /** "a" if team A won the series */
  won: "a" | "b";
}

export interface QuoteWithSource {
  text: string;
  who: string;
  context: string;
  source: SourceRef;
}

export interface FreshnessStamp {
  liquipedia: string;
  blast: string;
  youtube: string;
}

export interface SheetOutput {
  matchId: string;
  eventSlug: string;
  eventName: string;
  stage: string;
  format: string;
  scheduled: string;
  teams: {
    a: TeamCard;
    b: TeamCard;
  };
  hooks: NarrativeHook[];
  h2h: {
    aggregate: { a: number; b: number };
    rows: H2HRow[];
  };
  players: PlayerProfile[];
  quotes: QuoteWithSource[];
  talkingPoints: string[];
  freshness: FreshnessStamp;
}

export interface TeamCard {
  liquipediaSlug: string;
  short: string;
  name: string;
  letters: string;
  record: string;
  seed: string;
  region: string;
}
```

- [ ] **Step 8.4: Typecheck the package**

```bash
pnpm --filter @4casters/shared-types typecheck
```
Expected: no output (success).

- [ ] **Step 8.5: Commit**

```bash
git add packages/shared-types
git commit -m "feat(types): shared SheetOutput, PlayerProfile, QuoteWithSource types"
```

---

## Task 9: Create `packages/db` with Drizzle + placeholder schema

**Files:**
- Create: `packages/db/package.json`, `packages/db/tsconfig.json`, `packages/db/drizzle.config.ts`, `packages/db/schema.ts`, `packages/db/client.ts`, `packages/db/.env.example`

Real entity tables come in Sub-plan #3. Placeholder only: `app_health` row for connectivity test.

- [ ] **Step 9.1: Write `packages/db/package.json`**

Content:
```json
{
  "name": "@4casters/db",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "./client.ts",
  "types": "./client.ts",
  "scripts": {
    "typecheck": "tsc --noEmit",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:studio": "drizzle-kit studio"
  },
  "dependencies": {
    "drizzle-orm": "^0.36.0",
    "postgres": "^3.4.5"
  },
  "devDependencies": {
    "drizzle-kit": "^0.28.0",
    "typescript": "^5.6.3"
  }
}
```

- [ ] **Step 9.2: Write `packages/db/tsconfig.json`**

Content:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "composite": false
  },
  "include": ["**/*.ts"]
}
```

- [ ] **Step 9.3: Write `packages/db/.env.example`**

Content:
```
DATABASE_URL=postgres://user:password@host:5432/postgres
```

- [ ] **Step 9.4: Write `packages/db/schema.ts` (placeholder)**

Content:
```ts
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Placeholder table used during Sub-plan #1 to verify connectivity.
 * Real entity tables (players, teams, matches, quotes, ...) land in Sub-plan #3.
 */
export const appHealth = pgTable("app_health", {
  id:        uuid("id").primaryKey().defaultRandom(),
  checkedAt: timestamp("checked_at", { withTimezone: true }).notNull().defaultNow(),
  note:      text("note"),
});
```

- [ ] **Step 9.5: Write `packages/db/client.ts`**

Content:
```ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL is not set. See packages/db/.env.example.");
}

const queryClient = postgres(url, { prepare: false });
export const db = drizzle(queryClient, { schema });
export { schema };
```

- [ ] **Step 9.6: Write `packages/db/drizzle.config.ts`**

Content:
```ts
import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./schema.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  strict: true,
  verbose: true,
});
```

- [ ] **Step 9.7: Install deps**

```bash
pnpm --filter @4casters/db install
pnpm --filter @4casters/db add dotenv
```

- [ ] **Step 9.8: Generate the first migration**

Requires `DATABASE_URL` — can be a temporary local Postgres (`docker run -e POSTGRES_PASSWORD=x -p 5432:5432 postgres:16`) or the Supabase URL from Task 10. If Supabase is set up first, do Task 10 before this step.

```bash
cd packages/db
cp .env.example .env   # fill in DATABASE_URL
pnpm db:generate
cd ../..
```

Expected: `packages/db/migrations/0000_*.sql` created with `CREATE TABLE "app_health"`.

- [ ] **Step 9.9: Typecheck**

```bash
pnpm --filter @4casters/db typecheck
```

- [ ] **Step 9.10: Commit**

```bash
git add packages/db
git commit -m "feat(db): drizzle client + placeholder app_health table + first migration"
```

---

## Task 10: Wire Supabase client (env scaffolding only)

**Files:**
- Create: `apps/web/.env.local.example`
- Create: `apps/web/lib/supabase/client.ts`
- Create: `apps/web/lib/supabase/server.ts`

Auth usage lands in Sub-plan #7 — this task only stands up the client so env + imports are tested.

- [ ] **Step 10.1: Manual — create Supabase project**

Go to https://supabase.com/dashboard, create a new project named `4casters-dev`, in EU region (closer to target users). Wait for provisioning (~2 min).

From Project Settings → API, collect:
- `NEXT_PUBLIC_SUPABASE_URL` (project URL)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (anon public key)

From Project Settings → Database → Connection string (URI mode):
- `DATABASE_URL` (for `packages/db/.env`)

- [ ] **Step 10.2: Install Supabase client**

```bash
pnpm --filter web add @supabase/supabase-js @supabase/ssr
```

- [ ] **Step 10.3: Write `apps/web/lib/supabase/client.ts`**

Content:
```ts
import { createBrowserClient } from "@supabase/ssr";

export function getBrowserSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY missing.");
  }
  return createBrowserClient(url, anonKey);
}
```

- [ ] **Step 10.4: Write `apps/web/lib/supabase/server.ts` (stub)**

Content:
```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function getServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY missing.");
  }
  const cookieStore = await cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (items) => {
        items.forEach(({ name, value, options }) => cookieStore.set({ name, value, ...options }));
      },
    },
  });
}
```

- [ ] **Step 10.5: Write `apps/web/.env.local.example`**

Content:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

- [ ] **Step 10.6: Create real `apps/web/.env.local` locally (NOT committed)**

Copy from the example and fill in real values. Verify `.env.local` is gitignored (root `.gitignore` already covers it).

- [ ] **Step 10.7: Smoke-test the import compiles**

```bash
pnpm --filter web typecheck
```
Expected: no errors.

- [ ] **Step 10.8: Commit (NOT the .env.local)**

```bash
git add apps/web/lib apps/web/.env.local.example apps/web/package.json apps/web/pnpm-lock.yaml pnpm-lock.yaml
git commit -m "feat(web): Supabase SSR client scaffolding + env example"
```

Verify `apps/web/.env.local` is NOT in the commit:
```bash
git log -1 --name-only | grep -v ".env.local$" || echo "OK — .env.local not tracked"
```

---

## Task 11: CI pipeline (lint + typecheck + unit test)

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 11.1: Write `.github/workflows/ci.yml`**

Content:
```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 10

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version-file: ".nvmrc"
          cache: "pnpm"

      - name: Install
        run: pnpm install --frozen-lockfile

      - name: Typecheck
        run: pnpm typecheck

      - name: Lint
        run: pnpm --filter web lint

      - name: Unit tests
        run: pnpm --filter web test
```

E2E tests are NOT in CI yet — they need a dev server running against live Supabase. Add in Sub-plan #8.

- [ ] **Step 11.2: Verify the workflow locally**

Simulate each step:
```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm --filter web lint
pnpm --filter web test
```

All must pass.

- [ ] **Step 11.3: Commit**

```bash
git add .github
git commit -m "ci: lint + typecheck + unit tests on push/PR"
```

- [ ] **Step 11.4: Push and verify CI runs green on GitHub**

```bash
git push origin main
```

Open the Actions tab on https://github.com/Kekkozzz/4casters and verify the `verify` job completes successfully.

---

## Task 12: Milestone tag

**Files:** none — tag only.

- [ ] **Step 12.1: Tag milestone**

```bash
git tag -a v0.1.0-scaffold -m "Sub-plan #1 complete: monorepo scaffold, Next.js + design tokens, /login port, Supabase client, DB package, CI green"
git push origin v0.1.0-scaffold
```

---

## Definition of Done for Sub-plan #1

All must be true before Sub-plan #2 starts:

- [ ] `pnpm install` at repo root works clean from fresh clone
- [ ] `pnpm --filter web dev` serves http://localhost:3000 with the design tokens visible
- [ ] `/` redirects to `/login`
- [ ] `/login` renders pixel-faithful to `prototype/src/login.jsx`, with Inter + JetBrains Mono loaded
- [ ] Magic link flow toggles to "Magic link sent" state on submit (no real auth)
- [ ] `pnpm --filter web test` passes (5 primitives unit tests)
- [ ] `pnpm --filter web test:e2e` passes (3 Playwright tests)
- [ ] `pnpm typecheck` passes across workspace
- [ ] `pnpm --filter @4casters/db db:generate` produced `packages/db/migrations/0000_*.sql`
- [ ] Supabase project `4casters-dev` exists, URL + anon key in `apps/web/.env.local`, `DATABASE_URL` in `packages/db/.env`
- [ ] GitHub Actions `verify` workflow runs green on main
- [ ] Git tag `v0.1.0-scaffold` pushed
- [ ] No secrets in git history (grep `git log -p -- apps/web/.env.local` returns empty)

---

## Risks & mitigations for this sub-plan

| Risk | Mitigation |
|---|---|
| `create-next-app` defaults drift between Next.js versions | Pin to `@15` in Task 3. If it scaffolds differently, adjust tsconfig/postcss manually. |
| Windows path quirks with `git mv` before initial commit | Task 1 Step 1.4 uses plain `mv`, documented inline. |
| Supabase project provisioning lag blocks Task 9 migration generation | Task 10 can run before Task 9 to unblock DATABASE_URL, or use Docker Postgres locally. |
| Tailwind v4 (beta) changes `extend` semantics vs v3 | Pin to Tailwind v3.4.x via create-next-app default. Do NOT upgrade to v4 in this sub-plan. |
| lucide-react icon name drift (e.g., `ChevronRight` vs `ChevRight`) | `components/ui/icons.ts` centralizes re-exports with prototype-matching names. |

---

## What's next (Sub-plan #2 preview)

After this sub-plan closes: **Frontend port (mock data)**. Port the remaining prototype pages (`/events`, `/events/[slug]`, `/matches/[id]`, `/sheets`) to Next.js with mock data still inline, full primitives set (FeedbackBar, LogoTile, Avatar, Trend, SectionHead), sidebar layout, and complete Playwright coverage.
