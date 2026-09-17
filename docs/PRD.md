# Product Requirements Document

## Israel Energy Pathways 2050: Simulation, Scenarios & Decision-Support Platform

| | |
| --- | --- |
| **Status** | Ready for development (Phase 1) |
| **Version** | 2.1 — realigned to the source workbook's presentation format |
| **Companion documents** | [SPEC.md](SPEC.md) — technical specification · [DEV-PLAN.md](DEV-PLAN.md) — Phase 1 task breakdown |
| **Source workbook** | [`Israel 2050 Pathways 06092026.xlsx`](Israel%202050%20Pathways%2006092026.xlsx) — single sheet, 17 channel columns |

> **How to read this document.** This PRD defines *what* the product is and *why*. The exact layout, colours, equations, schemas and API live in [SPEC.md](SPEC.md). The build sequence lives in [DEV-PLAN.md](DEV-PLAN.md). Feature IDs (F-101 … F-404) are stable and referenced from both.

---

## 1. Executive Summary & Vision

### 1.1 Context & Background

Transitioning Israel's energy ecosystem toward 2050 requires resolving the core trade-offs of the **Energy Trilemma**:

1. **Energy Security & Grid Reliability** — resilience against localized interruptions, peak demand shortages, and geopolitical supply volatility.
2. **Environmental Sustainability** — mitigating greenhouse gas emissions (CO₂ and CH₄) toward net-zero targets and reducing local air pollution.
3. **Energy Equity & Affordability** — maintaining competitive energy prices for households and industry.

The **Israel 2050 Pathways** workbook captures this analysis as a single matrix: 17 supply and demand-side pathways, each scored on the three Trilemma dimensions, quantified over 2025–2050, and accompanied by a phased policy roadmap. It is already the artefact stakeholders know and discuss.

This product turns that workbook into an interactive web platform — first as a faithful, navigable rendition of the workbook itself, then as a scenario simulator built on top of it.

### 1.2 Product Vision

To serve as the national **single source of truth** for Israel's energy pathways: a place where the workbook's analysis can be read, explored and shared in its familiar form, and then extended into scenarios that quantify economic, environmental and geopolitical consequences.

### 1.3 Core Objectives

- **Workbook-faithful presentation** — the primary view is recognizably the workbook: the same 17 columns in the same order, the same axis colour bands, the same score colouring, the same sparklines and roadmap blocks. A stakeholder who knows the spreadsheet should need no orientation.
- **Progressive disclosure** — what the workbook hides (sub-score rows, underlying trajectory numbers) is one click away rather than absent.
- **Dynamic demand profiling** *(Phase 2)* — sectoral demand trajectories (EVs, AI/data centres, industrial electrification, desalination) against which pathways are balanced.
- **Interactive scenario builder** *(Phase 2)* — users choose which pathways to pursue and how far, for milestone years `t ∈ {2025, 2030, 2040, 2050}`.
- **Real-time analytics** *(Phases 2–3)* — adequacy, emissions, system cost and resilience indices, recalculated in under 100 ms.

### 1.4 What This Product Is Not

Stated explicitly, because the audience is governmental and the outputs will be quoted:

- It is **not a tariff forecast**. Cost outputs are directional indicators, not predicted consumer prices.
- It is **not a grid dispatch or adequacy tool**. Sub-annual reliability figures are documented proxies until Phase 3.
- It is **not an optimizer**. It evaluates user-constructed scenarios; it does not solve for a least-cost pathway.
- The workbook's per-channel trajectories are **each pathway's standalone potential**, not a forecast of what will be built. The UI must not present column values as if they sum to a national plan (see §3.4).

---

## 2. User Personas & Target Audience

| Persona | Role / Institution | Primary needs (jobs to be done) |
| :--- | :--- | :--- |
| **Policymakers & Regulators** | Ministry of Energy, Electricity Authority, Ministry of Finance, Ministry of Environmental Protection | Assess macro policy trade-offs, forecast fiscal commitments and capital expenditure, define emission-reduction mandates |
| **System Planners & TSOs** | Noga (ISO), Israel Electric Corporation, INGL | Evaluate baseload adequacy, seasonal intermittency, transmission bottlenecks, storage requirements |
| **Energy Analysts & Investors** | IPPs, infrastructure funds, CleanTech VCs | Assess commercial viability and commercialization timelines for emerging pathways (SMRs, subsea interconnectors, green hydrogen) |
| **Civil Society & Researchers** | Academia, think tanks, environmental NGOs | Validate compliance with international climate commitments, verify environmental metrics, evaluate social equity |

