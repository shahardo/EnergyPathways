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
- **`dir` and `lang` for the _page_ are set in exactly one place**:
  `app/[locale]/layout.tsx` (the root layout — this project has no separate
  top-level `app/layout.tsx` by design, see SPEC §8). Don't set the page
  direction anywhere else. The one narrow exception: wrap an inherently
  Latin/numeric run (`"3,000 MW"`, a score, a TWh figure) in
  `<span dir="ltr">` where it's rendered inside Hebrew flow — without it the
  browser's bidi algorithm visually reorders "3,000 MW" to "MW 3,000" (found
  rendering T7's potential row; see `WorkbookMatrix.tsx`). That's isolating
  one value's internal order, not setting the page's direction — the two
  aren't in tension.
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
- **Native deps need their install scripts.** `better-sqlite3` (the addon
  itself), `esbuild` (vitest/tsx) and `unrs-resolver` (the ESLint import
  resolver) are allowlisted in the `allowScripts` field of `package.json`,
  because npm 12 blocks install scripts by default. Keep that field
  committed; a blocked `better-sqlite3` install surfaces far from its cause,
  as a "Could not locate the bindings file" 500 from `getDb()`. After
  changing the allowlist, `npm rebuild <pkg>` — `npm install` says "up to
  date" and skips the script.
- Prettier formats everything except `docs/PRD.md`, `docs/SPEC.md` and
  `docs/DEV-PLAN.md` (see `.prettierignore`) — those are normative reference
  documents; don't reflow their formatting even incidentally via a broad
  `npm run format`.
- Before committing: `npm run typecheck && npm run lint && npm run test &&
npm run format:check && npm run build && npm run e2e`. All six are
  required in CI (`.github/workflows/ci.yml`); don't push something that
  fails one. `npm run e2e` needs a Chromium build matching the installed
  `@playwright/test` version on `PATH` (CI installs one with
  `npx playwright install --with-deps chromium`); in a dev container whose
  pre-installed browser predates the pinned `@playwright/test` version,
  set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` instead of downloading a
  second copy (`playwright.config.ts` reads it; see
  `/root/.ccr/README.md`).
- Follow DEV-PLAN's dependency order (T1 → T2/T3 → T4 → T5 → T6 → T7 → T8–T13
  in parallel → T14 continuously). T1–T14 are done — all of Phase 1's
  feature work and automated quality gates; what remains of Phase 1's
  definition of done (domain-lead sign-off, the recognition test) is
  manual, not something to automate from here. Real workbook data is
  available end-to-end through `getWorkbookPayload()`/`getChannel()`
  (`lib/db/queries.ts`), the pure colour-scale/sparkline-path/average
  functions exist in `lib/engine/workbook/`, the matrix skeleton
  (`WorkbookMatrix.tsx`) renders rows 1–3 from that real data, the
  three score rows render coloured and expand in place to their sub-score
  rows (`components/workbook/scoreRows.ts` — row disclosure order and the
  per-column colour-scale lookup, both pure and unit-tested independently
  of the component, same pattern as `gridLayout.ts`), one always-visible
  sparkline row renders directly below each score row
  (`components/workbook/sparklineRows.ts` for the pure row/trajectory
  lookups + `Sparkline.tsx` for the inline-SVG cell, geometry from T6's
  `sparklinePath`), and likelihood/barriers/roadmap render below that
  (`components/workbook/roadmapRows.ts` derives the roadmap's row/phase/
  sub-group layout from ingested `phaseBands` rather than re-hard-coding
  workbook row numbers; rendered in the _same_ fixed label pane and
  scrolling data pane as the matrix above, appended after it, so the
  roadmap's phase/sub-group columns are pinned at the inline-start edge
  the same way the row-label column is, and its step-card grid shares the
  matrix's horizontal scroll position automatically — see
  `WorkbookMatrix.tsx`'s roadmap section rather than building a second
  scroll container synced by hand). Untranslated free text (barriers,
  roadmap steps — OQ-11) falls back to Hebrew with an "HE" marker in
  English mode via `lib/i18n/freeText.ts`'s `resolveFreeText()` +
  `components/workbook/HebrewSourceMark.tsx`. The five trigger callouts
  (F49, G53, J53, Q49, R49) render too (`components/workbook/Callout.tsx`):
  each one's `anchorCell` resolves to a roadmap slot via
  `roadmapRows.ts`'s `parseCellRef()` + the layout's row→slot map — never
  a second hard-coded row-number table — and renders as an absolutely-
  positioned overlay on that slot's cell, overflowing toward the next
  phase's boundary rather than floating free of the grid (SPEC §5.8).
  Clicking (or Enter/Space on) a channel's name cell opens
  `components/workbook/ChannelDrawer.tsx` (F-105): a shadcn `Sheet` (Radix
  `Dialog`) with a Recharts radar of the three dimension averages, all 15
  coloured sub-scores, three trajectory charts on a true time axis, the
  channel's roadmap and callouts, and CF/CI marked as recovered. **Keep
  `<Sheet>`/`<SheetContent>` mounted continuously, `open` toggling
  visibility** — conditionally omitting `SheetContent` from the tree when
  no channel is selected breaks Radix's close-animation and focus-restore
  timing (a real bug caught here via a Playwright check of
  `document.activeElement`, not by inspection). Because the trigger is a
  plain grid cell, not a `<Dialog.Trigger>`, focus restoration on close is
  wired by hand: `WorkbookMatrix.tsx` captures the clicked/activated
  cell's DOM node in a ref, passed to `ChannelDrawer` and applied via
  `SheetContent`'s `onCloseAutoFocus`. `components/ui/sheet.tsx` and
  `table.tsx` are hand-authored (the shadcn CLI's registry fetch isn't
  reachable through this environment's egress proxy — `npx shadcn add`
  failed with a cancelled request to ui.shadcn.com) rather than generated,
  matching `components.json`'s existing "new-york" style. Column filtering
  (T13, F-106) sits above the matrix as `components/workbook/
