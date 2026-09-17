# Israel Energy Pathways 2050

An interactive, bilingual (Hebrew/English) rendition of the **Israel 2050
Pathways** workbook — 17 energy-supply and demand-side pathways, each scored
on the Energy Trilemma (security, environment, equity), quantified to 2050,
with a phased policy roadmap — building toward a scenario simulator on top of
it.

> **Read the docs first.** This project is spec-driven: almost every design
> decision below is justified in one of the three documents in `docs/`.
> Skimming this README is not a substitute for reading them.

| Document                               | Answers                                                                                          |
| :------------------------------------- | :----------------------------------------------------------------------------------------------- |
| [`docs/PRD.md`](docs/PRD.md)           | What are we building, for whom, and why?                                                         |
| [`docs/SPEC.md`](docs/SPEC.md)         | Exact layout, colours, formulas, schemas, API — **normative**, wins over the PRD on any conflict |
| [`docs/DEV-PLAN.md`](docs/DEV-PLAN.md) | Phase 1 task breakdown (T1–T14), dependency order, acceptance criteria                           |
| [`CLAUDE.md`](CLAUDE.md)               | Conventions and guardrails for anyone (human or agent) working in this repo                      |

## Status

**Phase 1 in progress.** Scaffold, i18n/RTL foundation and the core Zod
schemas are done (DEV-PLAN T1–T3). Ingestion, the workbook model and the
matrix UI (T5–T13) are not yet built — see the checklist below.

- [x] T1 — Project scaffold
- [x] T2 — i18n and RTL foundation
- [x] T3 — Types and schemas (`lib/schemas/workbook.ts`)
- [ ] T4 — Data layer (Drizzle + SQLite)
- [ ] T5 — Workbook ingestion (`scripts/ingest-workbook.ts`)
- [ ] T6 — Workbook model (`lib/engine/workbook/`)
- [ ] T7–T13 — Matrix UI (grid, score rows, sparklines, roadmap, callouts, detail drawer, filtering)
- [ ] T14 — Fidelity and quality gates

## Tech stack

Next.js 15 (App Router, TypeScript strict) · Tailwind CSS 4 · shadcn/ui ·
Zod · i18next (Hebrew RTL default, English LTR) · Zustand · Drizzle ORM over
`better-sqlite3` · Vitest · Playwright. Rationale for each choice is in
[PRD §5](docs/PRD.md#5-technical-architecture).

## Getting started

```bash
npm install
npm run dev       # http://localhost:3000 — redirects to /he
```

## Scripts

| Command                                   | Purpose                                                                      |
| :---------------------------------------- | :--------------------------------------------------------------------------- |
| `npm run dev`                             | Dev server                                                                   |
| `npm run build` / `npm run start`         | Production build / serve                                                     |
| `npm run typecheck`                       | `tsc --noEmit`                                                               |
| `npm run lint`                            | ESLint, including the two repo-specific rules below                          |
| `npm run test` / `npm run test:watch`     | Vitest unit tests (`tests/unit/`)                                            |
| `npm run e2e`                             | Playwright (`tests/e2e/`) — visual regression baselines land with T14        |
| `npm run format` / `npm run format:check` | Prettier                                                                     |
| `npm run ingest`                          | Workbook ingestion (`scripts/ingest-workbook.ts`) — not yet implemented (T5) |

CI (`.github/workflows/ci.yml`) runs typecheck, lint, unit tests, format
check and build on every push.

## Project structure

```
app/[locale]/       routes — /he (default) and /en, locale set at the root layout only
components/         React components; components/workbook/ is the matrix view (not yet built)
lib/engine/         the one calculation engine — pure TypeScript, no I/O, no Date, no React
lib/db/             Drizzle schema + queries over SQLite (not yet built)
lib/i18n/           i18next config, he/en catalogues, useFormat()
lib/schemas/         Zod schemas — the single source of truth for domain types
scripts/            ingest-workbook.ts — OOXML ingestion pipeline (not yet built)
db/                 snapshot.json + ingest-report.md (committed), reference.sqlite (gitignored)
docs/               PRD, SPEC, DEV-PLAN, the source workbook, the reference screenshot
```

## Repo-specific lint rules

- **No physical-direction CSS.** `left`/`right`/`ml-`/`mr-`/`pl-`/`pr-`
  classes are banned repo-wide (`eslint-rules/no-physical-direction.mjs`).
  Use logical properties (`ms-`/`me-`/`ps-`/`pe-`/`start-`/`end-`) — the
  matrix's Hebrew/English mirroring depends on `dir="rtl"` doing all the work.
- **`lib/engine/` stays pure.** No `react`, `next`, `fs` or `Date` imports —
  enforced so the same engine code can run identically on the client and the
  server.

## Keeping this file and CLAUDE.md current

**Update this README and `CLAUDE.md` on every significant change** — a new
module, a changed workflow, a new script, a structural decision. They are
the entry point for the next person (or agent) into this repo; letting them
drift out of date is worse than not having them.

## License

Not yet decided. Treat as all-rights-reserved until specified.
