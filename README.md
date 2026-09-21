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

**Phase 1 feature-complete, including its automated quality gates.** Every
task (T1–T14 — scaffold, i18n/RTL, schemas, the data layer, workbook
ingestion, the workbook model, the matrix, score rows, sparklines,
likelihood/barriers/roadmap, trigger callouts, the channel detail drawer,
column filtering, and the fidelity/quality gates) is done. What's left of
Phase 1's definition of done is manual, not automatable from here: the
domain lead's side-by-side sign-off against the workbook, and the ≥8-person
recognition test (AC-6) — see `docs/DEV-PLAN.md`'s Definition of done.

- [x] T1 — Project scaffold
- [x] T2 — i18n and RTL foundation
- [x] T3 — Types and schemas (`lib/schemas/workbook.ts`)
- [x] T4 — Data layer (`lib/db/` — Drizzle + SQLite, migrations in `drizzle/`)
- [x] T5 — Workbook ingestion (`scripts/ingest-workbook.ts` + `scripts/ingest/`); run with `npm run ingest`
- [x] T6 — Workbook model (`lib/engine/workbook/`: `dimensionAverage`, `colorScale`, `sparklinePath`, `recovery`) + T6b parity harness (`npm run parity:generate`, `tests/unit/engine/parity.test.ts`)
- [x] T7 — Matrix grid skeleton (`components/workbook/WorkbookMatrix.tsx`): label pane + 17 channel columns, rows 1–3, RTL/LTR mirror, keyboard grid navigation
- [x] T8 — Score rows, colour scale, sub-score disclosure (`components/workbook/scoreRows.ts` + `WorkbookMatrix.tsx`): security/environment/equity averages coloured per SPEC §5.4's range-relative scale, each expandable in place (aria-expanded) to its five sub-score rows, collapsed by default
- [x] T9 — Sparkline rows (`components/workbook/Sparkline.tsx` + `sparklineRows.ts` + `WorkbookMatrix.tsx`): one inline-SVG area chart per channel under each score row, on the shared fixed axis and four-point category axis from `sparkline_specs`, negative fill below the zero baseline, empty white frame for columns with no data (K, L; F/M equity), hover/focus tooltip and accessible name per SPEC §5.5
- [x] T10 — Likelihood, barriers, roadmap (`WorkbookMatrix.tsx` + `roadmapRows.ts`): likelihood (words, not colour-coded) and barriers rows; the three phase bands with rotated phase/sub-group labels sticky at the inline-start edge, step cards (bold title, detail, bold-prefixed challenges) in fixed slots so every channel's cards align, empty slots preserved; free text (barriers, roadmap) shown in Hebrew with a marker in English mode (`lib/i18n/freeText.ts`, SPEC §5.10 rule 5)
- [x] T11 — Trigger callouts (`Callout.tsx` + `WorkbookMatrix.tsx`): the 5 callouts (F49, G53, J53, Q49, R49) attach to their anchor cell's roadmap slot — resolved from `anchorCell` via `roadmapRows.ts`'s `parseCellRef()` + the layout's row→slot map, not a second hard-coded lookup — and overflow toward the next phase boundary; `role="note"`, the anchor cell's `aria-describedby` refs it, ⚠ icon + free-text Hebrew-source fallback like the rest of the roadmap
- [x] T12 — Channel detail drawer (`ChannelDrawer.tsx`): opens from the channel-name cell (shadcn `Sheet`/Radix `Dialog`, focus trapped and restored to the trigger cell on close — see the component doc comment for why that needs an explicit `onCloseAutoFocus` rather than Radix's default); a Recharts radar of the three dimension averages plus an accessible table, all 15 sub-scores with the same colour-scale fills as the matrix, three full-size trajectory charts on a true (proportional) time axis with a numeric table each, the channel's complete roadmap and callouts, CF/CI marked as recovered/derived, and a cell-ref + dataset-version provenance badge on every figure
- [x] T13 — Column filtering (`WorkbookExplorer.tsx` + `FilterToolbar.tsx` + `columnFilters.ts`): an additive toolbar filters by axis group and/or likelihood, state synced to the URL (`?axis=...&likelihood=...`) so a reload restores it exactly; `computeAxisGroupSpans` now matches by each channel's own `axisGroupId` rather than a group's literal start/end column letters, so a header shrinks to its remaining visible columns and disappears when none remain, without throwing; colour scales are always computed from the full unfiltered payload, so a cell's colour never changes with filtering (verified in the browser: the same `rgb()` background before and after filtering)
- [x] T14 — Fidelity and quality gates (`tests/e2e/structural-fidelity.spec.ts`, `tests/e2e/accessibility.spec.ts`, `tests/e2e/visual-regression.spec.ts`, `tests/unit/engine/performance.test.ts`): a Playwright DOM test asserts column order, axis-group spans, fills, the collapsed-by-default/expand-in-place disclosure, blank-not-zero cells, and callout-to-anchor-cell wiring directly against the `/api/workbook` payload (AC-2); an axe scan runs on the initial matrix, an expanded dimension, and the open channel drawer, in both locales (AC-5); committed Playwright screenshots catch visual drift the DOM test can't; a Vitest budget times one full render's worth of colour-scale + sparkline computation as an engine-performance tripwire. Building this gate surfaced and fixed four real accessibility bugs, not just wiring: three WCAG AA colour-contrast failures (the roadmap's "HE" untranslated-text badge against the lightest phase-band fill and against the trigger-callout's blue; the trigger callout's own white-on-blue body text, in both `Callout.tsx` and its duplicate rendering in `ChannelDrawer.tsx`; `lib/color.ts`'s `contrastTextColor` picking a near-black `#1A1A1A` that still fell short of 4.5:1 against a mid-tone axis fill, fixed by using pure black, which is mathematically guaranteed to clear AA against any background paired with white as the alternative) and one structural ARIA defect (the roadmap section's own `role="grid"` was nested inside the matrix's outer `role="grid"` — invalid, since a grid's children must be `row`s, never another `grid`; fixed by folding the roadmap's rows into the outer grid's own row/column numbering instead of giving it a second nested grid role, and by adding the `role="row"` wrapper ARIA's grid pattern requires between `grid` and `rowheader`/`gridcell`/`columnheader`, using `display: contents` in the CSS-Grid-positioned data panes so the wrapper adds no layout of its own).

Ingestion has run against the real workbook: `db/snapshot.json` and
`db/ingest-report.md` are committed and current. All 17 columns' CF/CI/ramp
match SPEC §3.4 with zero trajectory-verification issues; the report lists
every anomaly SPEC §6.3 calls for (D copying C, K/L as enablers, row 37's
blank Trilemma row carrying a colour-scale rule the UI now uses (below),
the Q49 duplicate callout, the chart49–51/column-D mismatch, blank equity
for F/M) plus one SPEC didn't anticipate: row 31's equity average is a
literal cached value in the current file, not a live formula like rows 9
and 20.

**Post-T14 addition: Trilemma total row + section visibility selectors.**
Row 37 (טרילמה) is blank in the source workbook but carries its own
colour-scale rule (OQ-16); `components/workbook/scoreRows.ts`'s
`computeTrilemmaScores` now computes it as the mean of each channel's
three dimension averages (`dimensionAverage`'s exact blank-safe
semantics, reused rather than a bespoke average) and colours it with that
captured rule via `buildColorScale`, over real cell references
(`${columnLetter}37`) the same way every other score row does — never an
invented scale. Renders as one more row directly after equity, exactly
where the workbook puts it. Ingestion (`scripts/ingest/colorScaleRules.ts`)
now captures this rule instead of discarding it; `lib/schemas/workbook.ts`'s
`trilemmaColorScaleSchema` and a matching `lib/db/schema.ts` table
(`drizzle/0001_omniscient_cable.sql`) carry it through the payload,
nullable if a future workbook drops the rule. Alongside it, a "Show:"
group in `FilterToolbar.tsx` toggles the Trilemma scores, Trilemma charts
(sparkline rows) and roadmap sections independently —
`components/workbook/sectionVisibility.ts` is the same additive,
URL-synced pattern as `columnFilters.ts` (`?hide=scores,roadmap`; nothing
hidden by default), merged into one query string by
`WorkbookExplorer.tsx`'s `applyState` so the two filter dimensions never
clobber each other.

**Also post-T14: a transposed by-channel view** (`/by-channel`,
`components/channel-matrix/`) — channels as rows instead of columns, for
reading "everything about one channel" as a row instead of a column scan;
see the prose section below for what it shows and why it's a plain
`<table>` rather than the main matrix's CSS-Grid architecture.

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

Directly below each score row, one always-visible sparkline row (rows
14/25/36) plots that channel's four-milestone-year trajectory — generation
(security), emissions (environment), price impact (equity) — as an inline
SVG filled area on the row's shared fixed axis, never per-chart auto-scaled,
which is what makes renewables' generation sparkline visibly dwarf
efficiency's. Negative values fill below the zero baseline; a column with
no trajectory data renders the empty white plot frame. Hover or focus shows
a four-line tooltip and an accessible name reading all four values with
their unit and years.

Below the matrix, the likelihood row shows the workbook's words (High /
Medium / Low) uncoloured — inventing a red/amber/green scale would add a
judgement the workbook doesn't make — and the barriers row shows each
channel's free text. The roadmap section follows: three phase bands
(2025–2030, 2030–2040, 2040–2050), each with a rotated phase label and,
for 2025–2030, rotated sub-group labels (Targets / Steps / Impact) — both
sticky at the inline-start edge in the same fixed pane as the row labels,
so they never scroll away horizontally, and sharing the data pane's own
scroll position with the matrix above. Each channel's step gets a card —
bold title, small detail, small challenges text with a bold `אתגרים:`
prefix (kept in Hebrew regardless of locale, matching the workbook) — in a
fixed slot per phase/sub-group, so a step in the same slot aligns across
all 17 columns whether or not that channel filled it. Free text without an
approved English translation yet (targets, steps, challenges, barriers —
OQ-11) renders in Hebrew with a small "HE" marker in English mode
(`lib/i18n/freeText.ts`), never machine-translated.

