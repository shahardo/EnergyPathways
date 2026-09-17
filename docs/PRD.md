# Product Requirements Document

## Israel Energy Pathways 2050: Simulation, Scenarios & Decision-Support Platform

| | |
| --- | --- |
| **Status** | Ready for development (Phase 1) |
| **Version** | 2.0 |
| **Companion documents** | [SPEC.md](SPEC.md) — technical specification · [DEV-PLAN.md](DEV-PLAN.md) — Phase 1 task breakdown |
| **Source dataset** | `Israel 2050 Pathways 06092026.xlsx` (external dependency — see §9) |

> **How to read this document.** This PRD defines *what* the product is and *why*. Every equation, schema, default value and API contract lives in [SPEC.md](SPEC.md); the ordered build sequence lives in [DEV-PLAN.md](DEV-PLAN.md). Feature IDs (F-101 … F-404) are stable and referenced from both companions.

---

## 1. Executive Summary & Vision

### 1.1 Context & Background

Transitioning Israel's energy ecosystem toward 2050 requires resolving the core trade-offs of the **Energy Trilemma**:

1. **Energy Security & Grid Reliability** — resilience against localized interruptions, peak demand shortages, and geopolitical supply volatility.
2. **Environmental Sustainability** — mitigating greenhouse gas emissions (CO₂ and CH₄) toward net-zero targets and reducing local air pollution.
3. **Energy Equity & Affordability** — maintaining competitive electricity tariffs for domestic and industrial competitiveness.

This product defines an interactive, web-based platform derived from the research model embedded in the **Israel 2050 Pathways** framework. It enables government officials, system operators, researchers, and commercial stakeholders to simulate supply-demand balance trajectories, evaluate strategic trade-offs, and construct actionable decarbonization pathways to 2050.

### 1.2 Product Vision

To serve as the national **single source of truth** for interactive energy pathway simulations in Israel — empowering stakeholders to dynamically assemble supply-demand configurations, assess grid feasibility in real time, and quantify economic, environmental, and geopolitical consequences.

### 1.3 Core Objectives

- **Supply channel transparency** — structure and visualize the supply pathways across 9 energy axes, with technical capacities, multi-criteria Trilemma scoring, operational hurdles, and time-phased execution roadmaps (2025–2050).
- **Dynamic demand profiling** — project macro-demand trajectories by sector (EV fleet growth, AI/data centres, industrial electrification, desalination, building HVAC) alongside demand-reduction and efficiency initiatives.
- **Interactive scenario builder** — a workspace where users configure capacity allocations (MW) and annual generation (TWh) across milestone years `t ∈ {2025, 2030, 2040, 2050}`.
- **Real-time analytics** — sub-100 ms feedback on system adequacy (surplus/deficit), balancing risks, cumulative emissions (MtCO₂e), system LCOE ($/MWh), and composite resilience indices.

### 1.4 What This Product Is Not

Stating this explicitly, because the audience is governmental and the outputs will be quoted:

- It is **not a tariff forecast**. Cost outputs are directional system-cost indicators, not predicted consumer prices.
- It is **not a production-grid dispatch or adequacy tool**. v1 balances annual energy; sub-annual reliability figures are documented proxies (see §5.2 and SPEC §4).
- It is **not an optimizer**. It evaluates user-constructed scenarios; it does not solve for a least-cost pathway.

---

## 2. User Personas & Target Audience

| Persona | Role / Institution | Primary needs (jobs to be done) |
| :--- | :--- | :--- |
| **Policymakers & Regulators** | Ministry of Energy, Electricity Authority, Ministry of Finance, Ministry of Environmental Protection | Assess macro policy trade-offs, forecast fiscal commitments and capital expenditure, define emission-reduction mandates |
| **System Planners & TSOs** | Noga (ISO), Israel Electric Corporation, INGL | Evaluate baseload adequacy, seasonal intermittency, transmission bottlenecks, storage requirements (BESS, pumped hydro, hydrogen) |
| **Energy Analysts & Investors** | IPPs, infrastructure funds, CleanTech VCs | Assess commercial viability and commercialization timelines for emerging pathways (SMRs, subsea interconnectors, green hydrogen) |
| **Civil Society & Researchers** | Academia, think tanks, environmental NGOs | Validate compliance with international climate commitments, verify environmental metrics, evaluate social equity |

