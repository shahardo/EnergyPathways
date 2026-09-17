# Development Plan

## Israel Energy Pathways 2050 — Phase 1 (Workbook View)

| | |
| --- | --- |
| **Status** | Ready to execute — no external blockers |
| **Companions** | [PRD.md](PRD.md) — scope · [SPEC.md](SPEC.md) — normative spec |
| **Phase 1 goal** | The workbook, rendered on the web so faithfully that someone who knows the spreadsheet recognizes it at a glance — ingested from the file, verified against it, navigable in Hebrew and English, with what the workbook hides one click away. |

Tasks are ordered by dependency and individually shippable. "Done" means acceptance criteria met, tests written, CI green.

---

## Dependency order

```
T1 scaffold ─┬─ T2 i18n/RTL ────────────────────────────┐
             │                                           ▼
             └─ T3 types ─ T4 data layer ─ T5 ingestion ─ T6 workbook model
                                                          │
                                   T7 grid skeleton ◄─────┘
                                     ├─ T8 score rows + colour scale
                                     ├─ T9 sparkline rows
                                     ├─ T10 likelihood, barriers, roadmap ─ T11 callouts
                                     ├─ T12 detail drawer
                                     └─ T13 column filtering
                                                  T14 fidelity gates (continuous)
```

**The critical path is T5 → T6 → T7.** The workbook is in the repo, so nothing is externally blocked. T8–T13 parallelize once T7 lands.

**Before T1:** save the reference screenshot of the workbook as `docs/reference/workbook-he.png` at the workbook's 70% zoom. It is the visual baseline for T14 and the domain lead's sign-off.

---

## T1 — Project scaffold

Next.js 15 (App Router) · TypeScript strict + `noUncheckedIndexedAccess` · Tailwind · shadcn/ui · Vitest · Playwright · ESLint + Prettier.

```
app/[locale]/             routes
components/workbook/      matrix, rows, sparkline, roadmap, callout
lib/engine/               pure: workbook model (Ph. 1), scenario engine (Ph. 2)
lib/db/                   Drizzle schema + queries
lib/i18n/                 i18next config + catalogues
scripts/                  ingest-workbook.ts
db/                       snapshot.json + ingest-report.md (committed), reference.sqlite (ignored)
docs/                     PRD · SPEC · DEV-PLAN · workbook · reference/
```

- Lint rule banning physical direction CSS (`left`/`right`, `ml-`/`mr-`/`pl-`/`pr-`) in favour of logical properties. The matrix's RTL fidelity depends on it, and it is far cheaper to enforce from the first commit.
- Lint rule forbidding React, `fs` and `Date` imports under `lib/engine/`.
- CI: typecheck · lint · unit · build on every push.

**Acceptance:** all scripts pass; CI green; both lint rules fail on deliberate violations.

---

## T2 — i18n and RTL foundation

- i18next; `/he` default, `/en`; middleware redirect from `/`.
- Root layout sets `lang` and `dir`; nowhere else sets `dir`.
- `useFormat()`: one-decimal scores, thousands-separated MW, Western Arabic numerals in both locales.
- Language switcher preserving path and query.
- Catalogue holds UI chrome only. Row labels, axis and channel names come from the database (SPEC §8).

**Acceptance:** `/he` renders RTL and `/en` LTR; the switcher preserves state; a missing catalogue key fails CI.

---

## T3 — Types and schemas

Zod schemas as the single source of truth (`z.infer` for types) for SPEC §6.2: channels, sub-scores, averages, trajectories, channel text, roadmap items, callouts, ramp, and the layout metadata (axis groups, row labels, colour-scale rules, sparkline specs, phase bands). Plus `WorkbookPayload` — the `/api/workbook` response the whole matrix renders from.

- Nullable wherever the workbook can be blank. `null` is a first-class value, not an error.
- Score values constrained to 1–5; likelihood to its vocabulary plus `-`.

**Acceptance:** schemas reject out-of-range scores and unknown likelihood values; accept every blank the current workbook contains.

