# CLAUDE.md

Guidance for Claude Code (or any agent) working in this repository.

## What this is

A web rendition of the **Israel 2050 Pathways** Excel workbook, then a
scenario simulator built on top of it. Read
[`docs/PRD.md`](docs/PRD.md) (what/why),
[`docs/SPEC.md`](docs/SPEC.md) (normative: exact layout, colours, formulas,
schemas, API — wins over the PRD on any conflict) and
[`docs/DEV-PLAN.md`](docs/DEV-PLAN.md) (Phase 1 task breakdown, T1–T14, in
dependency order) before making non-trivial changes. `README.md` is the
human-facing quickstart; this file is the working conventions.

**The workbook is the design reference.** `docs/Israel 2050 Pathways
06092026.xlsx` and `docs/references/workbook-he.png` are the ground truth
for Module 1. Where a UI decision is ambiguous, fidelity to the workbook
beats a "nicer" alternative — see PRD §6 and SPEC §5.10 for the recorded
deviations and the reasoning required to add a new one.

## Keep README.md and this file current

**Update `README.md` and `CLAUDE.md` on every significant change**: a new
module or directory, a changed script or workflow, a structural or
architectural decision, a completed DEV-PLAN task. Tick off the checklist
in `README.md` as tasks land. Do this in the same commit as the change, not
as a follow-up — a stale map is worse than no map.

## Hard constraints (do not relax these without updating SPEC.md first)

- **`lib/engine/` is pure.** No `react`, `next`, `fs`/`node:fs`, or `Date`.
  No I/O, no randomness. Enforced by `eslint.config.mjs` (the
  `lib/engine/**` override) — if you find yourself wanting an exception,
  the fix is almost always to move the impure part outside `lib/engine/`,
  not to weaken the rule.
- **No physical-direction CSS.** `left`/`right`/`ml-`/`mr-`/`pl-`/`pr-`
  (and `text-left`/`text-right`/`float-left`/`float-right`) are banned
  repo-wide by `eslint-rules/no-physical-direction.mjs`. Use logical
  properties: `ms-`/`me-`/`ps-`/`pe-`/`start-`/`end-`. The matrix mirrors
  Hebrew↔English purely via `dir="rtl"|"ltr"`; a physical class breaks that
  silently in only one locale, which is easy to miss in review.
- **`dir` and `lang` are set in exactly one place**: `app/[locale]/layout.tsx`
  (the root layout — this project has no separate top-level `app/layout.tsx`
  by design, see SPEC §8). Don't set `dir` anywhere else.
- **Blank is `null`, never `0`.** A blank workbook cell must never render as
  zero, a dash invented by us, or `NaN`. See SPEC §1.3 and §5.10 rule 2, and
  `lib/schemas/workbook.ts`, where every field that can be blank in the
  current workbook is `.nullable()`.
- **Column order is the workbook's order, always.** Never re-sort the 17
  channels; axis grouping is part of the format (PRD F-106, SPEC §5.9).
- **Row labels, axis names and channel names are data, not catalogue
  strings.** They come from the ingested workbook (`getWorkbookPayload()`'s
  `*_he`/`*_en` fields — `lib/db/queries.ts`), not from
  `lib/i18n/locales/*/common.json`. The catalogue is UI chrome only
  (SPEC §8). `nameEn`/`barriersEn`/roadmap `*_en` fields are currently `""`
  or `null` — no approved translations exist yet (OQ-11).
- **Zod schemas are the source of truth for domain types.** Add or change a
  type in `lib/schemas/workbook.ts` via `z.infer`; don't hand-write a
  parallel `interface`.
- **Columns are alternatives, not addends** (PRD §3.4). Don't sum all 17
  channel trajectories into a "total" anywhere — it double- or triple-counts
  gas-fired generation. Any totals in Phase 2+ go through the energy-role
  rules in SPEC §4.2.

## Working conventions

- TypeScript strict + `noUncheckedIndexedAccess` is on. Don't add `!`
  non-null assertions or `as` casts to work around it — narrow properly, or
  the type is wrong.
- Every workbook-derived figure carries a `cell_ref` and the
  `dataset_version` (NFR-6, NFR-5). If you add a new derived field, don't
  drop this.
- Prettier formats everything except `docs/PRD.md`, `docs/SPEC.md` and
  `docs/DEV-PLAN.md` (see `.prettierignore`) — those are normative reference
  documents; don't reflow their formatting even incidentally via a broad
  `npm run format`.
- Before committing: `npm run typecheck && npm run lint && npm run test &&
npm run format:check && npm run build`. All five are required in CI
  (`.github/workflows/ci.yml`); don't push something that fails one.
- Follow DEV-PLAN's dependency order (T1 → T2/T3 → T4 → T5 → T6 → T7 → T8–T13
  in parallel → T14 continuously). T1–T5 are done: real workbook data is
  available end-to-end through `getWorkbookPayload()`/`getChannel()`
  (`lib/db/queries.ts`). Build matrix UI against that, not hand-mocked
  fixtures — the data layer is no longer the blocker.
- **Changed the workbook or `lib/db/schema.ts`?** Re-run `npm run ingest`
  (rewrites `db/snapshot.json`, `db/ingest-report.md`,
  `db/reference.sqlite`) and commit the diff. A schema change also needs
  `npx drizzle-kit generate` for a new migration under `drizzle/` before
  ingestion will apply cleanly.
- **`reference.sqlite` is gitignored and disposable.** It's rebuilt
  automatically from `db/snapshot.json` the first time `getDb()` runs
  (`lib/db/client.ts`) — never commit it, and never hand-edit it instead of
  re-running ingestion.
- **Excel shared formulas** (`<f t="shared" si="N">`) store the formula
  text once, on the group's first cell; every other cell in the group
  carries only `si`. `scripts/ingest/sheet.ts`'s `CellFormula` exposes both
  halves — see `scripts/ingest/assertions.ts` for how to resolve a member
  cell back to its master text. Don't assume every formula cell has its own
  `<f>` text.
- The current workbook has one documented deviation from SPEC §2.2's stated
  formula pattern: row 31 (equity average) holds literal cached numbers,
  not a live `IFERROR(AVERAGE(...),"")` formula like rows 9/20. Ingestion
  handles this (`checkEquityAverageIsLiteral` in `scripts/ingest/assertions.ts`)
  and reports it as an anomaly rather than aborting — displayed values are
  unaffected either way.

## Open questions

`docs/PRD.md` §10 lists 18 open questions (OQ-1…OQ-18) with working
defaults. They're not blockers, but if you're implementing something an OQ
touches, use the documented default and note the OQ number in a comment —
don't silently pick a different assumption.
