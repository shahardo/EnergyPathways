# `components/channel-matrix/`

The by-channel (transposed) view: one row per generation path/channel
instead of one column. A second, standalone view alongside
`components/workbook/`'s matrix, not a replacement for it — see
[docs/DEV-PLAN.md](../../docs/DEV-PLAN.md) for the main matrix's own task
breakdown; this view was added after Phase 1 completed.

- `channelMatrixColumns.ts` — pure column-group structure: one group per
  dimension (its score, then its trajectory metric's four milestone
  years), Trilemma/Likelihood/Barriers, then one group per roadmap phase
  with that phase's target/step/impact slots as columns. No
  labels/colours/formatting — same split as `../workbook/roadmapRows.ts`'s
  `buildRoadmapLayout` and `../workbook/gridLayout.ts`'s axis-group spans;
  `ChannelMatrix.tsx` looks up display text and fills per column. Takes an
  already-built `RoadmapLayout` rather than raw `phaseBands`, so the
  roadmap structure is computed once and shared with the callout-anchor
  resolution that also needs it. Unit-tested in
  `tests/unit/channel-matrix/channelMatrixColumns.test.ts`.
- `ChannelMatrix.tsx` — the rendering component. Reuses the main matrix's
  domain logic directly (`buildDimensionColorScales`/`computeTrilemmaScores`
  from `../workbook/scoreRows.ts`, `buildRoadmapLayout`/`indexRoadmapItems`/
  `parseCellRef`/`roadmapItemKey` from `../workbook/roadmapRows.ts`,
  `trajectoryValuesForChannel` from `../workbook/sparklineRows.ts`,
  `resolveFreeText`) rather than re-deriving any of it, so a colour or a
  translation fallback can never drift between the two views. Deliberately
  a plain semantic `<table>`, not the main matrix's CSS-Grid two-pane
  split — read its top doc comment before changing the pinned-column
  approach: with channels as rows there are only 17 of them, so a real
  `<table>` gives the pinned first column (channel name, `position:
sticky`) correct row-height agreement with the rest of its row for
  free (native table row layout, not two independently-rendered DOM
  trees), sidestepping the whole class of pane-sync bug the main matrix
  had to solve by hand (see `WorkbookMatrix.tsx`'s doc comment and
  CLAUDE.md's "pane sync needs real measurement" entry). Verified directly
  in the browser (a Playwright scroll test) that `position: sticky` does
  work here, despite CLAUDE.md's note that it failed inside the main
  matrix's wide CSS Grid — that failure was specific to the Grid
  architecture, not sticky positioning in general.
  - A dimension's score column has no per-year sub-columns: the workbook
    scores a channel once, not per year. Only the associated trajectory
    _metric_ (generation/emissions/price impact) is time-series data, so
    that's what the four milestone-year columns show, clearly labelled
    apart from the score column itself.
  - Trigger callouts render as an inline note inside their roadmap-slot
    cell, not an overflowing absolutely-positioned overlay like the main
    matrix's `Callout.tsx`: the workbook's "overflow toward the next
    phase" (SPEC §5.8) reads naturally when phases are vertical row-bands,
    but here phases are column-groups, so replicating it would need a
    direction-aware (RTL-mirrored) transform per callout — not worth the
    risk for a handful of callouts when an inline note is just as clear.
  - A group with a single column (Potential/Trilemma/Likelihood/Barriers)
    leaves its own sub-header cell visually blank (the group header above
    already names it), but still gives that `<th>` a visually-hidden
    (`sr-only`) copy of the group's label — an empty header cell has no
    screen-reader-discernible text (axe's `empty-table-header` rule).
  - The `overflow-x-auto` wrapper around the table carries `tabIndex={0}`
    - `role="region"` + `aria-label`, so the horizontally-scrollable
      region is keyboard-reachable (axe's `scrollable-region-focusable`
      rule) — this table is wide enough to overflow at any reasonable
      viewport width, unlike the main matrix's own scroller, which doesn't
      always overflow depending on viewport.
  - A roadmap phase id like `"2025-2030"` is wrapped in `<span dir="ltr">`
    before rendering: it's two Latin numeric runs joined by a dash, and
    inside the surrounding Hebrew (RTL) flow the bidi algorithm visually
    swaps them (`"2030–2025"`) without that isolation — the same class of
    bug CLAUDE.md documents for the main matrix's potential row, caught
    here by an actual screenshot, not by inspection.
