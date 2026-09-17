# Development Plan

## Israel Energy Pathways 2050 — Phase 1 (Foundation)

| | |
| --- | --- |
| **Status** | Ready to execute |
| **Companions** | [PRD.md](PRD.md) — scope · [SPEC.md](SPEC.md) — normative technical spec |
| **Phase 1 goal** | The data is in, the model is correct and proven against the workbook, and the Supply Pathways Explorer works in both languages. No scenario building yet — that is Phase 2. |

Tasks are ordered by dependency and sized to be individually shippable. Each has explicit acceptance criteria. "Done" means: acceptance criteria met, tests written, CI green.

---

## Dependency order

```
T1 scaffold ──┬── T2 i18n/RTL shell ──────────────────┬── T7 matrix (F-101) ── T8 detail (F-102)
              │                                        │
              └── T3 types/schemas ── T4 data layer ───┴── T6 engine ── T9 KPI shell
                                   └── T5 ingestion ───────┘
                                                                         T10 CI gates (continuous)
```

**T5 is the critical path** and depends on an external deliverable (the workbook). T1–T4 and T6's structure do not — start them immediately and let T5 land in parallel.

---

## T1 — Project scaffold

Next.js 15 (App Router) · TypeScript strict · Tailwind · shadcn/ui · Vitest · ESLint + Prettier.

```
app/[locale]/…            routes
lib/engine/               pure calculation engine (SPEC §4)
lib/db/                   Drizzle schema + client
lib/i18n/                 i18next config + catalogues
components/               UI
scripts/                  ingest-xlsx.ts and friends
db/                       reference.sqlite, snapshot.json, ingest-report.md
docs/                     PRD · SPEC · DEV-PLAN · glossary.he.md
```

- `strict: true`, plus `noUncheckedIndexedAccess` — the engine indexes records by channel id constantly and a silent `undefined` there becomes a `NaN` in a policy figure.
- ESLint rule banning physical CSS direction properties (`left`, `right`, `margin-left`, `text-align: left`, and the Tailwind `ml-`/`mr-`/`pl-`/`pr-`/`left-`/`right-` utilities) in favour of logical equivalents. Adding this at T1 rather than after the UI exists is the whole difference in RTL cost (SPEC §7).
- `.gitignore`: `node_modules`, `.next`, `*.sqlite`. **`db/snapshot.json` and `db/ingest-report.md` are committed** (SPEC §5.3).
- CI (GitHub Actions): typecheck · lint · test · build on every push.

**Acceptance:** `npm run dev` serves a page; `npm run typecheck && npm run lint && npm run test && npm run build` all pass; CI green on a trial PR; the direction-property lint rule fails on a deliberate `margin-left`.

---

## T2 — i18n and RTL foundation

Before any UI. Retrofitting bidirectionality is the expensive order of operations.

- i18next + `react-i18next`; `/he` (default) and `/en`; middleware redirect from `/`.
- Root layout sets `lang` and `dir` from the locale param; `dir` set nowhere else.
- Catalogues `lib/i18n/locales/{he,en}/common.json`; keys `module.feature.element`.
- `useFormat()` wrapping `Intl.NumberFormat` for numbers, percentages and units, per SPEC §7 (Western Arabic numerals in both locales; Latin unit symbols in both).
- Language switcher preserving the current route and query string — a shared scenario permalink must survive a language change.
- `docs/glossary.he.md` seeded with the domain terms already in the PRD, marked "awaiting domain-lead review". Engineering does not invent Hebrew terminology for regulated energy concepts.

**Acceptance:** both locales render; `/he` is RTL and `/en` LTR with no mirrored-layout defects on the shell; the switcher preserves path and query; a key missing from either catalogue fails CI.

---

## T3 — Domain types and validation schemas

Transcribe SPEC §2 and §3.1 into `lib/types/` as TypeScript types with Zod schemas as the single source of truth (`z.infer` for the types — no hand-written duplicates to drift).

- `SupplyChannel`, `StorageAsset`, `DemandSector`, `TrilemmaScores`, `Scenario`, `EngineConfig`, `ScenarioResult`.
- Range constraints encoded in the schemas: fractions in `[0,1]`, Trilemma sub-scores integers in `[1,5]`, `efficiency_offset` in `[0, 0.20]`.
- `lib/engine/config.ts` with every OQ default from SPEC, each annotated with its OQ number and its working-assumption status.

**Acceptance:** schemas reject out-of-range values in unit tests; `EngineConfig` defaults match SPEC exactly; every OQ default is traceable to its open question in a code comment.

---

## T4 — Data layer

Drizzle schema per SPEC §5.2 over `better-sqlite3`, Postgres-portable.

