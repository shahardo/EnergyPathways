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
  matrix's horizontal scroll position for free.
- `HebrewSourceMark.tsx` — the "HE" marker for free text shown in Hebrew
  while viewing in English (no approved translation yet, OQ-11); paired
  with `lib/i18n/freeText.ts`'s `resolveFreeText()`.
- Trigger callouts, the detail drawer and column filtering (T11–T13) are
  not yet implemented.