---

## T4 — Data layer

Drizzle schema for SPEC §6.2 over `better-sqlite3`, Postgres-portable. Query `getWorkbookPayload()` assembling the full payload in one read, and `getChannel(id)`.

**Acceptance:** migrations run clean; payload round-trips through the schemas with no `any`.

---

## T5 — Workbook ingestion

`scripts/ingest-workbook.ts` per SPEC §6.3–6.4. The largest single task, and the one everything visual depends on.

Direct OOXML parsing with `jszip` + `fast-xml-parser`, because the format lives in parts that spreadsheet libraries do not expose:

| Sub-task | Source part | Output |
| :--- | :--- | :--- |
| T5.1 Cells, shared strings (rich-text runs flattened), merges, row heights, hidden flags, `rightToLeft` | `sheet1.xml`, `sharedStrings.xml` | raw grid |
| T5.2 Fill resolution, theme colours with ECMA-376 tint | `styles.xml`, `theme1.xml` | hex per cell |
| T5.3 Colour-scale rules and their multi-range `sqref` | `sheet1.xml` `conditionalFormatting` | `color_scale_rules` |
| T5.4 Chart data ranges, axis min/max, series fill (`accent1/2/6` → theme hex) | `chartN.xml` | `sparkline_specs` + chart ↔ column report |
| T5.5 Chart and shape anchors; callout text, ⚠ stripped | `drawing1.xml` + rels | `callouts` |
| T5.6 Structural assertions | — | abort on failure (SPEC §6.4) |
| T5.7 Column map: letter → `channel_id`, axis group, energy role | committed map file | `channels`, `axis_groups` |
| T5.8 Value extraction: scores, cached averages, trajectories, likelihood, barriers | grid | value tables with `cell_ref` |
| T5.9 Roadmap: phase bands, sub-groups, step triplets, `אתגרים:` prefix split | rows 40–66 | `roadmap_items`, `phase_bands` |
| T5.10 Model recovery and verification | trajectories | CF, CI, ramp per SPEC §3.5 |
| T5.11 Outputs | — | `reference.sqlite`, `snapshot.json`, `ingest-report.md` |

**Acceptance:**
- The current workbook ingests; recovered parameters equal SPEC §3.4 for every column; every stored trajectory value verifies within ±0.0501.
- Extracted fills equal SPEC §5.3 and §5.7; colour-scale rules equal SPEC §5.4; sparkline axes and fills equal SPEC §5.5; callouts equal SPEC §5.8.
- The report lists every anomaly named in SPEC §6.3.
- Fixture workbooks with a moved row, an inserted column, a broken phase merge and an out-of-range score each abort with a message naming the problem.
- `snapshot.json` diffs readably against a modified fixture.

---

## T6 — Workbook model

`lib/engine/workbook/`, pure functions:

- `dimensionAverage(subScores)` — SPEC §3.1 blank semantics.
- `colorScale(rule, grid)` → `(cellRef) => hex` — SPEC §5.4 exactly: multi-range union, `PERCENTILE.INC` midpoint, RGB interpolation, `min == max → high`.
- `recoverParameters` / `verifyTrajectories` — SPEC §3.5, shared with T5 so ingestion and tests run identical code.
- `sparklinePath(values, spec, width, height)` → SVG path, fixed axis, zero baseline, category spacing.

### T6b — Parity harness (AC-1)

Golden fixtures generated from the workbook by an explicit script run, never automatically:

- Averages equal cached formula results to 1e-9.
- Recomputed trajectories within ±0.0501 of stored values for all 17 columns × 4 years × 2 metrics.
- Expected colour for every cell in every colour-scale range, derived independently.

**Acceptance:** all parity tests pass; colour of column D's all-5 environment block is `#63BE7B`; a fixture with one sub-score changed shifts the colours of *other* cells in that range, proving the scale is range-relative.

---

## T7 — Matrix grid skeleton (F-101 part 1)