WorkbookExplorer.tsx`, which owns the filter state — read from and
  written to the URL (`?axis=...&likelihood=...`) via `columnFilters.ts`,
  never a separate `useState` mirror, so a reload restores it exactly —
  and passes `WorkbookMatrix` a `visibleChannelIds` set to render.
  **Filtering only ever changes which channels render, never their
  colour**: colour scales still come from the full, unfiltered payload
  (SPEC §5.9), and `gridLayout.ts`'s `computeAxisGroupSpans` was changed
  to match each axis group by which channels carry its `axisGroupId`
  rather than by looking up its `startColumn`/`endColumn` letters
  directly, so a group with some (or all) of its columns filtered out
  shrinks its header span (or is omitted) instead of throwing.
- **T14's fidelity/quality gates are real regression tests, not a
  checkbox.** `tests/e2e/structural-fidelity.spec.ts` asserts column
  order, axis-group spans, fills, the collapsed-by-default disclosure and
  its in-place expansion, blank-not-zero cells, and callout-to-anchor-cell
  wiring directly against the `/api/workbook` payload (AC-2) — it re-uses
  `computeAxisGroupSpans`/`buildRoadmapLayout` from the pure layout
  modules rather than re-deriving expected positions by hand, so it stays
  in sync with them automatically. `tests/e2e/accessibility.spec.ts` runs
  an axe scan (`@axe-core/playwright`) on the initial matrix, an expanded
  dimension, and the open channel drawer, in both locales (AC-5).
  `tests/e2e/visual-regression.spec.ts` screenshots the matrix against
  committed baselines (`*-snapshots/`, Linux-rendered — regenerate with
  `npm run e2e -- --update-snapshots tests/e2e/visual-regression.spec.ts`
  on the same platform CI runs on if a deliberate visual change lands).
  `tests/unit/engine/performance.test.ts` times one full render's worth of
  colour-scale + sparkline computation as a regression tripwire against an
  accidental O(n²) blowup — its ceiling is deliberately looser than PRD
  §5.2's strict 16 ms figure, since that budget is stated for a "mid-tier
  laptop," not whatever CI runner happens to be available. This gate
  found real bugs on first run, not just wiring gaps:
  - **Four WCAG AA colour-contrast failures**, all pre-existing and
    invisible without an automated contrast check: the roadmap's "HE"
    untranslated-text badge (`HebrewSourceMark.tsx`) failed against the
    lightest phase-band fill (`#E2F0D9`, 3.99:1) and, once fixed for that,
    failed _again_ against the trigger callout's `#5B9BD5` blue (3.5:1) —
    fixed for good by giving the badge its own solid white background
    instead of a text colour tuned to one ambient fill, since no single
    text colour clears 4.5:1 against every fill it might sit on. The
    trigger callout's own white body text against that same blue was
    2.96:1 — fixed in both places it was duplicated (`Callout.tsx` and,
    separately, `ChannelDrawer.tsx`'s own callout list) by using
    `contrastTextColor` instead of a hardcoded `text-white`, same as
    everywhere else fill-dependent text colour is chosen in this
    codebase. And `lib/color.ts`'s `contrastTextColor` itself had a
    latent bug: its dark option, `#1A1A1A`, is strictly worse than pure
    black, and for the coal axis group's `#7F7F7F` name fill, `#1A1A1A`
    only reached 4.34:1 — short of 4.5:1 even though it was the _better_
    of the two options. Switched `DARK` to `#000000`: pure black paired
    with white is mathematically guaranteed to clear 4.5:1 against any
    background whatsoever (the two ranges where each wins overlap, with
    no gap), so this is a strict improvement with no possible regression.
  - **One structural ARIA defect**: axe's `aria-required-children` rule
    flagged the roadmap section's `role="grid"` as an invalid descendant
    of the matrix's own outer `role="grid"` — a grid's children must be
    `row`s (or a `rowgroup` of them), never another `grid`. The roadmap
    lives inside the same shared scrolling data pane as the matrix
    specifically so its horizontal scroll position stays synced
    automatically (see the doc comment below), so splitting it into a
    separate scroll container to un-nest the two grids would have broken
    that. Fixed instead by treating the roadmap's rows as a continuation
    of the _same_ accessible grid — its `aria-rowindex` continues from
    `allRows.length`, its `aria-colindex` shifts by one to match the
    matrix's "column 1 = the label column" convention, and its own
    `role="grid"`/`aria-label`/`aria-rowcount`/`aria-colcount` were
    removed rather than duplicated. Separately, axe's
    `aria-required-parent` rule flagged every `rowheader`/`gridcell`/
    `columnheader` in both the label pane and the CSS-Grid-positioned data
    panes for having no `role="row"` ancestor at all (the two-pane split
    below never had one). Fixed by wrapping each row's cells in a
    `role="row"` element — plain in the label pane's normal document
    flow, `style={{ display: "contents" }}` in the CSS-Grid data panes so
    the wrapper contributes no layout of its own and each cell's
    `gridColumn`/`gridRow` positioning is unaffected. If a third grid-like
    section is ever added to this matrix, give it the same treatment
    rather than its own nested `role="grid"`.
- **The Trilemma total row (OQ-16) and the scores/charts/roadmap
  visibility selectors.** Row 37 (טרילמה) is blank in the source workbook
  but SPEC §6.3/OQ-16 documents it as a planned composite — "if wanted,
  the mean of the three dimension averages" — and it still carries its
  own colour-scale rule in the file. `scripts/ingest/colorScaleRules.ts`
  now captures that rule (`TrilemmaColorScale`: ranges/low/mid/high/
  midPercentile, no `dimension` field, since it isn't one of the three)
  instead of discarding it as a pure anomaly; `lib/schemas/workbook.ts`
  and a dedicated singleton `lib/db/schema.ts` table
  (`trilemma_color_scale`, `id` always `0`) carry it through the payload
  as `trilemmaColorScale`, nullable if a future workbook drops the rule.
  `components/workbook/scoreRows.ts`'s `computeTrilemmaScores` computes
  the composite by reusing `dimensionAverage` on `[security, environment,
equity]` per channel — exact same blank-safe semantics as every other
  average, never a bespoke one — and colours it with `buildColorScale`
  over real cell references (`${columnLetter}37`), the same range-relative
  pattern `buildDimensionColorScales` already uses, so it never invents a
  scale. `WorkbookMatrix.tsx` renders it as one more `ContentRow` directly
  after equity's sparkline row (row 37's real position), gated by the same
  `showScores` prop that gates the three dimension score rows themselves.
  Alongside it, `FilterToolbar.tsx` gained a "Show:" group toggling three
  independent selectors — Trilemma scores, Trilemma charts (the sparkline
  rows), and the roadmap section — via `sectionVisibility.ts`, the same
  additive URL-synced pattern as `columnFilters.ts`'s column filters
  (`?hide=scores,charts,roadmap`; an absent/empty param means everything
  shown, matching the workbook's own default view). Both filter
  dimensions live in the _same_ URL, so `WorkbookExplorer.tsx`'s
  `applyState` merges their serialized params into one `URLSearchParams`
  rather than letting a change to one clobber the other. **Hiding scores
  and hiding charts are independent, but the row list they both feed is
  interleaved per dimension** (`WorkbookMatrix.tsx`'s `contentRows`
  builder): scores hidden but charts shown still needs a sparkline row per
  dimension, derived by iterating `DIMENSIONS` directly rather than via
  `scoreBlockRows` (which is empty when scores are hidden) — don't
  collapse that into a single loop keyed off `row.kind === "score"` again,
  or hiding scores silently hides charts too.
- **A second, standalone view: the by-channel (transposed) table**
  (`/by-channel`, `components/channel-matrix/`) — channels as rows instead
  of columns, requested after Phase 1 shipped. Not a replacement for the
  main matrix (both routes exist, linked from each other's header); it
  reuses the main matrix's own domain logic (`scoreRows.ts`'s colour
  scales, `roadmapRows.ts`'s layout, `resolveFreeText`) rather than
  re-deriving any of it. See `components/channel-matrix/README.md` and
  `ChannelMatrix.tsx`'s doc comment for the layout decisions (plain
  `<table>`, per-dimension score-vs-metric-trajectory column split,
  inline callouts instead of an overflowing overlay).
- **`position: sticky` did not work for the label column inside the wide
  CSS Grid** (tested in both RTL and LTR — the column scrolled away with
  the rest of the content instead of pinning). `WorkbookMatrix.tsx` uses a
  fixed label pane next to an independently-scrolling data pane instead;
  see its doc comment before reintroducing a sticky-column approach. That
  failure was specific to the CSS Grid architecture, not to `position:
sticky` itself: `components/channel-matrix/ChannelMatrix.tsx` (the
  by-channel transposed view) uses a real `<table>` with `position:
sticky` on its first column's `<th>`/`<td>` cells, inside a plain
  `overflow-x-auto` wrapper, and it works correctly — verified with a
  Playwright scroll test before relying on it, not assumed from this note.
  A real `<table>` also sidesteps the whole pane-sync problem below: one
  shared row per `<tr>` means the browser's own table layout keeps a
  pinned first column's row heights in sync with the rest of the row for
  free, with no measurement needed. Reach for a `<table>` over the
  CSS-Grid two-pane pattern whenever the content is naturally row-per-item
  (few, unbounded-height rows) rather than needing virtualization.
- **Keeping two independently-rendered panes pixel-synced with variable-length
  content needs real measurement, not a nominal constant.** The roadmap's
  label-pane blocks (phase/sub-group columns) and its data-pane cells are two
  separate DOM/grid trees (same split as the fixed/scrolling pane pattern
  above), so nothing in CSS lets one side's auto-sized row tracks drive the
  other's sizing. A first fix pass tried pinning both sides to a shared
  nominal per-row-kind constant via `blockSize` + `minBlockSize: 0` (the
  latter needed because grid/flex items default to an automatic minimum size,
  `min-height: auto`, driven by content's own intrinsic size, which
  `minBlockSize` alone — a minimum, not a fixed size — doesn't override).
  That kept the two panes aligned, but real roadmap free text varies far more
  than any fixed constant can predict (a one-line target next to a
  multi-paragraph step card with a bolded "אתגרים:" line), so a cell whose
  content needed more room than the constant was clipped mid-sentence by the
  `overflow-hidden` the fixed size required — a real regression caught
  against the live matrix (via a screenshot, then confirmed and root-caused
  with a scripted per-row height/overlap check, not by inspection). The
  actual fix: let the data-pane cells size naturally (`minBlockSize` only, no
  `overflow-hidden`, same pattern the main matrix's rows already use — a
  floor, not a cap), so within the data pane's own CSS Grid, all columns in a
  row already auto-align to the tallest cell for free. Each data cell carries
  `data-roadmap-row={rowIndex}`; a `useLayoutEffect` + `ResizeObserver` on the
  data pane (see `WorkbookMatrix.tsx`'s `roadmapDataGridRef` effect) measures
  every row's real rendered height from those cells and republishes it as
  state, which the label pane's blocks then use as their authoritative
  `blockSize` + `minBlockSize: 0`. The nominal constants
  (`ROADMAP_TARGET_ROW_HEIGHT`/`ROADMAP_STEP_ROW_HEIGHT`) still exist, but
  only as the initial-paint fallback before the first measurement lands, not
  as the source of truth. `overflow-hidden` still belongs only on a wrapper
  that should own a clip, never on a cell with an intentionally-overflowing
  child like T11's callouts (SPEC §5.8). **The same fix applies to the main
  matrix's rows (1–39), not just the roadmap** — they had the identical
  latent bug all along (`minBlockSize` on both panes, sourced from the same
  nominal `heightPt`-derived value), just invisible until the roadmap
  section was appended below them: the label pane's row-header cells render
  at `text-xs` and the data pane's cells at `text-sm`, a taller natural
  line-height with nothing to do with actual text length, so the data side
  came out a few pixels taller than the label side on literally every row,
  compounding down the page into a large drift by the time the roadmap
  section started. Fixed the same way — `matrixDataGridRef` +
  `data-matrix-row` + a `useLayoutEffect`/`ResizeObserver` measuring the
  data pane's real per-row heights, which the label pane's row cells then
  use for their `blockSize` + `minBlockSize: 0` — rather than trusting two
  differently-styled independently-rendered panes to agree on a shared
  nominal number. If a third independently-rendered pane pair shows the
  same symptom, measure it the same way; don't reach for a nominal constant
  shared between panes again.
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
