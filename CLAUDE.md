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
npm run format:check && npm run build`. All five are required in CI
  (`.github/workflows/ci.yml`); don't push something that fails one.
- Follow DEV-PLAN's dependency order (T1 → T2/T3 → T4 → T5 → T6 → T7 → T8–T13
  in parallel → T14 continuously). T1–T13 are done — all of Phase 1 except
  T14's fidelity/quality gates. Real workbook data is
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
- **`position: sticky` did not work for the label column inside the wide
  CSS Grid** (tested in both RTL and LTR — the column scrolled away with
  the rest of the content instead of pinning). `WorkbookMatrix.tsx` uses a
  fixed label pane next to an independently-scrolling data pane instead;
  see its doc comment before reintroducing a sticky-column approach.
- **Keeping two independently-rendered panes pixel-synced needs
  `blockSize` + `minBlockSize: 0`, not `minBlockSize` alone.** The
  roadmap's label-pane blocks (phase/sub-group columns) and its
  data-pane cells share nominal per-row height constants so their
  independently-rendered DOM trees line up (same pattern as the
  fixed/scrolling pane split above). `minBlockSize` alone doesn't pin
  that: it's a minimum, and CSS grid/flex items have a default automatic
  minimum size (`min-height: auto`) driven by content's own intrinsic
  size, so a cell whose text happened to wrap further than usual would
  silently grow past its nominal height on one side only, desyncing
  every row after it — a real bug reported against the live matrix and
  root-caused by a scripted per-row height measurement, not by
  inspection. Use `blockSize` for the nominal height and explicitly set
  `minBlockSize: 0` alongside it to cancel that default; if content then
  needs to be prevented from visibly overflowing, clip it with
  `overflow-hidden` on the innermost wrapper that should own the clip —
  never on a cell that has an intentionally-overflowing child, like
  T11's callouts (SPEC §5.8), or clipping cancels the overflow.
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