- Migrations via `drizzle-kit`.
- Typed query helpers: `getDataset()`, `getChannel(id)`, `getPresets()`, `getDatasetMeta()`.
- Bilingual fields as column pairs, never JSON blobs, so a missing Hebrew string is a `NULL` CI can catch.
- `source_ref` non-null on every content table (NFR-6).

**Acceptance:** migrations run clean from empty; helpers typed end-to-end with no `any`; a seeded fixture database round-trips through every helper in tests.

---

## T5 — Ingestion pipeline ⚠ external dependency

`scripts/ingest-xlsx.ts` per SPEC §5.3. **Blocked on the client delivering `Israel 2050 Pathways 06092026.xlsx`.**

Work that proceeds without it: the pipeline skeleton, Zod validation layer, reconciliation logic, report generator, and a small hand-built fixture workbook committed for tests.

- Explicit committed column map (workbook column → domain field). Never positional indexing — a column inserted in the source must fail loudly, not silently shift every value one field to the left.
- Validation: types, ranges, Trilemma score orientation (5 = best; a silently inverted `import_dependency` flips the security axis of every chart), required fields, referential integrity.
- Reconciliation: unit normalization to SPEC §1.1; efficiency/DSM rows routed to the demand side; storage rows routed to `storage_assets` (SPEC §2.2).
- Outputs: `db/reference.sqlite`, `db/snapshot.json` (committed — the diffable record of what the numbers are), `db/ingest-report.md` (committed).
- **Fails closed.** Any validation error aborts; no partial database is written.

**This task answers OQ-6 empirically** — the actual channel count, and whether the workbook treats efficiency as supply or demand. Report the finding; do not assume 17.

**Acceptance:** ingestion of the real workbook completes with a report listing every coercion and warning; deliberately malformed fixture rows abort the run with a precise message; `snapshot.json` diffs readably against a modified fixture; the resolved channel list is recorded in the report and reconciled against PRD §3.1.

---

## T6 — Calculation engine

SPEC §4, module by module, each with unit tests before the next begins: `demand` → `generation` → `balance` → `emissions` → `curtailment` → `cost` → `reliability` → `trilemma` → `index`.

Non-negotiable properties:

- **Pure.** No I/O, no `Date`, no randomness, no React import anywhere under `lib/engine/`. Enforced by a lint rule on the directory.
- **One implementation.** Imported directly by the client and by `/api/scenario/evaluate`. Never reimplemented (PRD §5.1).
- **Degenerate cases return `null`, not `NaN`.** Empty scenario, zero generation, zero demand (SPEC §1.3).
- **`warnings` populated**, not stubbed: capacity over ceiling, curtailment proxy active, missing cost data (SPEC §4.9).
- **Merit-order utilization (SPEC §3.3) is part of this task, not a later optimization.** Without it a solar-heavy scenario reports a phantom surplus from gas plants that would not be running, and every derived figure — LCOE, emissions, ΔE — is wrong.
- **The methane double-count guard (SPEC §4.3)** — methane term applies only to `combustion`-basis channels — has an explicit test.

**Acceptance:** full unit coverage of §4 including degenerate cases; the parity test (T6b) passes; compute ≤16 ms for a full scenario; property tests hold (adding zero-carbon capacity never raises emissions; raising efficiency never raises net demand).

### T6b — Parity harness (AC-1)

Golden fixtures extracted from the workbook's baseline scenario. Asserts generation, ΔE, emissions and LCOE within ±0.5% per milestone year. Regenerated only by an explicit script run — auto-regeneration would defeat the purpose, which is to break when the engine drifts.

Expect the first run to fail. Each discrepancy is triaged as: engine bug, workbook column misread, or a genuine methodological difference introduced by SPEC (T&D losses, CAPEX annualization, merit order — all of which are *intended* to differ from a naive reading of the v1.0 PRD). **Log the third category in `docs/parity-notes.md` rather than bending the engine to reproduce a formula SPEC deliberately corrected.**

---

## T7 — F-101 Supply Pathways matrix

- Table of all channels: name, axis, capacity ceiling, capacity factor, carbon intensity, LCOE inputs, Trilemma dimension scores, feasibility.
- Sort on any column; filter by axis, feasibility and Trilemma score ranges.
- URL-synced filter state (shareable views).
- Responsive to tablet width; horizontal scroll contained to the table, never the page.
- Column headers and cell values fully localized; numeric formatting via `useFormat()`.
- Accessible table semantics: proper headers, sort state announced, full keyboard operation.

**Acceptance:** all channels render from the database; sort and filter correct in both locales; RTL column order mirrors correctly while numeric values do not; axe scan clean; filter state survives a page reload.

---

## T8 — F-102 Pathway detail sheet

