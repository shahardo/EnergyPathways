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
- Score rows, sub-score disclosure, sparklines, likelihood/barriers,
  roadmap, callouts, the detail drawer and column filtering (T8–T13) are
  not yet implemented.
