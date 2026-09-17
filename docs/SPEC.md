# Technical Specification

## Israel Energy Pathways 2050 — Domain Model, Calculation Engine, Data Schema, API

| | |
| --- | --- |
| **Status** | Ready for implementation |
| **Version** | 1.0 |
| **Companions** | [PRD.md](PRD.md) — product scope · [DEV-PLAN.md](DEV-PLAN.md) — build sequence |

This document is normative. Where it and the PRD disagree on a number or formula, this document wins. Every default marked **(OQ-n)** is a working assumption pending the answer to that open question in [PRD §10](PRD.md#10-open-questions); all are single constants in `lib/engine/config.ts`, changeable without touching logic.

---

## 1. Conventions

### 1.1 Units

| Quantity | Unit | Notes |
| :--- | :--- | :--- |
| Power / capacity | MW | Never GW internally |
| Energy (annual) | TWh | Never GWh internally |
| Storage energy capacity | MWh | Converted at the boundary |
| Carbon intensity | gCO₂e/kWh | |
| Emissions | MtCO₂e | |
| Cost (levelized) | USD/MWh, real, base year 2025 | |
| CAPEX | USD/kW | |
| Fixed O&M | USD/kW-year | |
| Variable O&M, fuel | USD/MWh | |
| Efficiency, capacity factor, rates | Dimensionless fraction 0–1 | Never percent internally; percent is a display concern |

**Rule.** Units are encoded in every field name (`capacity_mw`, `generation_twh`, `carbon_intensity_g_per_kwh`). Conversion happens only at ingestion and at display. No bare numeric field names.

`HOURS_PER_YEAR = 8760` (no leap-year adjustment; the model is not sub-annual).

### 1.2 Milestone years

```ts
type MilestoneYear = 2025 | 2030 | 2040 | 2050;
```

`2025` is the **baseline year**. It is calibrated to the source workbook and is used as the comparison denominator for the tariff direction index (§4.7). Interpolation between milestones is not performed in v1.

### 1.3 Numerical conventions

- All engine functions are pure: `(inputs) => outputs`. No I/O, no dates, no randomness, no React.
- Floating point throughout; no rounding inside the engine. Rounding is a formatting concern.
- Division guards: any denominator that can be zero (e.g. `Σ Generation` in an empty scenario) returns `null`, not `NaN` or `Infinity`. The UI renders `null` as "—", never as `0`.

---

## 2. Domain Model

Three entity kinds. The separation is the central modelling correction from PRD v1.0.

### 2.1 `SupplyChannel` — produces energy

```ts
interface SupplyChannel {
  channel_id: string;              // stable slug, e.g. "solar_utility_scale"
  axis: AxisId;
  display_name_en: string;
  display_name_he: string;

  // Technical
  dispatchability: 'variable' | 'dispatchable' | 'baseload' | 'import';
  max_capacity_mw: number;         // deployment ceiling
  capacity_factor: number;         // 0–1, expected annual average
  max_annual_generation_twh: number | null;  // independent ceiling (e.g. resource- or contract-limited)

  // Environmental
  carbon_intensity_g_per_kwh: number;
  carbon_intensity_basis: 'lifecycle' | 'combustion';   // OQ-3
  methane_leak_rate: number | null;                     // 0–1, fraction of fuel throughput, gas channels only
  renewable_fraction: number;                           // 0–1

  // Economic
  capex_usd_per_kw: number;
  fixed_om_usd_per_kw_year: number;
  var_om_usd_per_mwh: number;
  fuel_cost_usd_per_mwh: number;   // 0 for fuel-free channels
  conversion_efficiency: number;   // 0–1; used for fuel-cost and methane scaling
  economic_lifetime_years: number;

  // Assessment
  trilemma: TrilemmaScores;
  feasibility: 'high' | 'medium' | 'low';
  trl: number | null;              // 1–9
  bottlenecks: Bottleneck[];

  // Provenance — NFR-6
  source_ref: string;              // workbook sheet + cell range, or citation
}
```

`dispatchability` drives three behaviours: whether the channel is dispatched down under merit order (§3.3), whether it counts toward firm capacity (§4.6), and whether it counts as variable renewable output for curtailment (§4.4).

### 2.2 `StorageAsset` — shifts energy, generates none

```ts
interface StorageAsset {
  storage_id: string;
  axis: AxisId;                    // 'storage'
  display_name_en: string;
  display_name_he: string;

  power_capacity_mw: number;       // discharge rating
  energy_capacity_mwh: number;     // usable energy
  round_trip_efficiency: number;   // 0–1
  cycles_per_year: number;         // expected annual full-equivalent cycles
  availability_factor: number;     // 0–1, contribution to firm capacity

  capex_usd_per_kw: number;
  fixed_om_usd_per_kw_year: number;
  economic_lifetime_years: number;

  source_ref: string;
}
```

**A storage asset never appears in `Σ Generation`.** It (a) subtracts round-trip losses from delivered energy, (b) absorbs otherwise-curtailed variable output, (c) contributes firm capacity.

### 2.3 `DemandSector` — consumes energy

```ts
interface DemandSector {
  sector_id: 'bau' | 'ev' | 'ai' | 'industry' | 'water';
  display_name_en: string;
  display_name_he: string;
  // Per-milestone demand under each named trajectory
  projections: Record<TrajectoryId, Record<MilestoneYear, number>>;  // TWh
  source_ref: string;
}
```

Efficiency and DSM are **not** a sector in this list. They are the multiplier `η_Efficiency,t` applied to gross demand (§3.1) — a reduction, never a source. See PRD Appendix A.1.

### 2.4 Trilemma scores

```ts
interface TrilemmaScores {
  security: {                      // 5 sub-scores, each 1–5
    import_dependency: number; fuel_diversity: number; storage_capability: number;
    grid_reliability: number; system_redundancy: number;
  };
  environment: {                   // 5 sub-scores
    carbon_intensity: number; renewable_fraction: number; conversion_efficiency: number;
    air_quality: number; methane_leakage: number;
  };
  equity: {                        // 4 sub-scores
    tariff_impact: number; fuel_cost_impact: number;
    industrial_competitiveness: number; access_equity: number;
  };
}
```

All sub-scores are oriented so **5 is best**. Ingestion asserts this orientation per column and fails loudly on a violation — a silently inverted `import_dependency` would flip the security axis of every chart.

---

## 3. Scenario Model

### 3.1 Scenario shape

```ts
interface Scenario {
  schema_version: 1;               // NFR-5
  dataset_version: string;         // hash + date of the ingested workbook
  id: string;
  name_en: string; name_he: string;

  demand: {
    trajectory: TrajectoryId;                          // F-201 preset
    sector_overrides: Partial<Record<SectorId, Record<MilestoneYear, number>>>;  // F-202, TWh
    efficiency_offset: Record<MilestoneYear, number>;  // η, 0–0.20 (F-202 caps DSM at 20%)
  };

  supply: Record<string, Record<MilestoneYear, number>>;   // channel_id → year → capacity_mw
  storage: Record<string, Record<MilestoneYear, number>>;  // storage_id → year → power_capacity_mw

  overrides?: Partial<EngineConfig>;   // scenario-local parameter overrides (discount rate, etc.)
}
```

**Capacity is canonical.** `supply` stores MW. F-301 permits entry in TWh; the UI inverts it immediately (§3.2) and stores the MW. The engine never receives a user-supplied TWh. This removes the PRD v1.0 ambiguity in which `Generation` was both an input and a derived value.

Storage scales by power rating; energy capacity scales with it proportionally to the reference asset's energy-to-power ratio (`energy_capacity_mwh / power_capacity_mw`), which is held constant. A user who wants a different duration configures a different storage asset.

### 3.2 Capacity ↔ energy conversion

```
generation_twh = capacity_mw × capacity_factor × utilization × HOURS_PER_YEAR / 1e6
capacity_mw    = generation_twh × 1e6 / (capacity_factor × HOURS_PER_YEAR)     // utilization = 1
```

TWh-entry inversion assumes full utilization, so entering a TWh figure means "build enough to produce this much if never curtailed or dispatched down". The UI shows the resulting MW immediately so the assumption is visible.

### 3.3 Merit-order utilization

Without this, a scenario with 30 GW of solar *and* the existing gas fleet reports both running at full capacity factor, producing an enormous phantom surplus. The engine therefore dispatches down.

```
1. Compute must-run output:  variable + baseload + import channels at full CF.
2. residual = NetDemand − mustRun
3. If residual ≤ 0:  every dispatchable channel gets utilization = 0.
   Surplus is then attributed to the must-run group and evaluated for curtailment (§4.4).
4. If residual > 0:  sort dispatchable channels ascending by short-run marginal cost
                     (var_om + fuel_cost / conversion_efficiency).
                     Fill residual in that order; each channel takes
                     min(remaining residual, its full-CF output).
                     utilization_i = assigned_twh / full_cf_twh, in [0, 1].
5. If residual remains after all dispatchable output is exhausted, the deficit
   flows through to ΔE < 0 (F-302 deficit alert).
```

This is an annual-energy merit order, not a chronological dispatch. It cannot represent a plant that is needed for 200 hours a year and idle otherwise — which is exactly what Phase 3's hourly dispatch is for. The limitation is documented in the UI beside the generation mix.

`baseload` channels (SMR, geothermal) are must-run by definition. `import` channels are must-run in v1 (contracted take-or-pay assumption); this is a simplification worth revisiting when interconnector contracts are modelled.

---

## 4. Calculation Engine

Module layout, each file a pure function set with its own unit tests:

```
lib/engine/
  config.ts       EngineConfig + defaults (every OQ default lives here)
  demand.ts       §4.1
  generation.ts   §3.2, §3.3
  balance.ts      §4.2
  emissions.ts    §4.3
  curtailment.ts  §4.4
  cost.ts         §4.5
  reliability.ts  §4.6
  trilemma.ts     §4.8
  index.ts        evaluateScenario() — the single entry point
```

### 4.1 Demand

```
GrossDemand_t = Σ_s Demand_s,t                          [TWh]   s ∈ {bau, ev, ai, industry, water}
NetDemand_t   = GrossDemand_t × (1 − η_Efficiency,t)    [TWh]
```

`Demand_s,t` is the sector override when present, else the selected trajectory's projection. `η_Efficiency,t ∈ [0, 0.20]` (F-202 cap).

### 4.2 Balance

```
RawGeneration_t     = Σ_i Generation_i,t                                  [TWh]
StorageLosses_t     = Σ_k Throughput_k,t × (1 − round_trip_efficiency_k)  [TWh]   (§4.4)
TnDLosses_t         = NetDemand_t × tnd_loss_rate                         [TWh]   default 0.035 (OQ-4)
Supply_t            = RawGeneration_t − StorageLosses_t − TnDLosses_t     [TWh]
ΔE_t                = Supply_t − NetDemand_t                              [TWh]
```

T&D losses are absent from PRD v1.0 entirely. Omitting them overstates every scenario's adequacy by roughly the loss rate — on ~90 TWh of demand that is over 3 TWh, comparable to a large power station.

Losses are charged against net demand (delivered energy), not against generation, so that a scenario's losses do not shrink when the supply mix changes — which would be wrong: line losses track the energy delivered, not how it was made.

**Deficit reporting (F-302).** When `ΔE_t < 0`:
- Unserved energy = `|ΔE_t|` TWh.
- Implied firm-capacity shortfall = `FirmCapacityRequired_t − FirmCapacity_t` MW (§4.6). Reported as a separate figure, because an energy deficit and a capacity deficit are different failures and PRD v1.0's "MW/TWh" shortfall label conflated them.

### 4.3 Emissions

```
CombustionEmissions_t = Σ_i (Generation_i,t × carbon_intensity_i) / 1000            [MtCO₂e]
MethaneEmissions_t    = Σ_i∈gas (FuelThroughput_i,t × methane_leak_rate_i
                                  × CH4_DENSITY × GWP)                              [MtCO₂e]
FuelThroughput_i,t    = Generation_i,t / conversion_efficiency_i                     [TWh thermal]
Emissions_t           = CombustionEmissions_t + MethaneEmissions_t                   [MtCO₂e]
```

- `GWP = 29.8` — IPCC AR6 GWP100 for fossil methane (OQ-2). GWP20 (82.5) is a config switch; the UI displays which horizon is active, because the two differ by ~3× and the choice materially changes gas-heavy scenarios.
- Channels whose `carbon_intensity_basis` is `lifecycle` already include upstream methane. **Applying the separate methane term to them would double-count**, so the methane term applies only to channels with `basis = 'combustion'`. The engine asserts this and the UI displays the basis (OQ-3).
- Imported electricity carries the source-country grid intensity (OQ-7), not zero. An interconnector is not automatically clean.
- Cumulative emissions across milestones use trapezoidal integration between milestone years, and are labelled an approximation (milestones are 5–10 years apart).

### 4.4 Storage throughput and curtailment (proxy)

**This section is a proxy, and every figure derived from it is labelled as such in the UI.** Real curtailment is a chronological phenomenon; v1 has no chronology. Phase 3 replaces this wholesale.

```
VRE_t              = Σ_i∈variable Generation_i,t                                     [TWh]
StorageThroughput_t= Σ_k (energy_capacity_mwh_k × cycles_per_year_k) / 1e6           [TWh]
AbsorbableVRE_t    = α × NetDemand_t + StorageThroughput_t                           [TWh]
Curtailment_t      = max(0, VRE_t − AbsorbableVRE_t)                                 [TWh]
Throughput_k,t     = actual energy cycled through storage k, capped by both its own
                     capacity and the surplus available to absorb
```

`α = 0.35` (OQ-10) is the annual variable-renewable energy share the system is assumed to absorb without storage — a stand-in for instantaneous-share limits, minimum stable generation, and inertia constraints. **It must be calibrated against the source workbook if the workbook carries curtailment figures**; otherwise it is an editorial assumption and is presented as one.

Generation reported in the mix chart is post-curtailment; `RawGeneration_t` in §4.2 is net of curtailment for variable channels.

### 4.5 System cost

PRD v1.0's formula added CAPEX (a capital stock, USD) to OPEX and fuel (annual flows, USD/year) and divided by annual generation — dimensionally inconsistent, and it would have made capital-intensive pathways look roughly an order of magnitude more expensive than they are. Corrected:

```
CRF_i          = r(1+r)^n_i / ((1+r)^n_i − 1)                      capital recovery factor
AnnualCapex_i  = capex_usd_per_kw_i × capacity_mw_i × 1000 × CRF_i               [USD/yr]
AnnualFixed_i  = fixed_om_usd_per_kw_year_i × capacity_mw_i × 1000               [USD/yr]
AnnualVar_i    = (var_om_i + fuel_cost_i / conversion_efficiency_i)
                 × Generation_i,t × 1e6                                          [USD/yr]
AnnualCost_i   = AnnualCapex_i + AnnualFixed_i + AnnualVar_i                     [USD/yr]

Cost_storage,t = Σ_k (capex_k × power_mw_k × 1000 × CRF_k + fixed_om_k × power_mw_k × 1000)
Cost_grid,t    = grid_cost_usd_per_mw_added × Σ(capacity added since baseline)   [USD/yr]

LCOE_System,t  = (Σ_i AnnualCost_i + Cost_storage,t + Cost_grid,t)
                 / (Σ_i Generation_i,t × 1e6)                                    [USD/MWh]
```

- `r = 0.07` real (OQ-1). A public-sector social discount rate (~3%) roughly halves the apparent cost of capital-intensive pathways — this single parameter can reverse a nuclear-vs-gas comparison, so it is surfaced in the UI as an adjustable assumption, not buried in config.
- All costs real, base year 2025. No inflation modelling.
- Fixed costs are charged on **installed capacity**, variable costs on **actual generation**. A dispatchable plant held at low utilization by merit order therefore still carries its full capital charge — which is the economically correct and politically relevant result.
- `Cost_grid` is a linear placeholder in v1; Phase 3 introduces real grid-upgrade modelling as the PRD roadmap schedules.

### 4.6 Firm capacity and the reliability index (F-404)

```
PeakDemand_t      = NetDemand_t × 1e6 / (HOURS_PER_YEAR × load_factor)           [MW]   load_factor = 0.62 (OQ-5)
FirmCapacity_t    = Σ_i∈{dispatchable,baseload} capacity_mw_i × availability_i
                  + Σ_k power_capacity_mw_k × availability_factor_k
                  + Σ_i∈import capacity_mw_i × import_firmness                   [MW]
ReserveMargin_t   = FirmCapacity_t / PeakDemand_t − 1
FirmCapacityRequired_t = PeakDemand_t × (1 + target_reserve_margin)              target = 0.15
```

Variable channels contribute **zero** firm capacity in v1. This is conservative and deliberately so; a capacity-credit treatment for solar requires the hourly model. `import_firmness = 0.5` by default — an interconnector is a real but politically interruptible resource.

Composite index, 0–100:

```
s_autonomy    = 1 − (imported electricity + imported fuel energy) / total primary energy
s_adequacy    = clamp(ReserveMargin_t / target_reserve_margin, 0, 1)
s_dispatchable= (dispatchable + baseload generation + storage throughput) / RawGeneration_t

ReliabilityIndex_t = 100 × (w_a·s_autonomy + w_d·s_adequacy + w_f·s_dispatchable)
                     w_a = w_d = w_f = 1/3 by default, configurable
```

The three sub-scores are **always displayed alongside the composite**. A single 0–100 number hides which of three unrelated failure modes is driving it, and this figure will be quoted in policy documents.

### 4.7 Tariff direction index (F-403)

```
Δ_t = (LCOE_System,t − LCOE_System,2025) / LCOE_System,2025
```

| Δ | Band |
| :--- | :--- |
| `< −0.10` | Significant reduction |
| `−0.10 … +0.05` | Stable |
| `+0.05 … +0.25` | Moderate increase |
| `> +0.25` | Severe spike |

Thresholds are config values. **Mandatory UI treatment:** the band is displayed with the explicit qualifier that it indicates system generation-cost direction, not consumer tariffs — which additionally embed network charges, taxes, levies, cross-subsidies and regulatory lag. Omitting this qualifier invites a number from this tool being cited as a predicted electricity bill.

### 4.8 Trilemma aggregation

```
DimensionScore_i,d = mean(sub-scores of dimension d for channel i)        1–5
PortfolioScore_d   = Σ_i (Generation_i,t × DimensionScore_i,d) / Σ_i Generation_i,t
```

Generation-weighted, so a channel contributing 0.1 TWh does not sway the portfolio score as much as one contributing 40 TWh. Sub-score weights within a dimension default to equal and live in config. The F-102 radar chart plots the three per-channel dimension means; the dashboard plots the three portfolio scores.

### 4.9 Engine entry point

```ts
function evaluateScenario(
  scenario: Scenario,
  dataset: ReferenceDataset,
  config?: Partial<EngineConfig>,
): ScenarioResult;

interface ScenarioResult {
  by_year: Record<MilestoneYear, YearResult>;
  cumulative_emissions_mtco2e: number;
  warnings: EngineWarning[];       // capacity over ceiling, proxy in use, missing data, …
}

interface YearResult {
  gross_demand_twh: number; net_demand_twh: number;
  generation_by_channel_twh: Record<string, number>;
  raw_generation_twh: number; curtailment_twh: number;
  storage_losses_twh: number; tnd_losses_twh: number;
  supply_twh: number; delta_e_twh: number;
  peak_demand_mw: number; firm_capacity_mw: number;
  firm_capacity_shortfall_mw: number | null;
  emissions_mtco2e: number; combustion_mtco2e: number; methane_mtco2e: number;
  lcoe_system_usd_per_mwh: number | null;
  tariff_band: TariffBand;
  reliability: { index: number; autonomy: number; adequacy: number; dispatchable: number };
  trilemma: { security: number; environment: number; equity: number };
}
```

`warnings` is not decoration. A scenario exceeding `max_capacity_mw`, or relying on the curtailment proxy, or hitting missing cost data for a channel, must surface that to the user rather than silently producing a confident number.

---

## 5. Data Layer

### 5.1 Storage choice

File-based SQLite (`better-sqlite3`) accessed through Drizzle ORM. No server process, no installation. The database holds ingested reference data only; scenarios live in the URL and `localStorage` (PRD §7, no accounts in v1).

The schema is written to be Postgres-portable — no SQLite-specific types, timestamps as ISO strings — so Phase 4's public API can move to Postgres by swapping the Drizzle driver.

### 5.2 Tables

| Table | Contents |
| :--- | :--- |
| `axes` | `axis_id`, `display_name_en`, `display_name_he`, `sort_order` |
| `supply_channels` | §2.1, flattened; Trilemma sub-scores as columns |
| `storage_assets` | §2.2 |
| `demand_sectors` | §2.3 metadata |
| `demand_projections` | `sector_id`, `trajectory_id`, `year`, `demand_twh` |
| `roadmap_phases` | `channel_id`, `phase` (2025-2030 / 2030-2040 / 2040-2050), milestone text (en/he), legislative steps, TRL, environmental impact |
| `bottlenecks` | `channel_id`, `kind`, description (en/he) |
| `presets` | F-303 baseline scenarios as scenario JSON |
| `dataset_meta` | `dataset_version`, source filename, SHA-256, ingested_at, row counts |

Every content table carries `source_ref` (NFR-6). Every bilingual field is a pair of columns, not a JSON blob — so a missing Hebrew string is a schema-visible `NULL` that CI can fail on (NFR-8), rather than an absent key discovered in production.

### 5.3 Ingestion pipeline

`scripts/ingest-xlsx.ts`, run manually when the workbook changes — not at build time, not at runtime.

```
xlsx  →  parse (SheetJS)
      →  map columns to domain fields via an explicit, committed column map
      →  validate with Zod (types, ranges, score orientation, required fields)
      →  reconcile (unit normalization, efficiency → demand-side, storage → storage_assets)
      →  write db/reference.sqlite
      →  write db/snapshot.json          ← committed to git
      →  write db/ingest-report.md       ← committed to git
```

- **`db/snapshot.json` is committed.** A binary SQLite file produces no reviewable diff. When the workbook is revised, the JSON snapshot shows exactly which figures moved — essential when the outputs inform policy.
- **`db/ingest-report.md`** records row counts, the resolved channel list, every value coerced or defaulted, and every validation warning. This is where OQ-6 gets answered empirically: how many channels actually exist, and whether efficiency appears as supply or demand in the source.
- **Ingestion fails closed.** A range violation or an unmapped required column aborts the run. It does not write a partial database.
- `dataset_version` = `YYYYMMDD` of the workbook + first 8 characters of its SHA-256.

### 5.4 Scenario encoding

- **URL** — scenario JSON, minified through a short-key codec, deflate-compressed, base64url-encoded, in the query string. Target under 1,800 characters for a full scenario, keeping it inside every browser and mail-client URL limit. If a scenario exceeds the budget the UI offers file export instead of a truncated link.
- **`localStorage`** — the working scenario plus a named list, under a versioned key (`eps:scenarios:v1`). All access wrapped in try/catch; the app is fully functional with storage unavailable.
- **File** — `.json` export of the raw `Scenario` object, human-readable and diffable.

All three carry `schema_version` and `dataset_version`. Loading a scenario whose `dataset_version` differs from the current dataset evaluates it against the current data and shows a non-dismissable notice naming both versions (NFR-5).

---

## 6. API Contract

Next.js route handlers. No authentication (PRD §7). All responses JSON unless noted.

| Method | Route | Purpose |
| :--- | :--- | :--- |
| `GET` | `/api/dataset` | Full reference dataset + `dataset_version`. Immutable-cached by version. |
| `GET` | `/api/dataset/channels/:id` | Single channel with roadmap and bottlenecks (F-102) |
| `GET` | `/api/presets` | F-303 preset scenarios |
| `POST` | `/api/scenario/evaluate` | Server-side evaluation. Same `lib/engine`; exists for export and future API consumers, **not** for interactive use. |
| `POST` | `/api/export/json` | Scenario + results as a download |
| `POST` | `/api/export/xlsx` | Results workbook (Phase 2) |
| `POST` | `/api/export/pdf` | Executive summary (Phase 4) |
| `POST` | `/api/permalink` | Store an oversized scenario, return a short id (Phase 4) |

**The client never calls `/api/scenario/evaluate` on slider input.** It imports `lib/engine` directly. The route exists so exports and any future external consumer run the same code path — one implementation, two call sites (PRD §5.1).

Errors: `{ error: { code, message_en, message_he, details? } }` with conventional status codes. Validation failures return 422 with the Zod issue list.

---

## 7. Internationalization Contract

i18next with Next.js App Router, locale as the first path segment: `/he/...` (default) and `/en/...`.

- `<html lang>` and `<html dir>` are set per locale at the layout level. `dir` is never set below the root.
- **CSS logical properties only** — `margin-inline-start`, `padding-inline-end`, `inset-inline-start`. Physical `left`/`right` in component CSS fails lint. Tailwind logical utilities (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`) exclusively.
- **Charts mirror; data does not.** Axis placement and legend position follow `dir`; a time axis always runs earliest→latest in reading order, and numerals are always Western Arabic in both locales (standard in Hebrew technical writing).
- Numbers and units via `Intl.NumberFormat` with the active locale. Unit symbols (TWh, MW, gCO₂e/kWh) stay Latin in both locales — this is Israeli energy-sector convention; translating them would reduce clarity for the primary persona.
- Key naming: `module.feature.element` — e.g. `explorer.matrix.column.capacity`.
- **Hebrew domain terminology is client-owned.** The glossary in `docs/glossary.he.md` is authored with the domain lead before Module 1 UI work; engineering does not invent Hebrew terms for regulated energy concepts.
- CI fails on any key present in one catalogue and absent from the other (NFR-8).

---

## 8. Testing Strategy

| Layer | Approach |
| :--- | :--- |
| **Engine unit** | Every function in `lib/engine` with hand-computed expected values. Includes the degenerate cases: empty scenario, zero demand, single channel, capacity above ceiling, storage without generation. |
| **Parity (AC-1)** | Golden fixtures generated from the workbook's baseline scenario. Asserts generation, ΔE, emissions and LCOE within ±0.5% for each milestone year. Regenerated only by an explicit script run, never automatically — the point is that it breaks when the engine drifts. |
| **Property** | Round-trip: `encode(decode(s)) === s` for randomized scenarios (AC-3). Monotonicity: adding capacity to a zero-carbon channel never increases emissions; raising efficiency never increases net demand. |
| **Ingestion** | Runs against a fixture workbook committed to the repo, asserting the validation rules fire — including deliberately malformed rows. |
| **Component** | Matrix sorting/filtering, detail drawer, slider→KPI wiring. |
| **i18n** | Key parity; RTL visual regression on every Phase 1 screen (AC-4). |
| **Accessibility** | `axe` scan in CI on all Phase 1 screens in both locales (AC-5). |
| **Performance** | Engine compute budget asserted at ≤16 ms for a full scenario (NFR-1). |

---

## 9. Traceability Matrix

| PRD feature | Spec section | Engine module |
| :--- | :--- | :--- |
| F-101 matrix | §2.1, §5.2 | — |
| F-102 detail sheet | §2.4, §4.8, §5.2 | `trilemma.ts` |
| F-201/202 demand | §3.1, §4.1 | `demand.ts` |
| F-203 composition | §4.1 | `demand.ts` |
| F-301 supply config | §3.1, §3.2 | `generation.ts` |
| F-302 balance & alerts | §3.3, §4.2, §4.4 | `balance.ts`, `curtailment.ts` |
| F-303 presets | §5.2 | — |
| F-304 persistence | §5.4, §6 | — |
| F-401 mix breakdown | §3.3, §4.4 | `generation.ts` |
| F-402 GHG | §4.3 | `emissions.ts` |
| F-403 cost & tariff | §4.5, §4.7 | `cost.ts` |
| F-404 reliability | §4.6 | `reliability.ts` |
