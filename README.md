# 4casters

AI caster prep tool for Rocket League — match sheets with verifiable sources.

## Status

Early scaffolding. See [`docs/superpowers/plans/`](./docs/superpowers/plans/) for the implementation roadmap and [`docs/research/`](./docs/research/) for market + customer discovery.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS v4
- ESLint 9 (flat config)
- npm (single-package at root)

## Quickstart

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Layout

- `app/` — Next.js App Router pages + API routes
- `prototype/` — Claude design prototype (canonical visual reference, not production)
- `docs/research/` — market + customer discovery reports
- `docs/superpowers/plans/` — executable implementation plans
- `services/scraper/` — Python FastAPI scraper (added in Sub-plan #3)