**Primary persona for v1:** Policymakers already familiar with the workbook. Where a design trade-off arises, favour fidelity to the workbook over novel presentation.

---

## 3. Domain Model — As Found in the Workbook

### 3.1 Workbook Structure

One right-to-left sheet. **Channels are columns; attributes are rows.**

```
            ┌─ col A: row labels ─┬── cols C … S: one column per channel (17) ──────────────┐
 Row 1      │ ציר   Axis          │ colour-banded axis headers, merged across their columns │
 Row 2      │ תחום  Channel       │ channel name, tinted axis colour                        │
 Row 3      │ פוטנציאל Potential  │ deployment potential, MW                                │
 Rows 4–8   │ (hidden)            │ 5 security sub-scores, 1–5                              │
 Row 9      │ ביטחון Security     │ average, colour-scaled                                  │
 Row 14     │ (sparkline)         │ generation trajectory 2025→2050, TWh      (rows 10–13)  │
 Rows 15–19 │ (hidden)            │ 5 environment sub-scores                                │
 Row 20     │ סביבה Environment   │ average, colour-scaled                                  │
 Row 25     │ (sparkline)         │ emissions trajectory, MtCO₂e              (rows 21–24)  │
 Rows 26–30 │ (hidden)            │ 5 equity sub-scores                                     │
 Row 31     │ שוויון Equity       │ average, colour-scaled                                  │
 Row 36     │ (sparkline)         │ price-impact trajectory, index −5…+5      (rows 32–35)  │
 Row 38     │ סבירות Likelihood   │ high / medium / low                                     │
 Row 39     │ חסמים Barriers      │ free text                                               │
 Rows 40–51 │ 2025–2030 (blue)    │ targets · steps (title / detail / challenges) · impact  │
 Rows 52–60 │ 2030–2040 (orange)  │ steps                                                   │
 Rows 61–66 │ 2040–2050 (green)   │ steps                                                   │
            │ + ⚠ callouts        │ trigger conditions anchored to a channel × phase        │
            └─────────────────────┴─────────────────────────────────────────────────────────┘
```