**Primary persona for v1:** System Planners & Policymakers. Where a design trade-off arises, favour analytical transparency over simplification.

---

## 3. Domain Model

```
                              ┌─────────────────────────────┐
                              │      Scenario Context       │
                              │   t ∈ {2025,2030,2040,2050} │
                              └──────────────┬──────────────┘
                                             │
        ┌────────────────────┬───────────────┴───────────────┐
        ▼                    ▼                               ▼
┌───────────────┐   ┌─────────────────┐            ┌──────────────────┐
│Supply Channels│   │ Storage Assets  │            │  Demand Sectors  │
├───────────────┤   ├─────────────────┤            ├──────────────────┤
│ Capacity (MW) │   │ Power    (MW)   │            │ Baseline (BAU)   │
│ Capacity fact.│   │ Energy   (MWh)  │            │ Transport (EV)   │
│ Carbon int.   │   │ Round-trip eff. │            │ AI / Data centres│
│ Cost params   │   │ Cycles / year   │            │ Industrial heat  │
│ Trilemma 1–5  │   └────────┬────────┘            │ Desalination     │
│ Roadmap       │            │                     │ Efficiency & DSM │
└───────┬───────┘            │                     └────────┬─────────┘
        │                    │                              │
        └────────────────────┴──────────────┬───────────────┘
                                            ▼
                             ┌─────────────────────────────┐
                             │  Balance Engine (annual)    │
                             │  ΔE = Supply − Net Demand   │
                             │  Emissions = Σ(Gen × CI)    │
                             │  LCOE = f(mix, storage,grid)│
                             └──────────────┬──────────────┘
                                            ▼
                             ┌─────────────────────────────┐
                             │    Impact & KPI Dashboards  │
                             └─────────────────────────────┘
```