- `/[locale]` renders from one `/api/workbook` payload, statically generated per `dataset_version`.
- CSS Grid: label column plus 17 channel columns in `column_order`.
- Rows 1–3: axis headers spanning their groups; channel names; potential. Fills from `axis_groups`.
- Sticky label column (inline-start) and rows 1–3; the matrix scrolls in its own container on both axes.
- Row heights proportional per SPEC §5.2.
- Header text colour chosen per fill for AA contrast (recorded deviation, SPEC §5.10).
- Keyboard grid navigation: arrow keys move between cells; `role="grid"` semantics.

**Acceptance:** in `/he`, the label column is on the right, efficiency adjacent to it, coal leftmost; `/en` is the exact mirror; axis spans match SPEC §2.4; stickiness holds while scrolling both axes in both locales; the page body never scrolls horizontally.

---

## T8 — Score rows, colour scale, sub-score disclosure (F-101, F-102)

- Three score rows (ביטחון, סביבה, שוויון), one-decimal values, fill from T6's `colorScale`.
- Each label cell is a disclosure toggle (`aria-expanded`) revealing that dimension's five sub-score rows, coloured by the same rule. Collapsed by default.
- Blank averages render as empty cells.

**Acceptance:** every visible cell's colour matches the T6b golden colours; column F's and M's equity cells render blank; expanding a group changes no colour anywhere; axe clean.

---

## T9 — Sparkline rows (F-101, F-102)

- One `<Sparkline>` per channel per dimension: inline SVG, **not** a chart-library instance — 51 library charts with their own resize observers would strain the render budget for what is a four-point path.
- Shared fixed axes, fills, category spacing, negative fill below zero, hidden axes — all from `sparkline_specs` (SPEC §5.5).
- Cell fill `#D9D9D9`, white plot frame; empty frame for columns with no data.
- Tooltip on hover and focus with the four values and unit; accessible name per SPEC §5.5.

**Acceptance:** renewables' generation sparkline visibly fills near the top of its frame while efficiency's is low — the shared axis working; efficiency's emissions fill below the baseline; K and L show empty frames; the accessible name reads the four values.

---

## T10 — Likelihood, barriers, roadmap (F-101, F-103)

- Likelihood and barriers rows, fill `#BFBFBF`, likelihood **not** colour-coded.
- Three phase bands with label and body fills (SPEC §5.7); rotated phase labels; 2025–2030 sub-group labels (יעדים / צעדים / אימפקט).
- Step cards in fixed slots — bold title, detail, challenges with bold `אתגרים:` — so each slot aligns across all 17 columns.
- Targets and impact placeholders where present.
- English mode: free text shown in Hebrew with a "Hebrew source" marker.

**Acceptance:** every step in the workbook appears in its channel, phase and slot; empty slots preserve alignment; the `אתגרים:` prefix is bold everywhere; the rotated labels read correctly in both directions.

---

## T11 — Trigger callouts (F-104)

- Five callouts from `callouts`, positioned inside their anchor cell's grid area per SPEC §5.8.
- `role="note"`, associated with the anchor cell.

**Acceptance:** each callout sits on its anchor cell (F49, G53, J53, Q49, R49) in both locales and stays attached through scrolling on both axes; Q49 appears once.

---

## T12 — Channel detail drawer (F-105)

- Opened from the channel-name cell; shadcn `Sheet`; focus trapped and restored.
- Radar of the three dimension averages (Recharts), with an accessible table.
- All 15 sub-scores with their colour-scale fills.
- Three full-size trajectory charts on a **true time axis**, labelled as such, each with a numeric table.
- Complete roadmap for the channel; its callouts.
- Recovered CF and CI, marked as derived.
- Provenance: `cell_ref` and `dataset_version` for every figure.

**Acceptance:** opens from every column; numbers match the matrix; every figure shows its cell reference; full keyboard operation.

---

## T13 — Column filtering (F-106)

- Toolbar filters by axis group and likelihood; state synced to the URL.
- Axis header spans shrink with hidden columns and disappear when empty.
- Colours never change with filtering (SPEC §5.9).