Row-level and cell-level detail — including colours, the colour-scale rule and the sparkline axes — is in [SPEC §5](SPEC.md#5-workbook-presentation-format).

### 3.2 The 17 Channels

The workbook's column order is canonical and is preserved everywhere in the product.

| Col | Axis (ציר) | Channel (תחום) | English | Potential |
| :-- | :--- | :--- | :--- | --: |
| C | התייעלות | התייעלות | Energy efficiency | 3,000 MW |
| D | התייעלות | הפחתת ביקושים | Demand reduction | — |
| E | מתחדשות | מתחדשות ואגירה | Renewables & storage | 50,000 MW |
| F | ייבוא חשמל | קישוריות אזורית חשמלית | Regional electricity interconnection | 8,000 MW |
| G | גז טבעי | ייבוא גז טבעי מונזל (LNG) | LNG imports | 10,000 MW |
| H | גז טבעי | שימוש בגז עם לכידת פחמן (CCS) | Gas with carbon capture | 10,000 MW |
| I | גז טבעי | ייבוא גז טבעי בצינור | Pipeline gas imports | 10,000 MW |
| J | גז טבעי | הרחבת ייצור חשמל מגז טבעי | Expanded gas-fired generation | 10,000 MW |
| K | הדלקים | אספקת דלקים | Fuel supply | — |
| L | הרשת | פיתוח הרשת | Grid development | — |
| M | טכנולוגיות עתיד | אנרגיה גיאותרמית | Geothermal energy | 10,000 MW |
| N | טכנולוגיות עתיד | ביקוע גרעיני (SMR) | Nuclear fission (SMR) | 8,000 MW |
| O | טכנולוגיות עתיד | היתוך גרעיני | Nuclear fusion | 5,000 MW |
| P | מימן | ייבוא מימן | Hydrogen imports | 8,000 MW |
| Q | גז טבעי | תימרוץ חיפוש ופיתוח מאגרי גז במים עמוקים | Incentivized deep-water gas exploration | 2,000 MW |
| R | גז טבעי | תימרוץ חיפוש ופיתוח מאגרי גז טבעי קטנים | Incentivized small-field gas development | 1,000 MW |
| S | חזרה לפחם | חזרה לייצור בפחם | Return to coal generation | 5,000 MW |

Ten axis header groups carrying nine distinct axis names: natural gas appears twice, as imports and generation (G–J) and as domestic exploration (Q–R).

*English names are working translations pending domain-lead review (OQ-11).*

### 3.3 Attributes per Channel

| Group | Attributes | In workbook? |
| :--- | :--- | :--- |
| Identification | axis, channel name (he), column order | ✅ |
| Potential | deployment potential, MW | ✅ (absent for D, K, L) |
| Security (5 sub-scores, 1–5) | import dependency, diversity, storage capability, grid reliability, redundancy | ✅ |
| Environment (5 sub-scores) | CO₂ intensity, renewable share, efficiency, air quality, methane emissions | ✅ |
| Equity (5 sub-scores) | access to electricity, clean cooking, electricity price, fuel price, industrial price | ✅ |
| Dimension averages | security, environment, equity | ✅ formulas |
| Generation trajectory | TWh at 2025/2030/2040/2050 | ✅ static values |
| Emissions trajectory | MtCO₂e at each milestone | ✅ static values |
| Price-impact trajectory | index at each milestone | ✅ static values, unit undefined (OQ-12) |
| Likelihood | high / medium / low | ✅ |
| Barriers | free text | ✅ |
| Roadmap | per phase: targets, up to 3 steps (title · detail · challenges), impact | ✅ sparse |
| Trigger callouts | ⚠ conditions under which a pathway becomes necessary | ✅ 5 unique |
| Capacity factor, carbon intensity, deployment ramp | | ⚙️ derivable — recovered and verified at ingestion (SPEC §3) |
| Cost parameters (CAPEX, O&M, fuel, lifetime) | | ❌ required for Phase 2+ |
| Demand projections by sector | | ❌ required for Phase 2+ |
| Storage specification (power, energy, efficiency) | | ❌ bundled into column E |

**The workbook fully supports Phase 1. It does not contain the data Modules 2–4 need** — see OQ-13 and [SPEC §4.1](SPEC.md#41-data-gaps).

### 3.4 Modelling Principles

Three facts about the workbook constrain everything built on it:

1. **Columns are alternatives, not addends.** LNG imports (G), pipeline imports (I), deep-water gas (Q) and small fields (R) are *fuel sources* for the same gas-fired generation represented by J and H. Each column shows what that pathway could deliver if pursued. Summing all 17 generation trajectories — as the v1.0 PRD's `ΔE = Σᵢ₌₁¹⁷ Generationᵢ − NetDemand` did — would count the same gas-fired electricity up to three times. Phase 2 assigns each column an energy role (SPEC §4.2) so that scenario totals are physically meaningful.
2. **Efficiency is displayed as a column, but modelled as a demand reduction.** The workbook places efficiency (C) and demand reduction (D) among the pathways, with negative emissions representing avoided grid emissions. The display keeps that. The Phase 2 engine applies these columns once, as a reduction to demand, and does not additionally apply a separate efficiency multiplier to the same measures.
3. **Storage is bundled into renewables (E).** The workbook does not separate them. Phase 1 displays column E as-is. Separating storage for reliability and curtailment modelling requires data the workbook does not hold.

---

## 4. Functional Specifications

### 4.1 Module 1 — Pathways Workbook View *(Phase 1)*

- **F-101 Pathways matrix.** A web rendition of the workbook sheet, structurally and visually faithful: RTL in Hebrew (mirrored LTR in English); 17 columns in workbook order under merged, colour-banded axis headers; channel name and potential rows; three Trilemma score rows coloured by the workbook's red–yellow–green scale; a sparkline row under each score row on the workbook's shared fixed axes; likelihood and barriers rows. The row-label column and the three header rows stay fixed while scrolling. Blank workbook cells render blank — never as zero.
- **F-102 Sub-score and trajectory disclosure.** Each Trilemma row expands in place to reveal its five hidden sub-score rows, coloured by the same scale. Hovering or focusing a sparkline shows its four milestone values and unit. Rows the workbook hides are collapsed by default.
- **F-103 Roadmap section.** Below the matrix, the three phase bands — 2025–2030 (blue), 2030–2040 (orange), 2040–2050 (green) — with the phase label spanning the band. Inside each band, each channel's cell shows its steps as cards: bold title, detail text, and challenges introduced by **אתגרים:**. Targets and impact sub-rows appear where the workbook has them.
- **F-104 Trigger callouts.** The workbook's ⚠ notes, rendered as callouts anchored to their channel and phase. They express trigger conditions ("renewables deployment is insufficient and no new gas reserves were found") and must stay visually attached to the right cell at every scroll position and in both directions.
- **F-105 Channel detail drawer.** Opened from a channel's name cell: the full column vertically — radar chart of the three dimension averages, all 15 sub-scores, the three trajectories as full-size labelled charts with numeric tables, the complete roadmap for that channel, and the provenance of each figure (workbook cell reference and dataset version).
- **F-106 Column filtering.** Optional toolbar to hide columns by axis or likelihood. Defaults to all 17 columns in workbook order. Columns are never re-sorted: axis grouping is part of the format.

### 4.2 Module 2 — Demand Projection & Profiling *(Phase 2)*

- **F-201 Demand trajectory selector.** Pre-calibrated macro settings:
  - *High growth (accelerated tech)* — EV uptake > 80% by 2040, intensive data-centre rollout (1,500–2,500 MW baseload)
  - *Reference path (moderate)* — aligned with official national projections
  - *Deep conservation* — strict energy codes, mandatory industrial heat recovery
- **F-202 Sectoral elasticity sliders.** Per-sector overrides: EV adoption %, industrial electrification pace.
- **F-203 Sectoral composition chart.** Stacked-area chart of sectoral demand shares to 2050.

*Requires demand data not present in the workbook (OQ-13).*

### 4.3 Module 3 — Scenario Builder & Energy Balancer *(Phase 2)*

- **F-301 Pathway selection in the workbook view.** Scenarios are built *in* the F-101 matrix, not in a separate form: each column gains a deployment control (off / share of potential) per milestone year, and the column's sparklines update to show the scenario value against the workbook potential. The workbook format remains the user's frame of reference throughout.
- **F-302 Real-time adequacy & balance.**
  ```
  ΔE_t = Supply_t − NetDemand_t       [TWh]
  ```
  Supply is summed by energy role, never across all 17 columns (§3.4). When `ΔE_t < 0`, show unserved energy (TWh) and implied firm-capacity shortfall (MW). When variable renewable output exceeds what demand plus storage can absorb, show a curtailment advisory marked as a proxy estimate. When gas-fired generation exceeds the gas made available by the selected fuel-source columns, show a fuel-availability alert.
- **F-303 Baseline scenario presets.** (1) 100% renewables & long-duration storage; (2) SMR baseload + gas with CCS; (3) regional connectivity hub; (4) indigenous gas & energy independence. Each preset maps directly to a set of workbook columns.
- **F-304 Scenario persistence & comparison.** Scenarios encode into the URL and `localStorage`; shareable permalinks without an account; side-by-side delta comparison; JSON export/import.

### 4.4 Module 4 — Impact & Analytics Dashboard *(Phases 2–3)*

- **F-401 Generation mix breakdown.** Annual TWh contribution and share by channel, grouped and coloured by workbook axis.
- **F-402 Greenhouse gas accounting.** `Emissions_t = Σᵢ Generationᵢ,t × CIᵢ` [MtCO₂e], using carbon intensities recovered from the workbook, benchmarked against Israel's Paris Agreement targets and the 2050 net-zero trajectory.
- **F-403 System cost & price direction.** System LCOE with annualized CAPEX, and a price-direction band. Labelled as directional, not a tariff forecast. *Requires cost data not in the workbook (OQ-13).*
- **F-404 Reliability & autonomy index.** 0–100 composite of import dependency, firm-capacity margin and dispatchable share, always shown with its three components.

---

## 5. Technical Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                    Next.js 15 (App Router, TypeScript)               │
│  Presentation  Tailwind CSS · shadcn/ui · Lucide                     │
│  Matrix        CSS Grid, sticky label column and header rows         │
│  Charts        inline SVG sparklines · Recharts (radar, full charts) │
│  Localization  i18next — Hebrew (RTL) + English (LTR), both from v1  │
│  State         Zustand (UI state; scenarios URL-encoded from Ph. 2)  │
├──────────────────────────────────────────────────────────────────────┤
│  lib/engine — the ONE calculation engine (pure TypeScript)           │
│  Phase 1: workbook model (trajectories, averages, colour scale)      │
│  Phase 2: scenario balance, emissions, cost, reliability             │
├──────────────────────────────────────────────────────────────────────┤
│  Route handlers (thin API)                                           │
│  Reference-data reads · permalinks · PDF / Excel export              │
├──────────────────────────────────────────────────────────────────────┤
│  SQLite (file-based, no server install) via Drizzle ORM              │
│  Ingested from the workbook: values AND layout metadata              │
│  (column order, axis spans, colours, row map, callouts)              │
└──────────────────────────────────────────────────────────────────────┘
```

### 5.1 Design Decisions

| Decision | Reason |
| :--- | :--- |
| Next.js route handlers + file-based SQLite, not FastAPI + PostgreSQL | No accounts, no multi-tenancy, one small reference workbook. A database server is operational cost without a v1 benefit; Drizzle keeps Postgres a driver swap away. |
| One engine module with two call sites | Separate client and server implementations of the same model produce numbers that disagree with themselves. |
| Layout metadata ingested from the workbook, not hard-coded | Column order, axis spans, colours and callout anchors come from the file. When the workbook is revised, the web view follows without code changes. |
| CSS Grid matrix, not an HTML `<table>` or a spreadsheet component | Merged header spans, sticky rows and columns, in-cell sparklines, expandable row groups and RTL mirroring together exceed what a data-grid library renders faithfully. |

### 5.2 Performance Strategy

All figures are computed synchronously in the browser from in-memory reference data. Budgets: engine compute ≤ 16 ms per evaluation; first render of the full matrix — 17 columns, 51 sparklines, roadmap — ≤ 1 s on a mid-tier laptop; interaction-to-repaint ≤ 100 ms p95. Server round-trips are reserved for export and permalinks.

---

## 6. UI & Experience Guidelines

- **The workbook is the design reference.** Where this document is silent, the workbook decides. Deviations from its layout, colours or ordering require an explicit reason recorded in SPEC §5.
- **Bilingual, bidirectional.** Hebrew RTL is primary and matches the workbook's orientation exactly: row labels on the right, efficiency as the rightmost channel. English is the mirrored LTR layout. CSS logical properties throughout.
- **Colour carries meaning, never alone.** Every colour-scaled score also shows its number; every ⚠ callout has its icon and text; likelihood is written in words.
- **Provenance is always reachable.** Every figure exposes its workbook cell reference and dataset version.
- **Absence is visible.** Blank workbook cells stay blank. An empty sparkline frame stays an empty frame. The UI never implies a value the workbook does not contain.
- **Phase 2 onward** — the scenario controls live inside the matrix view (F-301). A collapsible side panel holds demand assumptions and the milestone-year toggle; KPI scorecards (balance, emissions, cost, reliability) sit above the matrix.

---

## 7. Non-Functional Requirements

| # | Requirement |
| :--- | :--- |
| NFR-1 | **Performance.** Budgets in §5.2, enforced by automated tests in CI. |
| NFR-2 | **Accessibility.** WCAG 2.2 AA in both locales. The matrix is navigable by keyboard as a grid; each sparkline has a text equivalent; colour-scaled cells meet contrast requirements for their text. *(Confirm required level, OQ-8.)* |
| NFR-3 | **Browser support.** Last two versions of Chrome, Edge, Firefox, Safari. Desktop-first. At narrow widths the matrix scrolls horizontally inside its container with the label column fixed; the page body never scrolls sideways. |
| NFR-4 | **Privacy.** No accounts, no personal data, no third-party analytics by default. |
| NFR-5 | **Reproducibility.** Every scenario records `schema_version` and `dataset_version`; loading one built on an earlier workbook warns and names both versions. |
| NFR-6 | **Traceability.** Every reference figure carries its workbook cell reference. |
| NFR-7 | **Model auditability.** The engine is pure functions with no I/O, unit-tested against the workbook. |
| NFR-8 | **Localization completeness.** CI fails on a key missing from either catalogue. |
| NFR-9 | **Format fidelity.** Changes to the workbook's structure (a row inserted, a column added, an axis re-spanned) are detected at ingestion and reported, never silently mis-rendered. |

### Out of Scope for v1

User accounts and roles · editing the workbook through the web UI · hourly/8760 dispatch · Monte-Carlo sensitivity · public research API · real-time data feeds · mobile-optimized layout · collaboration and commenting.

---

## 8. Roadmap

| Phase | Theme | Contents |
| :--- | :--- | :--- |
| **1** | Workbook view | Workbook ingestion (values + layout), data layer, workbook model with parity tests, bilingual/RTL shell, F-101 – F-106 |
| **2** | Scenarios & demand | Supplementary data for demand, costs and storage (OQ-13); energy-role model; demand profiling (F-201 – F-203); in-matrix scenario controls and live balance (F-301 – F-303); KPI scorecards; generation mix and GHG (F-401, F-402) |
| **3** | Analytics | Hourly dispatch replacing the v1 proxies; system LCOE with grid-upgrade modelling (F-403); reliability index (F-404); scenario comparison (F-304) |
| **4** | Policy tools | Permalinks at scale, PDF executive summaries in workbook format, sensitivity runs, public API for research teams |

Phase 1 is broken to task level in [DEV-PLAN.md](DEV-PLAN.md).

---

## 9. Acceptance Criteria

| # | Criterion | Verification |
| :--- | :--- | :--- |
| AC-1 | **Workbook parity.** For all 17 columns: dimension averages equal the workbook's cached formula results (tolerance 1e-9); generation and emissions trajectories recomputed from the recovered parameters (MW × CF × ramp; generation × CI) match the workbook's stored values within ±0.051, the workbook's own rounding. Every stored value is displayed verbatim. | Golden-file test generated from the workbook, in CI |
| AC-2 | **Format fidelity.** Column order, axis spans and colours, row order, hidden-row behaviour, colour-scale colours, sparkline axes and colours, phase band colours and callout anchors all match the workbook. | Automated structural test against ingested layout metadata, plus a side-by-side sign-off against the reference screenshot by the domain lead |
| AC-3 | **Responsiveness.** NFR-1 budgets met. | Automated performance test in CI |
| AC-4 | **Bilingual completeness.** Both catalogues complete; Hebrew layout matches the workbook's RTL orientation; English is its correct mirror. | CI key-parity check + visual regression in both locales |
| AC-5 | **Accessibility.** No WCAG 2.2 AA violations on Phase 1 screens in either locale. | Automated axe scan in CI + manual keyboard and screen-reader pass |
| AC-6 | **Recognition.** ≥ 6 of 8 stakeholders familiar with the workbook locate a named channel's 2040 roadmap steps and its environment sub-scores unassisted within 2 minutes. | Moderated session at end of Phase 1 |
| AC-7 | **Scenario usability** *(Phase 2)*. ≥ 6 of 8 non-technical stakeholders build a scenario with `ΔE ≥ 0` for 2040 unassisted within 10 minutes. | Moderated session at end of Phase 2 |

---

## 10. Open Questions

Each has a working default so development is not blocked. Owner: client / domain lead.

| # | Question | Working default |
| :--- | :--- | :--- |
| OQ-1 | Discount rate for CAPEX annualization — social or commercial? *(Phase 2)* | 7% real, USD 2025 |
| OQ-2 | Methane GWP horizon — GWP100 or GWP20? | GWP100, IPCC AR6 |
| OQ-3 | Are the workbook's carbon intensities lifecycle or combustion-only? The recovered values (coal 900, LNG 450, gas 400 g/kWh) look combustion-based. | Combustion-only; basis displayed with every figure |
| OQ-4 | Transmission & distribution loss rate *(Phase 2)* | 3.5% of net demand |
| OQ-5 | System load factor for deriving peak demand *(Phase 2)* | 0.62 |
| OQ-6 | ~~Channel count and efficiency treatment~~ | **Answered by the workbook:** 17 columns; efficiency and demand reduction are columns C–D with avoided emissions |
| OQ-7 | Carbon intensity of imported electricity | 300 g/kWh, as recovered from column F |
| OQ-8 | Required accessibility conformance level | WCAG 2.2 AA |
| OQ-9 | Hosting target — government cloud, commercial cloud, or on-premises? | Standard Node host; no platform-specific APIs |
| OQ-10 | Curtailment ceiling `α` for the Phase 2 proxy | 0.35, flagged as a proxy in the UI |
| OQ-11 | Approved English names for the 17 channels, 10 axes and all row labels | Working translations in §3.2, marked as pending |
| OQ-12 | Unit and meaning of the equity trajectory (rows 32–35, range −5…+5). Price-impact index? Agorot/kWh? | Displayed as a unitless "price-impact index", labelled as such |
| OQ-13 | Source for the data Phases 2–4 require and the workbook lacks: sectoral demand projections, cost parameters, storage specifications | Phase 2 starts with a supplementary data workbook in the same column layout, owned by the client |
| OQ-14 | Column D (demand reduction) carries trajectories identical to column C and no potential or security sub-scores. Intentional, or placeholder? | Rendered exactly as in the workbook; excluded from Phase 2 totals until confirmed, to avoid counting efficiency twice |
| OQ-15 | Columns K (fuel supply) and L (grid development) carry no quantities. Are they enablers rather than energy pathways? | Rendered as in the workbook; given the role "enabler" and excluded from energy totals |
| OQ-16 | Hidden row 37 (טרילמה) is colour-scaled but empty — a planned overall Trilemma composite? | Not displayed in Phase 1; if wanted, the mean of the three dimension averages |
| OQ-17 | Energy roles for Phase 2: are G, I, Q, R fuel sources for gas generation (J, H) rather than independent generation? How is existing domestic gas supply represented? | G, I, Q, R treated as fuel sources constraining J and H; existing supply as a baseline parameter to be supplied |
| OQ-18 | The workbook contains a duplicated callout at Q49. Error or intentional emphasis? | De-duplicated at ingestion and reported |

---

## Appendix A — Revision History

### v2.1 — Realigned to the workbook

- Module 1 redefined as a faithful rendition of the workbook (F-101 – F-106), replacing a conventional channels-as-rows table.
- §3 rebuilt from the workbook's actual contents: the 17 columns, their axes, the attributes present, and the data **not** present.
- **Equity has five sub-scores**, including clean cooking — v2.0 listed four.
- **Columns are alternatives, not addends** (§3.4). The v1.0/v2.0 balance summed all 17 channels, which would count gas-fired generation up to three times.
- Efficiency kept as columns C–D for display, modelled as a demand reduction; storage acknowledged as bundled into column E.
- **AC-1 redefined.** v2.0 required parity on ΔE and system LCOE; the workbook contains no demand or cost data, so that criterion was unmeasurable. Parity is now against what the workbook actually holds.
- Recovered from the workbook and verified on all 17 columns: capacity factors, carbon intensities and the deployment ramp (SPEC §3).
- Phases 2–4 now explicitly depend on supplementary data (OQ-13). KPI scorecards moved from Phase 1 to Phase 2, since nothing in the workbook can populate them.

### v2.0 — Development-ready rewrite

The v1.0 document was a Google Docs export in which all 35 equations and numeric targets were embedded images. All were transcribed. Substantive corrections: storage separated from generation; `Generation` given a single canonical definition; LCOE annualized via a capital recovery factor; transmission losses added; formulas specified for F-403, F-404 and Trilemma aggregation; the dual client/server engine and the "Prisma / SQLAlchemy" contradiction resolved; acceptance criteria made measurable.