- Drawer per channel (shadcn `Sheet`), keyboard and screen-reader accessible, focus trapped and restored.
- Recharts radar of the three Trilemma dimension means (SPEC §4.8), with an accessible table equivalent (NFR-2).
- Roadmap timeline across 2025–2030 / 2030–2040 / 2040–2050: milestones, legislative steps, TRL, environmental impact.
- Bottlenecks and grid-integration notes.
- **Provenance panel** — `source_ref` and `dataset_version` for every displayed figure (NFR-6).

**Acceptance:** drawer opens from any matrix row; radar renders correctly in RTL; the accessible table matches the chart values; provenance shown for every figure; full keyboard operation with correct focus restoration.

---

## T9 — KPI scorecard shell

Wires T6 to the UI ahead of Module 3, so the engine is exercised end-to-end within Phase 1.

- Four cards: balance status (ΔE), net emissions, system LCOE with tariff band, reliability index.
- Fed by a default scenario loaded from presets.
- Semantic states per PRD §6; **status never carried by colour alone**.
- The tariff card carries its mandatory "directional, not a tariff forecast" qualifier (SPEC §4.7) — this is an acceptance criterion, not copy to be trimmed.
- The reliability card shows its three sub-scores alongside the composite (SPEC §4.6).
- `warnings` from `ScenarioResult` surfaced, not swallowed.

**Acceptance:** cards reflect engine output for the default scenario; changing the preset changes the cards; qualifier and sub-scores present; warnings visible; axe clean in both locales.

---

## T10 — CI quality gates

Added incrementally as the relevant surface appears.

| Gate | Asserts |
| :--- | :--- |
| Typecheck · lint · test · build | T1 |
| i18n key parity | NFR-8 |
| Direction-property lint | SPEC §7 |
| Engine purity lint | No React/I/O under `lib/engine/` |
| axe accessibility scan, both locales | AC-5 |
| Engine performance budget (≤16 ms) | NFR-1 |
| Parity test | AC-1 |
| RTL visual regression | AC-4 |

**Acceptance:** all gates run on every PR; each has a deliberate-failure test proving it actually fails.

---

## Definition of done for Phase 1

- [ ] Workbook ingested; `snapshot.json` and `ingest-report.md` committed; OQ-6 answered from the data
- [ ] Engine complete per SPEC §4, fully unit-tested, parity within ±0.5% (AC-1) with any intended deviations documented in `parity-notes.md`
- [ ] F-101 and F-102 working in Hebrew (RTL) and English (LTR)
- [ ] KPI shell rendering live engine output
- [ ] All CI gates green
- [ ] Open questions OQ-1 … OQ-10 either answered and encoded, or still visibly flagged in-product as working assumptions

---

## Phases 2–4

Held at PRD altitude. Detailing them now would be writing against decisions the data and the v1 engine have not yet informed — and Phase 3 in particular exists to *replace* v1's proxies, so its design depends on what those proxies get wrong.

- **Phase 2 — Demand & Mix.** F-201/202/203 demand profiling; F-301 supply sliders; F-302 live balance and alerts; F-303 presets. AC-6 usability testing runs at the end of this phase, once a scenario can actually be built.
- **Phase 3 — Analytics.** Hourly dispatch replacing the §4.4 curtailment proxy and the §4.6 firm-capacity treatment; real grid-upgrade cost modelling; GHG and methane gauges; F-304 side-by-side comparison. Moves the heavy engine server-side while the client keeps the annual engine for optimistic feedback.
- **Phase 4 — Policy tools.** Permalink storage at scale; PDF executive summaries; Monte-Carlo sensitivity over the OQ parameters (which is precisely why they were centralized in `config.ts`); public research API — the point at which SQLite likely gives way to Postgres.

---

## Risks

| Risk | Handling |
| :--- | :--- |
| Workbook arrives late or is structurally unlike the assumed schema | T1–T4 and T6 structure proceed against the fixture workbook; T5's column map is the only piece requiring the real file. Escalate if it slips past T4's completion. |
| Parity test cannot reach ±0.5% because SPEC deliberately corrected the model | Expected. Triage per T6b; document intended deviations rather than reintroducing the dimensional error in the v1.0 LCOE formula. |
| Curtailment proxy `α` proves uncalibratable (OQ-10) | Ship it labelled as an editorial assumption and surfaced as an adjustable parameter; Phase 3 replaces it. Do not present a proxy figure as a computed result. |
| Hebrew terminology blocks UI work | Glossary seeded at T2 and sent for domain-lead review early; English-first strings with Hebrew keys present but flagged is an acceptable temporary state — a missing key is not. |
| Outputs quoted as forecasts | The qualifiers in PRD §1.4, SPEC §4.7 and T9 are acceptance criteria. They do not get trimmed for visual polish. |