The five trigger callouts (F49, G53, J53, Q49, R49) attach to their anchor
cell's roadmap slot — resolved from the cell reference via the same
phase/sub-group layout the step cards use, so a callout's row never needs
a second hard-coded lookup — and overflow toward the next phase's
boundary, exactly as in the workbook, rather than floating free of the
grid. Each is a `role="note"` referenced by its anchor cell's
`aria-describedby`.

Clicking (or Enter/Space on) a channel's name cell opens its detail
drawer (`ChannelDrawer.tsx`), built on `Sheet`/Radix `Dialog`: a Recharts
radar of the three dimension averages with an accessible table alongside
it, all 15 sub-scores coloured with the same colour-scale lookup the
matrix uses, three full-size trajectory charts on a true (proportional,
not evenly-spaced) time axis each with its own numeric table, the
channel's complete roadmap and callouts, CF/CI explicitly marked as
recovered rather than raw workbook values, and a small cell-ref badge —
hover or focus it for the cell reference plus dataset version — next to
every figure (NFR-5/6). Focus is trapped inside the drawer and restored
to the triggering cell on close; because the trigger is a plain grid
cell rather than a dedicated `<Dialog.Trigger>`, that restoration is
wired explicitly via `SheetContent`'s `onCloseAutoFocus` rather than
relying on Radix's default (see `ChannelDrawer.tsx`'s doc comment — this
was caught by a Playwright check of `document.activeElement` after
closing, not by inspection).