Three entity kinds, deliberately separated — full field-level definitions in [SPEC §2](SPEC.md#2-domain-model):

- **Supply channel** — produces energy. Contributes to `Σ Generation`.
- **Storage asset** — shifts energy in time and consumes some of it. Contributes **zero** generation; it reduces curtailment, adds firm capacity, and subtracts round-trip losses. *(The v1.0 PRD listed storage among supply channels; that would have double-counted it as generation.)*
- **Demand sector** — consumes energy. Efficiency and demand-side management are **demand-side reductions only**, never supply. *(v1.0 counted efficiency both as supply axis 1 and as a demand reducer.)*

### 3.1 Supply Axes

Channels are grouped under 9 axes. The canonical channel list is derived from the source dataset at ingestion (see §9, OQ-6) — this is the grouping, not the enumeration:

1. **Renewables** — solar PV (rooftop, utility-scale, agri-PV, floating) and its storage integration
2. **Power import** — regional interconnection (Great Sea Interconnector, Jordan solar-water exchange)
3. **Natural gas** — LNG import terminals (FSRU), gas with CCS, pipeline imports, CCGT expansion
4. **Liquid fuels** — strategic reserves, alternative distillates
5. **Grid infrastructure** — HV transmission reinforcement, smart grid, synchronized DER
6. **Frontier & advanced** — deep geothermal (EGS/superhot rock), SMRs, fusion
7. **Hydrogen** — green/blue hydrogen imports and pipeline conversion
8. **Domestic gas & legacy** — deep-water exploration, marginal field development, coal baseline/reserve
9. **Storage** — BESS, pumped hydro, hydrogen storage *(modelled as storage assets, not generators)*

*Efficiency & DSM, listed as a supply axis in v1.0, is now a demand sector.*

### 3.2 Attributes per Supply Channel

- **Identification** — `channel_id`, `axis`, `display_name_en`, `display_name_he`
- **Technical ceilings** — `max_capacity_mw`, `capacity_factor`, `max_annual_generation_twh`
- **Trilemma scores (1–5)**
  - *Security* — import dependency, fuel diversity, storage capability, grid reliability, system redundancy
  - *Environment* — carbon intensity (gCO₂e/kWh), renewable fraction, conversion efficiency, air quality, methane leakage
  - *Equity* — tariff impact, fuel cost impact, industrial competitiveness, access equity
- **Feasibility** — probability level (high/medium/low), bottlenecks (geopolitical, statutory, supply chain, technological maturity), TRL
- **Phased roadmap** — 2025–2030, 2030–2040, 2040–2050: quantitative milestones, legislative steps, environmental impact
- **Cost parameters** — CAPEX, fixed O&M, variable O&M, fuel cost, economic lifetime

### 3.3 Demand Sectors

```
GrossDemand_t = D_BAU,t + D_EV,t + D_AI,t + D_Industry,t + D_Water,t     [TWh]
NetDemand_t   = GrossDemand_t × (1 − η_Efficiency,t)                     [TWh]
```

| Term | Sector | Driver |
| :--- | :--- | :--- |
| `D_BAU` | Baseline | Population and demographic trajectory coupled with GDP growth |
| `D_EV` | Transport electrification | Penetration curves for passenger vehicles, transit buses, heavy logistics |
| `D_AI` | AI & high-performance compute | Flat baseload from domestic hyperscale data centres |
| `D_Industry` | Industrial thermal electrification | Fossil heat → heat pumps and electric arc furnaces |
| `D_Water` | Water desalination | Municipal water security, agricultural reclaimed water delivery |
| `η_Efficiency` | Efficiency & demand response | Decoupling policy, zero-energy building codes, time-of-use tariff shaving |

---

## 4. Functional Specifications

### 4.1 Module 1 — Supply Pathways Explorer

- **F-101 Interactive matrix view.** Multi-dimensional grid of all supply channels. Sort and filter by axis, feasibility, Trilemma scores, and deployment ceilings.
- **F-102 Pathway detail sheet.** Drawer per channel showing: a radar chart of the three Trilemma pillars; an interactive milestone timeline across 2025–2030, 2030–2040, 2040–2050; technical notes on grid-integration constraints and critical-path dependencies; and the provenance of every displayed figure (source + dataset version).

### 4.2 Module 2 — Demand Projection & Profiling

- **F-201 Demand trajectory selector.** Pre-calibrated macro settings:
  - *High growth (accelerated tech)* — EV uptake > 80% by 2040, intensive data-centre rollout (1,500–2,500 MW baseload)
  - *Reference path (moderate)* — aligned with official national projections
  - *Deep conservation* — strict energy codes, mandatory industrial heat recovery
- **F-202 Sectoral elasticity sliders.** Per-sector overrides: EV adoption %, industrial electrification pace, DSM offset up to 20%.
- **F-203 Sectoral composition chart.** Stacked-area chart of sectoral demand shares to 2050.

### 4.3 Module 3 — Scenario Builder & Energy Balancer

- **F-301 Supply mix configuration.** Slider per channel assigning deployed capacity (MW) or target production (TWh) for each milestone year. Capacity is the stored value; TWh entry is inverted through the channel's capacity factor (SPEC §3.2).
- **F-302 Real-time adequacy & balance.**
  ```
  ΔE_t = Supply_t − NetDemand_t       [TWh]
  ```
  - *Deficit alert* — when `ΔE_t < 0`, show unserved energy (TWh) and the implied firm-capacity shortfall (MW).
  - *Curtailment advisory* — when variable renewable output exceeds what demand plus storage can absorb, quantify the curtailed energy. **v1 uses a documented proxy** (SPEC §4.4); the alert carries a label saying so.
- **F-303 Baseline scenario presets.** One-click templates: (1) 100% renewables & long-duration storage; (2) SMR baseload + gas-with-CCS anchor; (3) regional connectivity hub; (4) indigenous gas & energy independence.
- **F-304 Scenario persistence & comparison.** Scenarios encode into the URL and persist in `localStorage`; permalinks are shareable without an account. Side-by-side delta comparison of any two scenarios. JSON export/import. *(No user accounts in v1 — see §7.)*

### 4.4 Module 4 — Impact & Analytics Dashboard

Recalculates on every input change.

- **F-401 Generation mix breakdown.** Radial and stacked-column views of annual TWh contribution and share per technology.
- **F-402 Greenhouse gas accounting.**
  ```
  Emissions_t = Σ_i (Generation_i,t × CarbonIntensity_i)     [MtCO₂e]
  ```
  Benchmarked against Israel's Paris Agreement targets and the 2050 net-zero trajectory, with a separate methane-leakage footprint for upstream and midstream gas operations. The accounting basis (lifecycle vs combustion-only) and the GWP horizon are displayed with the figure (SPEC §4.3, OQ-2/OQ-3).
- **F-403 Economic & system cost modelling.** Weighted average system cost `LCOE_System` in $/MWh, with CAPEX annualized over each channel's economic lifetime (SPEC §4.5 — the v1.0 formula summed a capital stock against annual flows). A tariff **direction** index (significant reduction / stable / moderate increase / severe spike) derived from the change against the 2025 baseline, labelled in the UI as directional and not a price forecast.
- **F-404 System reliability & autonomy index.** 0–100 composite over import dependency, firm-capacity margin against peak demand, and dispatchable share of generation (SPEC §4.6). Component sub-scores are always visible alongside the composite.

---

## 5. Technical Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                    Next.js 15 (App Router, TypeScript)               │
│  Presentation  Tailwind CSS · shadcn/ui · Lucide                     │
│  Charts        Recharts (radar, stacked area, gauges)                │
│  Localization  i18next — Hebrew (RTL) + English (LTR), both from v1  │
│  State         Zustand (scenario state, URL-encoded)                 │
├──────────────────────────────────────────────────────────────────────┤
│  lib/engine — the ONE calculation engine (pure TypeScript)           │
│  Imported directly by the client for instant feedback, and by the    │
│  route handlers for export. No second implementation, no parity drift│
├──────────────────────────────────────────────────────────────────────┤
│  Route handlers (thin API)                                           │
│  Reference-data reads · scenario permalinks · PDF / Excel export     │
├──────────────────────────────────────────────────────────────────────┤
│  SQLite (file-based, no server install) via Drizzle ORM              │
│  Reference data ingested from the source xlsx: channels, axes,       │
│  storage assets, demand sectors, roadmaps, parameter sets            │
└──────────────────────────────────────────────────────────────────────┘
```

### 5.1 Why This Differs From v1.0

| v1.0 | v2.0 | Reason |
| :--- | :--- | :--- |
| FastAPI/Python server + PostgreSQL | Next.js route handlers + file-based SQLite | No accounts, no multi-tenancy and a small static reference dataset in v1; a database server is operational cost without a v1 benefit. Postgres remains a drop-in later via Drizzle. |
| "Prisma / SQLAlchemy ORM" | Drizzle ORM | The original named a Node ORM and a Python ORM for the same layer. |
| Client micro-engine **and** server verification engine | One engine module, two call sites | Two implementations of the same equations is the classic source of numbers that disagree with themselves. |

### 5.2 Performance Strategy

All KPI math runs synchronously in the browser against in-memory reference data. Budget: engine compute ≤ 16 ms (one frame) for a full scenario; end-to-end re-render ≤ 100 ms p95 on a mid-tier laptop. Server round-trips are reserved for export and permalink persistence, never for values the user is dragging a slider against.

Hourly dispatch (Phase 3) will run server-side; the client keeps the annual engine for optimistic feedback.

---

## 6. UI & Experience Guidelines

- **Bilingual, bidirectional native.** Hebrew (RTL) is the primary layout, English (LTR) fully supported. Both catalogues are maintained from the first commit; layout uses CSS logical properties throughout, never physical `left`/`right`.
- **Dual-pane workspace.**
  - *Input pane (collapsible side panel)* — demand assumptions, milestone-year toggle, categorized supply sliders with direct numeric entry.
  - *Analytics canvas (main viewport)* — KPI scorecards (balance status, net emissions, relative cost, reliability score) above the visualization widgets.
- **Visual states.**
  - *Balanced / sustainable* — semantic green.
  - *Supply deficit / reliability risk* — high-contrast warning with the shortfall quantified in TWh and MW.
  - *Excess curtailment* — amber advisory suggesting storage addition or export, marked as a proxy estimate.
- **Provenance is always reachable.** Every displayed number exposes its source and dataset version on hover or focus. This is a requirement, not a nicety: the audience will cite these figures.
- **Never colour alone.** Status is carried by icon and text as well as hue.

---

## 7. Non-Functional Requirements

| # | Requirement |
| :--- | :--- |
| NFR-1 | **Performance.** Engine compute ≤ 16 ms; slider-to-repaint ≤ 100 ms p95, mid-tier laptop, full channel set. Enforced by an automated budget test in CI. |
| NFR-2 | **Accessibility.** WCAG 2.2 AA, verified in both locales. Full keyboard operation; charts have accessible table equivalents. *(Israeli Standard 5568 baseline — confirm required level, OQ-8.)* |
| NFR-3 | **Browser support.** Last two versions of Chrome, Edge, Firefox, Safari. Desktop-first; usable at tablet width. |
| NFR-4 | **Privacy.** No accounts, no personal data collected, no third-party analytics by default. Scenario permalinks contain only scenario parameters. |
| NFR-5 | **Reproducibility.** Every scenario records `schema_version` and `dataset_version`; a permalink re-evaluates against the dataset it was built on, and warns when a newer one exists. |
| NFR-6 | **Traceability.** Every reference figure carries a source citation surfaced in the UI and retained through export. |
| NFR-7 | **Auditability of the model.** The engine is pure functions with no I/O; every equation is unit-tested against the source workbook. |
| NFR-8 | **Localization completeness.** No untranslated string ships; CI fails on a missing key in either catalogue. |

### Out of Scope for v1

User accounts and roles · hourly/8760 dispatch · Monte-Carlo sensitivity · public research API · real-time data feeds from Noga/IEC · mobile-optimized layout · scenario collaboration or commenting.

---

## 8. Roadmap

| Phase | Theme | Contents |
| :--- | :--- | :--- |
| **1** | Foundation | xlsx ingestion pipeline, data layer, calculation engine with parity tests, bilingual/RTL shell, F-101 matrix, F-102 detail sheets, KPI scorecard shell |
| **2** | Demand & mix | Demand profiling engine (F-201/202/203), supply sliders and live balance (F-301/302), preset scenarios (F-303) |
| **3** | Analytics | Hourly dispatch replacing the v1 proxies, system LCOE with grid-upgrade modelling, GHG and methane gauges, side-by-side comparison (F-304) |
| **4** | Policy tools | Scenario permalinks at scale, PDF executive summaries, sensitivity / Monte-Carlo runs, public API for research teams |

Phase 1 is broken to task level in [DEV-PLAN.md](DEV-PLAN.md). Phases 2–4 are deliberately left at this altitude: their detail depends on what the dataset and the v1 engine reveal.

---

## 9. Acceptance Criteria

Each is automatable or has a defined protocol.

| # | Criterion | Verification |
| :--- | :--- | :--- |
| AC-1 | **Numerical parity.** For each milestone year, the engine reproduces the source workbook's baseline scenario for total generation, ΔE, total emissions and system LCOE within ±0.5%. | Golden-file test generated from the xlsx, run in CI |
| AC-2 | **Responsiveness.** NFR-1 budgets met. | Automated performance test in CI |
| AC-3 | **Round-trip integrity.** Export → import of a scenario yields byte-identical parameters and identical KPI outputs. | Property test over randomized scenarios |
| AC-4 | **Bilingual completeness.** Both catalogues complete; Hebrew route renders RTL with no layout defects on any Phase 1 screen. | CI key-parity check + visual regression in both locales |
| AC-5 | **Accessibility.** No WCAG 2.2 AA violations on Phase 1 screens in either locale. | Automated axe scan in CI + one manual keyboard/screen-reader pass |
| AC-6 | **Usability.** ≥ 6 of 8 non-technical domain stakeholders construct a scenario with `ΔE ≥ 0` for 2040 unassisted within 10 minutes. | Moderated session, scheduled at end of Phase 2 (needs Module 3) |

*AC-6 replaces v1.0's "85% of stakeholders" with a stated sample, task and threshold. It cannot be run before Phase 2, because the scenario builder does not exist until then.*

---

## 10. Open Questions

Each has a working default so development is not blocked. Answers change parameters, not architecture. Owner: client / domain lead.

| # | Question | Working default until answered |
| :--- | :--- | :--- |
| OQ-1 | Discount rate for CAPEX annualization — social (public-project) or commercial? | 7% real, USD 2025 |
| OQ-2 | Methane GWP horizon — GWP100 or GWP20? | GWP100, IPCC AR6 (29.8 for fossil methane) |
| OQ-3 | Carbon intensity basis — lifecycle or combustion-only? | As given by the source workbook; basis displayed with every figure |
| OQ-4 | Transmission & distribution loss rate (absent from v1.0 entirely) | 3.5% of net demand |
| OQ-5 | System load factor, for deriving peak demand from annual energy | 0.62 |
| OQ-6 | Does the source workbook treat efficiency as a supply channel or a demand reduction? Does it yield exactly 17 channels? §3.1 of v1.0 enumerated more than 17 across its 9 axes. | Efficiency mapped to demand at ingestion; actual channel count taken from the data and reported |
| OQ-7 | Carbon intensity to assign to imported electricity (interconnector) | Source-country grid average, per import channel |
| OQ-8 | Required accessibility conformance level for government procurement | WCAG 2.2 AA |
| OQ-9 | Hosting target — Israeli government cloud, commercial cloud, or on-premises? | Assume a standard Node host; avoid platform-specific APIs |
| OQ-10 | Is the curtailment ceiling `α` (max VRE energy share absorbable without dispatch modelling) calibratable from the workbook? | 0.35, flagged as a proxy in the UI |

---

## Appendix A — Changes from v1.0

The v1.0 document was a Google Docs export in which all 35 equations and numeric targets were embedded PNG images, making the model unreadable as text and unusable as a specification. All were transcribed into the text above. Substantive corrections:

1. **Efficiency double-counting** — was both supply axis 1 and the `η_Efficiency` demand reducer. Now demand-side only.
2. **Storage as generation** — BESS, pumped hydro and hydrogen storage were supply channels contributing to `Σ Generation`. Now a separate entity kind contributing zero generation.
3. **Ambiguous `Generation`** — was both a user-entered TWh and a capacity-derived quantity. Capacity is now canonical; TWh entry inverts through the capacity factor.
4. **LCOE formula** — summed raw CAPEX against annual OPEX and fuel. Now annualized via a capital recovery factor, with currency, base year and discount rate declared.
5. **Missing transmission losses** — no loss term existed; every scenario was biased by the grid loss rate. Added explicitly.
6. **F-403 and F-404 had no formulas.** Both now fully specified in SPEC §4.
7. **Trilemma aggregation was undefined** across 14 sub-scores. Weighting rule now specified.
8. **Architecture contradictions** — "Prisma / SQLAlchemy"; and a dual client/server engine mandating two implementations of one model. Resolved per §5.1.
9. **Response-time targets conflicted** — §5.1 promised 50 ms, §8 accepted ≤100 ms. Reconciled as a 16 ms compute budget within a 100 ms p95 re-render target.
10. **Unmeasurable acceptance criteria** — rewritten per §9.
