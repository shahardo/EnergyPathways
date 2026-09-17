# `lib/engine/`

The one calculation engine (PRD §5), pure TypeScript only: no I/O, no `Date`,
no randomness, no React and no `fs` imports — enforced by the
`no-restricted-imports` ESLint rule scoped to this directory.

- `workbook/` — Phase 1 workbook model (DEV-PLAN T6), all implemented:
  - `recovery.ts` — `computeRamp`/`recoverParameters`/`verifyTrajectories`
    (SPEC §3.5). Shared verbatim with `scripts/ingest/` (T5), which calls
    these to populate `channels.cf`/`ci_g_per_kwh`/`params_recovered`.
  - `dimensionAverage.ts` — SPEC §3.1 blank semantics
    (`IFERROR(AVERAGE(...),"")`).
  - `colorScale.ts` — the Excel three-colour scale (SPEC §5.4): builds a
    `cellRef -> hex` lookup from a rule's full ranges (`expandRange` is
    exported for callers, e.g. the T6b fixture generator, that need to
    enumerate a rule's cells). `PERCENTILE.INC`-exact, range-relative —
    verified against the real workbook in
    `tests/unit/engine/parity.test.ts` (T6b).
  - `sparklinePath.ts` — filled-area SVG path on a shared fixed axis with
    four equally spaced category points (SPEC §5.5); `areaPath: null` when
    every value is blank.
- Phase 2 adds the scenario engine (SPEC §4) alongside it.
