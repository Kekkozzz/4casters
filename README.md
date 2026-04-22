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
