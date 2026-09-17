# `lib/engine/`

The one calculation engine (PRD §5), pure TypeScript only: no I/O, no `Date`,
no randomness, no React and no `fs` imports — enforced by the
`no-restricted-imports` ESLint rule scoped to this directory.

- `workbook/` — Phase 1 workbook model (DEV-PLAN T6):
  - `recovery.ts` ✅ — `computeRamp`/`recoverParameters`/`verifyTrajectories`
    (SPEC §3.5). Shared verbatim with `scripts/ingest/` (T5), which calls
    these to populate `channels.cf`/`ci_g_per_kwh`/`params_recovered`.
  - Dimension averages, the colour-scale function and sparkline path
    generation are not yet implemented.
- Phase 2 adds the scenario engine (SPEC §4) alongside it.