A toolbar above the matrix (`FilterToolbar.tsx`, driven by
`WorkbookExplorer.tsx`) filters columns by axis group and/or likelihood;
the filter state lives in the URL (`?axis=renewables&likelihood=high`,
etc.) rather than component state, so a page reload restores it exactly.
Filtering never recomputes colour: every colour scale is built from the
full 17-channel payload regardless of which columns are currently
visible (SPEC §5.9), and `gridLayout.ts`'s `computeAxisGroupSpans` now
matches each axis group by which channels actually carry its
`axisGroupId` rather than by its literal start/end column letters, so a
partly-filtered group's header shrinks to its remaining columns and a
fully-filtered one simply disappears, with nothing to throw on a column
gap.

The same toolbar's "Show:" group toggles three row-groups independently:
Trilemma scores, Trilemma charts (the sparkline rows), and the roadmap
section — also URL-synced (`?hide=scores,charts,roadmap`, only the hidden
ones listed) via `sectionVisibility.ts`, merged with the column filters
into one query string so reloading restores both. Hiding scores also
hides the Trilemma total row that follows equity (below); hiding charts
alone leaves it in place.

**By-channel view (`/he/by-channel`, `/en/by-channel`) — the transposed
table.** A second, standalone view alongside the main matrix, linked from
each page's header: one row per generation path/channel instead of one
column, so a reader who wants "everything about channel X" reads
straight across a row instead of scanning 39+ rows down one column.
Columns group by dimension (Security/Environment/Equity), each with a
score column followed by that dimension's trajectory _metric_ across the
four milestone years — the score itself is a single snapshot per channel
in the workbook, not time-series data, only its associated metric
(generation/emissions/price impact) is, so "scores by year" would be
inventing data the workbook doesn't have (see
`components/channel-matrix/channelMatrixColumns.ts`'s doc comment) — then
Trilemma, Likelihood, Barriers, then one column-group per roadmap phase
with that phase's target/step/impact slots as columns instead of rows.
Reuses the exact same domain logic as the main matrix (`buildColorScale`
via `scoreRows.ts`, `buildRoadmapLayout`, `resolveFreeText`) rather than
re-deriving any of it, so a colour or a translation fallback can never
drift between the two views — verified directly (a channel scoring a
perfect 5 on Security renders the same `#63BE7B` T6b golden colour here
as in the main matrix). Deliberately a plain semantic `<table>`, not the
main matrix's CSS-Grid two-pane split: with only 17 rows, no
virtualization is needed, and a real `<table>` gives the pinned first
column (channel name, `position: sticky`) correct row-height agreement
with the rest of the row for free — native table row layout, not two
independently-rendered DOM trees — sidestepping the whole class of
pane-sync bug the main matrix had to solve by hand (see
`ChannelMatrix.tsx`'s doc comment on why `position: sticky` works here
despite failing inside the main matrix's wide CSS Grid). Trigger callouts
render as an inline note within their roadmap-slot cell rather than an
overflowing overlay: the workbook's "overflow toward the next phase"
reads naturally when phases are vertical bands, but here phases are
column groups, so replicating it would need a direction-aware
(RTL-mirrored) transform per callout for no real benefit over an inline
note.

## Tech stack

Next.js 16 (App Router, TypeScript strict) · Tailwind CSS 4 · shadcn/ui
(Radix primitives, hand-authored — see `components/ui/` above) · Recharts ·
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

| Command                                   | Purpose                                                                                                                                     |
| :---------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm run dev`                             | Dev server                                                                                                                                  |
| `npm run build` / `npm run start`         | Production build / serve                                                                                                                    |
| `npm run typecheck`                       | `tsc --noEmit`                                                                                                                              |
| `npm run lint`                            | ESLint, including the two repo-specific rules below                                                                                         |
| `npm run test` / `npm run test:watch`     | Vitest unit tests (`tests/unit/`)                                                                                                           |
| `npm run e2e`                             | Playwright (`tests/e2e/`): locale redirect, structural fidelity (AC-2), accessibility (AC-5), visual regression against committed baselines |
| `npm run format` / `npm run format:check` | Prettier                                                                                                                                    |
| `npm run ingest`                          | Re-run workbook ingestion against `docs/*.xlsx`, rewriting `db/snapshot.json`, `db/ingest-report.md` and `db/reference.sqlite`              |
| `npm run parity:generate`                 | Regenerate `db/parity-fixtures.json` (T6b golden fixtures) from `db/snapshot.json` — run explicitly, never in CI                            |

CI (`.github/workflows/ci.yml`) runs typecheck, lint, unit tests, format
check, build and the Playwright e2e suite (installing Chromium first) on
every push.

## Project structure

```
app/[locale]/       routes — /he (default) and /en, locale set at the root layout only;
                     by-channel/ is the transposed (channels-as-rows) view, a separate route
app/api/            /api/workbook, /api/channels/[id] (SPEC §7) — thin wrappers over lib/db/queries
components/workbook/  WorkbookMatrix.tsx (F-101/F-102, T7-T13) + gridLayout.ts (pure grid-layout helpers)
                     + scoreRows.ts (pure: score/sub-score row disclosure order, per-column colour lookup)
                     + sparklineRows.ts (pure: sparkline row lookup, per-channel trajectory values) + Sparkline.tsx (inline SVG cell)
                     + roadmapRows.ts (pure: phase/sub-group/slot layout derived from phaseBands + roadmapItems,
                       plus the workbook-row -> slot map callouts resolve their anchor against)
                     + Callout.tsx (F-104 trigger callout, positioned on its anchor cell's roadmap slot)
                     + HebrewSourceMark.tsx (the "HE" marker for untranslated free text)
                     + ChannelDrawer.tsx (F-105, T12: radar + trajectory charts, sub-scores, roadmap, provenance)
                     + WorkbookExplorer.tsx (F-106, T13: owns URL-synced filter + section-visibility state, renders FilterToolbar + WorkbookMatrix)
                     + FilterToolbar.tsx + columnFilters.ts (pure: URL <-> filter state, channel-visibility predicate)
                     + sectionVisibility.ts (pure: URL <-> hidden-sections state for the scores/charts/roadmap selectors, OQ-16)
components/channel-matrix/  ChannelMatrix.tsx (the by-channel/transposed view: channels as rows) +
                     channelMatrixColumns.ts (pure: the column-group structure -- dimension score + trajectory
                     years, Trilemma/Likelihood/Barriers, roadmap phase slots -- reuses buildRoadmapLayout
                     rather than re-deriving roadmap structure a third time)
components/ui/      hand-authored shadcn/ui primitives (Sheet on @radix-ui/react-dialog, Table) — the shadcn
                     CLI's registry fetch isn't reachable through this environment's egress proxy, so these
                     are written by hand in the same "new-york" style components.json already configures
lib/engine/         the one calculation engine — pure TypeScript, no I/O, no Date, no React
                     workbook/{recovery,dimensionAverage,colorScale,sparklinePath}.ts (SPEC §3, §5.4, §5.5)
lib/db/             Drizzle schema (schema.ts), migrations runner + snapshot-hydration (client.ts),
                     getWorkbookPayload()/getChannel() (queries.ts)
lib/i18n/           i18next config, he/en catalogues, useFormat(), freeText.ts (SPEC §5.10 rule 5's Hebrew-source fallback)
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
tests/unit/         Vitest — engine/ingestion/component-logic unit tests + the T14 performance budget (engine/performance.test.ts)
tests/e2e/          Playwright (T14) — locale-redirect, structural-fidelity.spec.ts (AC-2, against /api/workbook),
                     accessibility.spec.ts (AC-5, axe), visual-regression.spec.ts (committed screenshot baselines
                     in visual-regression.spec.ts-snapshots/), channel-matrix.spec.ts (the by-channel view's own
                     axe/structural/visual-regression coverage)
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
