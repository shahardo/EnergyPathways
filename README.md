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

**Phase 1 in progress.** Scaffold, i18n/RTL foundation, the core Zod
schemas, the data layer, full workbook ingestion, the workbook model, the
matrix skeleton and the score rows are done (DEV-PLAN T1–T8). Sparklines,
roadmap, callouts, the detail drawer and column filtering (T9–T13) are not
yet built — see the checklist below.

- [x] T1 — Project scaffold
- [x] T2 — i18n and RTL foundation
- [x] T3 — Types and schemas (`lib/schemas/workbook.ts`)
- [x] T4 — Data layer (`lib/db/` — Drizzle + SQLite, migrations in `drizzle/`)
- [x] T5 — Workbook ingestion (`scripts/ingest-workbook.ts` + `scripts/ingest/`); run with `npm run ingest`
- [x] T6 — Workbook model (`lib/engine/workbook/`: `dimensionAverage`, `colorScale`, `sparklinePath`, `recovery`) + T6b parity harness (`npm run parity:generate`, `tests/unit/engine/parity.test.ts`)
- [x] T7 — Matrix grid skeleton (`components/workbook/WorkbookMatrix.tsx`): label pane + 17 channel columns, rows 1–3, RTL/LTR mirror, keyboard grid navigation
- [x] T8 — Score rows, colour scale, sub-score disclosure (`components/workbook/scoreRows.ts` + `WorkbookMatrix.tsx`): security/environment/equity averages coloured per SPEC §5.4's range-relative scale, each expandable in place (aria-expanded) to its five sub-score rows, collapsed by default
- [ ] T9–T13 — Sparklines, roadmap, callouts, detail drawer, column filtering
- [ ] T14 — Fidelity and quality gates

Ingestion has run against the real workbook: `db/snapshot.json` and
`db/ingest-report.md` are committed and current. All 17 columns' CF/CI/ramp
match SPEC §3.4 with zero trajectory-verification issues; the report lists
every anomaly SPEC §6.3 calls for (D copying C, K/L as enablers, the blank
row 37 Trilemma rule, the Q49 duplicate callout, the chart49–51/column-D
mismatch, blank equity for F/M) plus one SPEC didn't anticipate: row 31's
equity average is a literal cached value in the current file, not a live
formula like rows 9 and 20.

The matrix (`/he`, `/en`) renders rows 1–3 from real ingested data: label
column pinned to the inline-start edge (a fixed pane, not `position:
sticky` — see `WorkbookMatrix.tsx`'s doc comment for why), 17 channels in
workbook order, axis headers merged and coloured per SPEC §5.3, an exact
RTL↔LTR mirror, and full keyboard grid navigation (arrow keys, Home/End).
Below that, the three score rows (security, environment, equity) render
their `IFERROR(AVERAGE(...),"")` values coloured by the Excel three-colour
scale, computed over each rule's full range — hidden sub-scores together
with the average row, column D's single-cell rule kept separate — never
over the visible row alone (SPEC §5.4). Clicking a score row's label
toggles `aria-expanded` and reveals its five sub-score rows in place,
directly above the average, exactly as the workbook orders them; a blank
average or sub-score (e.g. equity for columns F/M) renders as an empty
cell in the row's neutral `#A6A6A6` fill.

## Tech stack

Next.js 16 (App Router, TypeScript strict) · Tailwind CSS 4 · shadcn/ui ·
Zod · i18next (Hebrew RTL default, English LTR) · Zustand · Drizzle ORM over
`better-sqlite3` · Vitest · Playwright. Rationale for each choice is in
[PRD §5](docs/PRD.md#5-technical-architecture).

## Getting started

```bash
npm install
npm run dev       # http://localhost:3000 — redirects to /he
```

`better-sqlite3` is a native addon, and `esbuild`/`unrs-resolver` fetch
platform binaries — all three need their install scripts to run. npm 12
blocks install scripts by default, so the allowlist lives in the
`allowScripts` field of `package.json`; it is committed, and `npm install`
honours it with no extra step. If you ever see

```
Error: Could not locate the bindings file … better_sqlite3.node
```

the script was skipped (an older allowlist, or `--ignore-scripts`). Fix it
with `npm rebuild better-sqlite3 esbuild unrs-resolver` — `npm install`
alone reports "up to date" and will not re-run it.

## Scripts

| Command                                   | Purpose                                                                                                                        |
| :---------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------- |
| `npm run dev`                             | Dev server                                                                                                                     |
| `npm run build` / `npm run start`         | Production build / serve                                                                                                       |
| `npm run typecheck`                       | `tsc --noEmit`                                                                                                                 |
| `npm run lint`                            | ESLint, including the two repo-specific rules below                                                                            |
| `npm run test` / `npm run test:watch`     | Vitest unit tests (`tests/unit/`)                                                                                              |
| `npm run e2e`                             | Playwright (`tests/e2e/`) — visual regression baselines land with T14                                                          |
| `npm run format` / `npm run format:check` | Prettier                                                                                                                       |
| `npm run ingest`                          | Re-run workbook ingestion against `docs/*.xlsx`, rewriting `db/snapshot.json`, `db/ingest-report.md` and `db/reference.sqlite` |
| `npm run parity:generate`                 | Regenerate `db/parity-fixtures.json` (T6b golden fixtures) from `db/snapshot.json` — run explicitly, never in CI               |

CI (`.github/workflows/ci.yml`) runs typecheck, lint, unit tests, format
check and build on every push.

## Project structure

```
app/[locale]/       routes — /he (default) and /en, locale set at the root layout only
app/api/            /api/workbook, /api/channels/[id] (SPEC §7) — thin wrappers over lib/db/queries
components/workbook/  WorkbookMatrix.tsx (F-101/F-102, T7-T8) + gridLayout.ts (pure grid-layout helpers)
                     + scoreRows.ts (pure: score/sub-score row disclosure order, per-column colour lookup)
lib/engine/         the one calculation engine — pure TypeScript, no I/O, no Date, no React
                     workbook/{recovery,dimensionAverage,colorScale,sparklinePath}.ts (SPEC §3, §5.4, §5.5)
lib/db/             Drizzle schema (schema.ts), migrations runner + snapshot-hydration (client.ts),
                     getWorkbookPayload()/getChannel() (queries.ts)
lib/i18n/           i18next config, he/en catalogues, useFormat()
lib/schemas/        Zod schemas — the single source of truth for domain types
lib/color.ts         WCAG contrast-based header text colour (SPEC §5.10 deviation)
scripts/ingest-workbook.ts   orchestrates the pipeline below; run via `npm run ingest`
scripts/ingest/     OOXML parsing (zip/xml/theme/styles/sheet/charts/drawings), value + roadmap
                     extraction, structural assertions, the column/row maps, report rendering
scripts/generate-parity-fixtures.ts   T6b golden-fixture generator; run via `npm run parity:generate`
drizzle/            committed SQL migrations for lib/db/schema.ts (generated by `drizzle-kit generate`)
db/                 snapshot.json + ingest-report.md + parity-fixtures.json (all committed),
                     reference.sqlite (gitignored — rebuilt from snapshot.json on first read)
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
