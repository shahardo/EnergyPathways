# `components/workbook/`

Matrix, row, sparkline, roadmap and callout components for the F-101–F-106
workbook view. See [docs/DEV-PLAN.md](../../docs/DEV-PLAN.md) for the task
breakdown and [docs/SPEC.md §5](../../docs/SPEC.md#5-workbook-presentation-format)
for the presentation format each component must reproduce.

- `WorkbookMatrix.tsx` (T7) — the grid skeleton: label pane, 17 channel
  columns, rows 1–3 (axis header / channel name / potential). Read its top
  doc comment before touching the label column's positioning — a
  `position: sticky` column inside the CSS Grid didn't stay stuck under
  horizontal scroll in testing (both RTL and LTR); it's a fixed pane next
  to an independently-scrolling data pane instead.
- `gridLayout.ts` — pure layout helpers (axis-group grid-column spans, row
  height/offset metrics from `heightPt`), unit-tested in
  `tests/unit/workbook/gridLayout.test.ts`.
- `scoreRows.ts` (T8) — score/sub-score row disclosure order and per-column
  colour-scale lookup, pure and unit-tested.
- `sparklineRows.ts` (T9) + `Sparkline.tsx` — always-visible per-channel
  trajectory row below each score row, geometry from `lib/engine/workbook`'s
  `sparklinePath`.
- `roadmapRows.ts` (T10) — derives the roadmap's flat row list plus phase
  and sub-group row-spans from ingested `phaseBands`, so `WorkbookMatrix.tsx`
  doesn't hard-code workbook row numbers a second time; unit-tested in
  `tests/unit/workbook/roadmapRows.test.ts`. Rendered in the same fixed
  label pane / scrolling data pane as the matrix above it (see
  `WorkbookMatrix.tsx`'s roadmap section), so the phase/sub-group columns
  stay pinned at the inline-start edge and the step-card grid shares the
  matrix's horizontal scroll position for free. Also exports
  `rowNumberToSlot` and `parseCellRef()`, which T11's callouts use to
  resolve an `anchorCell` (e.g. `G53`) to the roadmap slot it attaches to.
- `HebrewSourceMark.tsx` — the "HE" marker for free text shown in Hebrew
  while viewing in English (no approved translation yet, OQ-11); paired
  with `lib/i18n/freeText.ts`'s `resolveFreeText()`.
- `Callout.tsx` (T11) — the F-104 trigger callout: a `role="note"` box
  rendered as an absolutely-positioned overlay on its anchor cell's
  roadmap grid cell (`WorkbookMatrix.tsx` looks the anchor up via
  `roadmapRows.ts`'s row→slot map, not a second hard-coded lookup),
  overflowing toward the next phase's boundary rather than floating free
  of the grid; the anchor cell's `aria-describedby` references it.
- `ChannelDrawer.tsx` (T12, F-105) — opens from the channel-name cell
  (`WorkbookMatrix.tsx` wires the click/Enter handler and an
  `onActivate`-carrying `DataCell` variant to trigger it). Radar +
  trajectory charts are Recharts; the panel itself is `components/ui/sheet.tsx`
  (Radix `Dialog`). Read its top doc comment before changing how it's
  mounted: `<Sheet>`/`<SheetContent>` must stay rendered continuously with
  `open` toggling visibility, not be conditionally omitted from the tree
  when no channel is selected -- doing that breaks Radix's close-animation
  and focus-restore timing (confirmed with a Playwright check of
  `document.activeElement`). Because the trigger is a plain grid cell, not
  a `<Dialog.Trigger>`, focus restoration on close is wired by hand via
  `SheetContent`'s `onCloseAutoFocus` and a ref the matrix passes down,
  rather than relying on Radix's default trigger-tracking.
- Column filtering (T13) is not yet implemented.
