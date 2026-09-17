# `lib/engine/`

The one calculation engine (PRD §5), pure TypeScript only: no I/O, no `Date`,
no randomness, no React and no `fs` imports — enforced by the
`no-restricted-imports` ESLint rule scoped to this directory.

- `workbook/` — Phase 1 workbook model (DEV-PLAN T6): dimension averages,
  colour scale, parameter recovery/verification, sparkline path generation.
- Phase 2 adds the scenario engine (SPEC §4) alongside it.

Not yet implemented.