**Acceptance:** filtering to one axis group renders only its columns with a correct header span; every visible cell's colour is identical to the unfiltered view; a reload restores the filter.

---

## T14 — Fidelity and quality gates

| Gate | Asserts |
| :--- | :--- |
| Typecheck · lint · unit · build | T1 |
| i18n key parity | NFR-8 |
| Direction-property and engine-purity lint | SPEC §8, NFR-7 |
| Workbook parity | AC-1 (T6b) |
| **Structural fidelity** | AC-2: DOM test — column order, spans, fills, sticky elements, collapsed groups, callout anchors, blank cells |
| **Visual regression** | Playwright screenshots of the matrix in both locales against committed baselines |
| axe, both locales | AC-5 |
| Performance | First render ≤ 1 s; engine ≤ 16 ms |

Plus one manual gate: **side-by-side review** of the rendered matrix against `docs/reference/workbook-he.png` by the domain lead. Any difference is fixed, or recorded as a deviation in SPEC §5.10 with its reason.

**Acceptance:** all gates run on every PR, each proven to fail on a deliberate break; the domain lead's sign-off is recorded.

---

## Definition of done for Phase 1

- [ ] Workbook ingested; `snapshot.json` and `ingest-report.md` committed; every anomaly reported
- [ ] Parity (AC-1): averages exact, trajectories verified, colour scale matches for every cell
- [ ] F-101 – F-106 complete in Hebrew and English
- [ ] Structural fidelity test and visual regression green (AC-2)
- [ ] Domain lead side-by-side sign-off against the workbook
- [ ] Recognition test (AC-6) run with ≥ 8 workbook-familiar stakeholders
- [ ] OQ-11, OQ-12, OQ-14 – OQ-18 raised with the client, with answers encoded or still flagged in the UI

---

## Phases 2–4

Held at PRD altitude. Their detail depends on data the workbook does not contain.

- **Phase 2 — Scenarios & demand.** Begins with the **supplementary data workbook** in the same column layout (OQ-13): demand projections, cost parameters, storage split, domestic gas baseline. Then: energy roles confirmed (OQ-17); scenario engine per SPEC §4; the workbook preset reproducing the workbook exactly; deployment controls *inside* the matrix (F-301), with sparklines showing scenario against potential; KPI scorecards above the matrix; demand module (F-201 – F-203); balance and alerts including fuel availability (F-302); GHG (F-402); AC-7 usability test.
- **Phase 3 — Analytics.** Hourly dispatch replacing the curtailment and firm-capacity proxies; system LCOE with grid modelling (F-403); reliability index (F-404); scenario comparison (F-304).
- **Phase 4 — Policy tools.** Excel export written back in the workbook's layout; PDF summaries in workbook format; sensitivity runs over the OQ parameters; public API.

---

## Risks

| Risk | Handling |
| :--- | :--- |
| Colour scale looks right but isn't — computed over the visible row instead of the rule's full range | T6b golden colours for every cell, including the proof that changing a hidden sub-score recolours visible cells |
| A revised workbook moves a row or column | Structural assertions abort ingestion with a precise message (SPEC §6.4); nothing renders from misaligned data |
| Sticky headers, merged spans and RTL interact badly in CSS Grid | T7 proves the skeleton in both directions before any content task starts |
| 51 sparklines plus a long roadmap exceed the render budget | Inline SVG sparklines (T9), static generation per dataset version, performance gate in CI |
| Stakeholders read column trajectories as additive national totals | PRD §1.4 statement; no column totals shown in Phase 1; the energy-role model arrives with scenario totals in Phase 2 |
| Supplementary data for Phase 2 not produced | Phase 1 is complete and valuable without it; flag OQ-13 to the client at Phase 1 kickoff, not at Phase 2 start |
| English mode feels unfinished while free text is untranslated | Explicit "Hebrew source" marker; translations requested alongside OQ-11 |
