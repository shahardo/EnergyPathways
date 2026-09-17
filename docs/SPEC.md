# Technical Specification

## Israel Energy Pathways 2050 — Workbook Model, Presentation Format, Engine, Data, API

| | |
| --- | --- |
| **Status** | Ready for implementation |
| **Version** | 1.1 — realigned to the source workbook |
| **Companions** | [PRD.md](PRD.md) — product scope · [DEV-PLAN.md](DEV-PLAN.md) — build sequence |
| **Source** | `docs/Israel 2050 Pathways 06092026.xlsx`, sheet `Sheet1` |

This document is normative. Where it and the PRD disagree on a number, a colour or a formula, this document wins. Defaults marked **(OQ-n)** are working assumptions pending [PRD §10](PRD.md#10-open-questions); all live in `lib/engine/config.ts`.

Everything in §2, §3 and §5 was extracted from the workbook's OOXML and verified against all 17 columns.

---

## 1. Conventions

### 1.1 Units

| Quantity | Unit |
| :--- | :--- |
| Capacity | MW |
| Annual energy | TWh (electricity) |
| Carbon intensity | gCO₂e/kWh |
| Emissions | MtCO₂e |
| Scores | 1–5, **5 = best** |
| Price-impact trajectory | unitless index, −5…+5 (OQ-12) |
| Fractions (CF, ramp, shares) | 0–1; percent is display-only |

Units appear in every field name (`potential_mw`, `generation_twh`). `HOURS_PER_YEAR = 8760`.

### 1.2 Milestone years

```ts
type MilestoneYear = 2025 | 2030 | 2040 | 2050;
```

### 1.3 Numerical conventions

- Engine functions are pure: no I/O, no `Date`, no randomness, no React.
- No rounding inside the engine; rounding is a display concern.
- A value that does not exist — a blank workbook cell, a zero denominator — is `null`. `null` renders as a blank cell, never as `0` and never as `NaN`.

---

## 2. Workbook Source Map

### 2.1 Sheet properties

| Property | Value |
| :--- | :--- |
| Sheets | one, `Sheet1` |
| Direction | `rightToLeft="1"` |
| Channel columns | `C` … `S` (17), in canonical order |
| Label column | `A`; column `B` holds roadmap sub-group labels |
| Formulas | only the dimension averages (rows 9, 20, 31) |
| Charts | 51 area charts — one per channel × dimension |
| Shapes | 6 callouts (5 unique) |

### 2.2 Row map

| Row(s) | Label (col A) | Content | Visible |
| :--- | :--- | :--- | :-: |
| 1 | ציר | Axis header, merged across axis columns | ✅ |
| 2 | תחום | Channel name | ✅ |
| 3 | פוטנציאל | Potential, string `"3,000 MW"` or `"-"` | ✅ |
| 4 | תלות ביבוא | Security: import dependency | hidden |
| 5 | גיוון | Security: diversity | hidden |
| 6 | יכולת אגירה | Security: storage capability | hidden |
| 7 | אמינות רשת | Security: grid reliability | hidden |
| 8 | יתירות | Security: redundancy | hidden |
| 9 | ביטחון | `=IFERROR(AVERAGE(x4:x8),"")` | ✅ |
| 10–13 | 2025 … 2050 | Generation trajectory, TWh | hidden |
| 14 | — | Sparkline row (height 37.5 pt) | ✅ |
| 15 | עצימות פד"ח | Environment: CO₂ intensity | hidden |
| 16 | % מתחדשות | Environment: renewable share | hidden |
| 17 | יעילות | Environment: efficiency | hidden |
| 18 | איכות אויר | Environment: air quality | hidden |
| 19 | פליטות מתאן | Environment: methane emissions | hidden |
| 20 | סביבה | `=IFERROR(AVERAGE(x15:x19),"")` | ✅ |
| 21–24 | 2025 … 2050 | Emissions trajectory, MtCO₂e | hidden |
| 25 | — | Sparkline row | ✅ |
| 26 | גישה לחשמל | Equity: access to electricity | hidden |
| 27 | בישול נקי | Equity: clean cooking | hidden |
| 28 | מחיר חשמל | Equity: electricity price | hidden |
| 29 | מחיר דלקים | Equity: fuel price | hidden |
| 30 | מחיר לתעשיה | Equity: industrial price | hidden |
| 31 | שוויון | `=IFERROR(AVERAGE(x26:x30),"")` | ✅ |
| 32–35 | 2025 … 2050 | Price-impact trajectory, index | hidden |
| 36 | — | Sparkline row | ✅ |
| 37 | טרילמה | Empty; colour-scaled (OQ-16) | hidden |
| 38 | סבירות | Likelihood: גבוהה / בינונית / נמוכה / `-` | ✅ |
| 39 | חסמים | Barriers, free text | ✅ |
| 40–51 | 2025-2030 (A40:A51) | Roadmap phase 1 — see §2.3 | ✅ |
| 52–60 | 2030-2040 (A52:A60) | Roadmap phase 2 | ✅ |
| 61–66 | 2040-2050 (A61:A66) | Roadmap phase 3 | ✅ |

**Equity has five sub-scores**, not four as PRD v2.0 stated.

### 2.3 Roadmap block structure

Steps occupy **row triplets**: title, detail, challenges. Challenges text begins with the literal prefix `אתגרים:`.

| Phase | Rows | Col B sub-groups | Layout |
| :--- | :--- | :--- | :--- |
| 2025–2030 | 40–51 | יעדים (B40:B42) · צעדים (B43:B48) · אימפקט (B49:B51) | targets rows 40–42; step slots 43–45, 46–48; impact rows 49–51 |
| 2030–2040 | 52–60 | — | step slots 52–54, 55–57, 58–60 |
| 2040–2050 | 61–66 | — | step slots 61–63, 64–66 |

The roadmap is sparse. Targets exist only for C and E; impact rows hold three placeholder labels in column E only (employment, social, resilience & national security) with no values. Not every channel fills every slot, and a slot may have a title with no challenges.

### 2.4 Merged cells

`C1:D1`, `G1:J1`, `M1:O1`, `Q1:R1` (axis headers) · `A40:A51`, `A52:A60`, `A61:A66` (phase labels) · `B40:B42`, `B43:B48`, `B49:B51` (sub-group labels).

### 2.5 Columns

| Col | `channel_id` | Axis group | Potential MW |
| :-- | :--- | :--- | --: |
| C | `efficiency` | efficiency (C–D) | 3,000 |
| D | `demand_reduction` | efficiency (C–D) | — |
| E | `renewables_storage` | renewables | 50,000 |
| F | `regional_interconnection` | electricity_import | 8,000 |
| G | `lng_import` | natural_gas (G–J) | 10,000 |
| H | `gas_ccs` | natural_gas (G–J) | 10,000 |
| I | `pipeline_gas_import` | natural_gas (G–J) | 10,000 |
| J | `gas_generation_expansion` | natural_gas (G–J) | 10,000 |
| K | `fuel_supply` | fuels | — |
| L | `grid_development` | grid | — |
| M | `geothermal` | future_tech (M–O) | 10,000 |
| N | `nuclear_smr` | future_tech (M–O) | 8,000 |
| O | `nuclear_fusion` | future_tech (M–O) | 5,000 |
| P | `hydrogen_import` | hydrogen | 8,000 |
| Q | `deepwater_gas_exploration` | domestic_gas (Q–R) | 2,000 |
| R | `small_gas_fields` | domestic_gas (Q–R) | 1,000 |
| S | `return_to_coal` | coal | 5,000 |

`channel_id` and axis group ids are the stable keys. They are assigned by the ingestion column map, never derived from Hebrew text.

---

## 3. Workbook Model

The workbook stores its trajectories as **static rounded values**. They are not formulas, but they follow an exact model that ingestion recovers and verifies. Phase 1 **displays the stored values verbatim**; the recovered parameters are what makes Phase 2 scenarios possible.

### 3.1 Dimension averages

```
DimensionAverage_i,d = mean of the non-blank sub-scores of channel i in dimension d
                       null if all five are blank
```

This mirrors `IFERROR(AVERAGE(…),"")`: `AVERAGE` skips blanks and errors on all-blank, which `IFERROR` turns into an empty string.

### 3.2 Generation trajectory (rows 10–13)

```
Generation_i,t = potential_mw_i × CF_i × HOURS_PER_YEAR / 1e6 × ramp_t        [TWh]

ramp = { 2025: 0.10, 2030: 0.30, 2040: 0.65, 2050: 1.00 }
```

### 3.3 Emissions trajectory (rows 21–24)

```
Emissions_i,t = Generation_i,t × CI_i / 1000                                   [MtCO₂e]
```

Efficiency's negative intensity represents avoided grid emissions.

### 3.4 Recovered parameters

| Col | Channel | CF | CI (g/kWh) | Generation 2050 (TWh) | Emissions 2050 (Mt) |
| :-- | :--- | --: | --: | --: | --: |
| C | Energy efficiency | 0.5 | −400 | 13.1 | −5.3 |
| D | Demand reduction | — | −400 | 13.1 *(copy of C)* | −5.3 |
| E | Renewables & storage | 0.2 | 0 | 87.6 | 0 |
| F | Regional interconnection | 0.5 | 300 | 35.0 | 10.5 |
| G | LNG imports | 0.6 | 450 | 52.6 | 23.7 |
| H | Gas with CCS | 0.7 | 100 | 61.3 | 6.1 |
| I | Pipeline gas imports | 0.6 | 400 | 52.6 | 21.0 |
| J | Gas generation expansion | 0.6 | 400 | 52.6 | 21.0 |
| K | Fuel supply | — | — | — | — |
| L | Grid development | — | — | — | — |
| M | Geothermal | 0.7 | 0 | 61.3 | 0 |
| N | Nuclear SMR | 0.9 | 0 | 63.1 | 0 |
| O | Nuclear fusion | 0.8 | 0 | 35.0 | 0 |
| P | Hydrogen imports | 0.5 | 0 | 35.0 | 0 |
| Q | Deep-water gas | 0.6 | 400 | 10.5 | 4.2 |
| R | Small gas fields | 0.6 | 400 | 5.3 | 2.1 |
| S | Return to coal | 0.7 | 900 | 30.7 | 27.6 |

### 3.5 Recovery procedure (ingestion)

1. `CF_i = Generation_i,2050 / (potential_mw_i × 8760 / 1e6)`, snapped to the nearest 0.1.
2. `ramp_t = median over columns of Generation_i,t / Generation_i,2050`, snapped to the nearest 0.05.
3. `CI_i = Emissions_i,2050 / Generation_i,2050 × 1000`, snapped to the nearest 50.
4. **Verify** every stored value: `|model − stored| ≤ 0.0501`, the workbook's own one-decimal rounding.
5. A column that fails verification is **not** silently accepted. It is reported with the offending cells, and its parameters are marked unrecovered. Phase 1 still displays its stored values; Phase 2 cannot scenario it until resolved.

Column D has no potential, so its CF cannot be recovered; its values are carried as data (OQ-14).

### 3.6 Price-impact trajectory (rows 32–35)

Static data with no recoverable model and an undefined unit (OQ-12). Displayed verbatim as an index. Not used in any Phase 2 calculation until its meaning is confirmed.

---

## 4. Scenario Engine *(Phase 2+)*

### 4.1 Data gaps

The workbook supports Phase 1 completely. Phase 2 needs data it does not contain:

| Needed for | Data | Workbook |
| :--- | :--- | :--- |
| Net demand, ΔE | Sectoral demand projections by trajectory | ❌ |
| System cost, F-403 | CAPEX, fixed/variable O&M, fuel cost, lifetime per channel | ❌ |
| Curtailment, firm capacity | Storage power, energy, round-trip efficiency | ❌ bundled in E |
| Gas balance | Existing domestic gas supply baseline | ❌ |

**Contract for supplementary data (OQ-13):** a second workbook in the same column layout — one column per `channel_id`, same order — so it ingests with the same pipeline and extends the same records. The engine specification below assumes that data arrives. Nothing in Phase 1 depends on it.

### 4.2 Energy roles

The workbook's columns are **alternative pathways, not additive supply** (PRD §3.4). Every column is assigned exactly one role, and totals are only ever summed within the rules below.

| Role | Columns | Behaviour |
| :--- | :--- | :--- |
| `demand_reduction` | C | Subtracts from gross demand. Never adds to supply. |
| `demand_reduction_unconfirmed` | D | Excluded from totals until OQ-14 is answered, to avoid counting efficiency twice. |
| `generation_variable` | E | Adds to supply; subject to curtailment. |
| `import_electricity` | F | Adds to supply. |
| `generation_gas` | J, H | Adds to supply; **constrained by gas availability**. |
| `fuel_source_gas` | G, I, Q, R | Adds to gas availability, **not** to supply. |
| `generation_firm` | M, N, O, P, S | Adds to supply; dispatchable or baseload. |
| `enabler` | K, L | No energy quantity. Displayed; excluded from totals. |

Roles live in the column map, so the assignment is a data change, not a code change (OQ-17).

### 4.3 Scenario shape

```ts
interface Scenario {
  schema_version: 1;
  dataset_version: string;
  id: string;
  name_en: string; name_he: string;
  demand_trajectory: TrajectoryId;
  demand_overrides: Partial<Record<SectorId, Record<MilestoneYear, number>>>;  // TWh
  deployment_mw: Record<ChannelId, Record<MilestoneYear, number>>;              // ≤ potential_mw
  overrides?: Partial<EngineConfig>;
}
```

**Capacity is canonical.** The F-301 in-matrix control sets MW per milestone, capped at the workbook potential. The *workbook preset* sets `deployment_mw_i,t = potential_mw_i × ramp_t` for every column — reproducing the workbook's own trajectories exactly. Every other preset starts from it.

### 4.4 Balance

```
Gen_i,t        = deployment_mw_i,t × CF_i × 8760 / 1e6 × utilization_i,t              [TWh]

GrossDemand_t  = Σ_sectors Demand_s,t
NetDemand_t    = GrossDemand_t − Σ_{i∈demand_reduction} Gen_i,t

GasAvailable_t = domestic_gas_baseline_twh_t + Σ_{i∈fuel_source_gas} Gen_i,t           [TWh_e]
GasGen_t       = min( Σ_{i∈generation_gas} Gen_i,t , GasAvailable_t )

Supply_t       = Σ_{i∈{generation_variable, import_electricity, generation_firm}} Gen_i,t
               + GasGen_t − Curtailment_t − TnDLosses_t
TnDLosses_t    = NetDemand_t × tnd_loss_rate                              (0.035, OQ-4)

ΔE_t           = Supply_t − NetDemand_t
```

- Fuel sources are expressed in electricity-equivalent TWh in the workbook (CF 0.6 on nominal MW), so they compare directly with gas-fired generation. When gas-fired generation exceeds availability, `GasGen_t` is capped and a **fuel-availability alert** fires (F-302).
- `utilization` applies annual merit order to dispatchable roles: must-run output (variable, import, SMR, geothermal) is placed first; residual demand is filled by `generation_gas` and `generation_firm` dispatchables in ascending short-run marginal cost; surplus dispatchables get `utilization < 1`. Without this step, a solar-heavy scenario reports gas plants running at full capacity factor behind free solar — a phantom surplus. Marginal costs come from the supplementary data.
- `ΔE_t < 0` → deficit alert with unserved energy (TWh) and implied firm-capacity shortfall (MW, §4.7) reported separately. An energy deficit and a capacity deficit are different failures.

### 4.5 Emissions

```
Emissions_t = Σ_{i∈{variable, import, firm}} Gen_i,t × CI_i / 1000
            + Σ_{f∈gas sources incl. baseline} GasGen_t × share_f,t × CI_f / 1000 × capture_t
            − 0     (demand reduction lowers demand; its avoided emissions are already
                     reflected in the lower generation, so its negative CI is NOT added)
```

- Gas-fired generation is allocated to fuel sources pro rata to their availability; each carries its own intensity (LNG 450, pipeline and domestic 400, baseline 400).
- `capture_t = CI_H / CI_J = 0.25` applied to the CCS share of gas-fired generation.
- **The workbook's negative intensity for efficiency is a standalone display metric.** In a balanced scenario, adding it on top of the reduced generation would count the avoided emissions twice. The engine asserts this with a dedicated test.
- Methane leakage (GWP100, OQ-2) is applied only if intensities are confirmed as combustion-only (OQ-3).

### 4.6 System cost *(requires supplementary data)*

```
CRF_i          = r(1+r)^n_i / ((1+r)^n_i − 1)                               r = 0.07 (OQ-1)
AnnualCost_i,t = capex_i × deployment_mw_i,t × 1000 × CRF_i
               + fixed_om_i × deployment_mw_i,t × 1000
               + (var_om_i + fuel_cost_i) × Gen_i,t × 1e6
LCOE_System,t  = Σ_i AnnualCost_i,t / (Supply_t × 1e6)                      [USD/MWh]
```

Fixed costs are charged on installed capacity and variable costs on actual generation, so a plant held idle by merit order still carries its capital charge. The discount rate is surfaced in the UI as an adjustable assumption: moving from 7% to a ~3% social rate can reverse a nuclear-versus-gas comparison.

**Price direction band (F-403):** `Δ = LCOE_t / LCOE_2025 − 1` → `< −10%` significant reduction · `−10%…+5%` stable · `+5%…+25%` moderate increase · `> +25%` severe spike. Always displayed with the qualifier that it indicates generation-cost direction, not consumer tariffs.

### 4.7 Curtailment, firm capacity, reliability *(proxies until Phase 3)*

```
Curtailment_t   = max(0, Gen_E,t − α × NetDemand_t − StorageThroughput_t)       α = 0.35 (OQ-10)
PeakDemand_t    = NetDemand_t × 1e6 / (8760 × load_factor)                      0.62 (OQ-5)
FirmCapacity_t  = Σ_{firm, gas} deployment_mw × availability + storage_mw + import_mw × 0.5
ReserveMargin_t = FirmCapacity_t / PeakDemand_t − 1                             target 0.15

Reliability_t   = 100 × mean( autonomy, clamp(ReserveMargin/0.15, 0, 1), dispatchable_share )
```

Variable generation contributes zero firm capacity in v1. The three reliability components are always displayed with the composite. Every proxy-derived figure is labelled as a proxy.

### 4.8 Portfolio Trilemma

```
Portfolio_d,t = Σ_i Gen_i,t × DimensionAverage_i,d / Σ_i Gen_i,t      over columns with Gen > 0
```

Uses the workbook's own dimension averages (§3.1). Columns with a null average for a dimension are excluded from that dimension's weights, not treated as zero.

---

## 5. Workbook Presentation Format

The F-101 – F-106 views are a rendition of `Sheet1`. This section is the design specification. **All colours, spans, rules and axes below are ingested from the workbook** (§6.3), and the values here are what ingestion must reproduce from the current file.

### 5.1 Grid

- CSS Grid. Column 1 is the label column; columns 2–18 are the 17 channels in workbook order.
- `dir="rtl"` in Hebrew: label column on the right, column C (efficiency) adjacent to it, S (coal) leftmost — exactly as the workbook renders. `dir="ltr"` in English mirrors it. Grid order is never reversed manually; `dir` does the mirroring.
- Channel column width uniform, minimum 9.5 rem, so 3–4 word channel names wrap to at most three lines.
- **Sticky:** the label column (inline-start) and rows 1–3 (axis, channel, potential). The roadmap label columns (phase, sub-group) are also sticky at inline-start.
- The matrix scrolls in its own container on both axes. The page body never scrolls horizontally.

### 5.2 Row heights

Proportional to the workbook's point heights; base unit 1 pt = 1.33 px at 100% zoom.

| Row | Workbook | Web |
| :--- | --: | :--- |
| Axis header | 16.5 pt | single line |
| Channel name | 54.75 pt | up to 3 lines |
| Potential | 16.5 pt | single line |
| Score row | 15.75 pt | single line |
| Sparkline row | 37.5 pt | 50 px |
| Likelihood | 16.5 pt | single line |
| Barriers | 32.25 pt | up to 2 lines |
| Roadmap title / detail / challenges | 36–60 pt | content height |

### 5.3 Header rows

| Element | Fill | Text |
| :--- | :--- | :--- |
| Label column cells (rows 1–3; other rows as ingested) | `#A6A6A6` | bold, dark |
| Potential row | `#A6A6A6` | centered, `3,000 MW`; `-` shown as `-` |

Axis header (row 1, spanning its merged columns) and channel name (row 2):

| Axis group | Columns | Header fill | Name fill |
| :--- | :--- | :--- | :--- |
| efficiency | C–D | `#7030A0` | `#DEBDFF` |
| renewables | E | `#FFC000` | `#FFE699` |
| electricity_import | F | `#70AD47` | `#C5E0B4` |
| natural_gas | G–J | `#5B9BD5` | `#BDD7EE` |
| fuels | K | `#7030A0` | `#DEBDFF` |
| grid | L | `#70AD47` | `#C5E0B4` |
| future_tech | M–O | `#ED7D31` | `#F8CBAD` |
| hydrogen | P | `#4472C4` | `#B4C7E7` |
| domestic_gas | Q–R | `#5B9BD5` | `#BDD7EE` |
| coal | S | `#A6A6A6` | `#7F7F7F` |

Colours are **not unique per axis** — efficiency and fuels share purple, import and grid share green, both gas groups share blue. That is the workbook's choice. Colour is therefore never the sole identifier of an axis: the header text always is. Header text colour is chosen per fill for WCAG AA contrast (white on the saturated fills, dark on tints and `#A6A6A6`).

### 5.4 Score rows and colour scale

Each Trilemma dimension renders as a **score row** (visible) with an expandable group of five **sub-score rows** (hidden by default, F-102).

Score cell: number with one decimal (`4.2`, `5.0`), fill from the colour scale, text centered. A blank average renders as an empty cell with the neutral row fill.

**Colour scale** — Excel three-colour scale, reproduced exactly:

| Stop | Position | Colour |
| :--- | :--- | :--- |
| low | minimum of the rule's range | `#F8696B` |
| mid | 50th percentile of the rule's range | `#FFEB84` |
| high | maximum of the rule's range | `#63BE7B` |

```
v ≤ p50:  colour = lerpRGB(low, mid, (v − min) / (p50 − min))
v > p50:  colour = lerpRGB(mid, high, (v − p50) / (max − p50))
min == max: colour = high
```

- Percentile uses `PERCENTILE.INC` semantics over the numeric, non-blank cells of the rule's range.
- **The scale is relative, not absolute 1–5.** Colours depend on the distribution of the whole range.
- **The rule ranges include the hidden sub-scores together with the average row**, and exclude column D, which has its own rules:

| Rule | Range |
| :--- | :--- |
| Security | `C4:S8`, `C9`, `E9:S9` |
| Security (D) | `D9` |
| Environment | `C15:C20`, `E15:S20` |
| Environment (D) | `D15:D20` |
| Equity | `C26:C31`, `E26:S31` |
| Equity (D) | `D26:D31` |

A visible average's colour therefore depends on the hidden sub-scores. The engine computes the scale over exactly these ranges, ingested from the file — never over the visible row alone. Getting this wrong produces plausible but different colours, which only a side-by-side comparison would catch.

### 5.5 Sparkline rows

One area chart per channel under each score row.

| Row | Data | Axis min | Axis max | Fill |
| :--- | :--- | --: | --: | :--- |
| Under security | Generation, TWh | 0 | 90 | `#5B9BD5` |
| Under environment | Emissions, MtCO₂e | −6 | 30 | `#70AD47` |
| Under equity | Price-impact index | −5 | 5 | `#ED7D31` |

- **Shared fixed y-axis per row**, identical for all 17 columns. This is what makes the renewables sparkline visibly dwarf the efficiency sparkline. Per-chart auto-scaling would destroy that cross-column comparison.
- Negative values fill **below** the zero baseline — efficiency's emissions, renewables' falling price impact.
- **Category axis:** four equally spaced points, even though the years are 5, 10 and 10 apart. This matches the workbook. The F-105 drawer's full-size charts use a true time axis and say so.
- Axes, gridlines, labels and legend hidden. Cell background `#D9D9D9`, chart plot area white, as in the workbook.
- A column with no data (K, L; F and M in equity) renders the empty white plot frame.
- Hover/focus shows a tooltip: four `year: value unit` lines.
- Accessible name per sparkline, e.g. *"Renewables & storage, generation: 8.8, 26.3, 56.9, 87.6 TWh for 2025, 2030, 2040, 2050"*.
- Axis bounds and fill are ingested from each chart's XML. Ingestion reports charts whose data range and anchor column disagree — three charts (49–51) reference column C's ranges, presumably for column D, whose values are identical.

### 5.6 Likelihood and barriers

Fill `#BFBFBF`, centered text. Likelihood is written in words and **not colour-coded** — the workbook does not colour it, and inventing red/amber/green would add a judgement the source does not make.

### 5.7 Roadmap section

| Phase | Label fill (col A) | Body fill |
| :--- | :--- | :--- |
| 2025–2030 | `#BDD7EE` | `#DEEBF7` |
| 2030–2040 | `#F8CBAD` | `#FBE5D6` |
| 2040–2050 | `#C5E0B4` | `#E2F0D9` |

- Phase label spans its band vertically, text rotated to read along the band, as in the workbook. The sub-group labels (יעדים / צעדים / אימפקט) render the same way within 2025–2030.
- **Step card**, per channel cell per slot:
  - **Title** — bold, centered, larger.
  - **Detail** — small, regular.
  - **Challenges** — small; the `אתגרים:` prefix bold, the rest regular.
- Empty slots render as empty body-fill cells. The grid never collapses a slot, so a step title in 2030–2040 slot 2 aligns across all columns.
- Targets (2025–2030, rows 40–42) render as small text cells; impact rows as their placeholder labels, where present.

### 5.8 Trigger callouts (F-104)

| Anchor | Channel | Text |
| :--- | :--- | :--- |
| F49 | Regional interconnection | קצב התקנת מתחדשות אינו מספק, לא התגלו מאגרי גז טבעי. |
| G53 | LNG imports | השימוש בגז טבעי נמשך, יהיה צורך בתפיסת פחמן. |
| J53 | Gas generation expansion | השימוש בגז טבעי נמשך. |
| Q49 | Deep-water gas | השימוש בגז טבעי נמשך, יש צורך בעתודות נוספות. *(duplicated in workbook — OQ-18)* |
| R49 | Small gas fields | חשש כי הערוצים האחרים לא יביאו לביטחון אספקה. |

- Rounded rectangle, fill `#5B9BD5`, white text, ⚠ icon at inline-start. The workbook's leading `⚠️` character is stripped from the text and rendered as the icon.
- Positioned within its anchor cell's grid area and overflowing toward the neighbouring phase boundary, as in the workbook — never floating free of the grid, so it cannot detach while scrolling.
- Accessible as a note associated with its cell (`role="note"`, referenced by the cell).

### 5.9 Column filtering (F-106)

Hidden columns are removed from the grid. An axis header whose columns are partly hidden shrinks its span; fully hidden, it disappears. Colour-scale results do **not** change when columns are hidden — they are always computed over the full workbook ranges, so a cell's colour is stable regardless of filters.

### 5.10 Fidelity rules

1. Column order is the workbook's. No sorting.
2. Blank is blank. No zeros, dashes or "N/A" where the workbook shows an empty cell. Where the workbook shows `-`, render `-`.
3. Numbers display with the workbook's precision: scores one decimal, potential with thousands separators.
4. Workbook text is rendered verbatim in Hebrew, including its typos. Corrections are made in the workbook, not in the UI.
5. English mode translates labels and names through the catalogue (OQ-11) and shows free text — barriers, steps, callouts — in Hebrew with a "Hebrew source" marker until translations are supplied. Machine translation is not shipped.
6. Any deliberate deviation from the workbook is recorded in this section with its reason.

**Recorded deviations**

| Deviation | Reason |
| :--- | :--- |
| Header text colour chosen per fill for WCAG AA contrast | The workbook's white text on `#FFC000` and on light tints fails contrast (NFR-2) |
| Sub-score and trajectory rows expandable rather than permanently hidden | Progressive disclosure (F-102); collapsed by default, so the default view matches the workbook |
| Column filtering toolbar | Additive (F-106); the default state shows all columns as in the workbook |
| Free text shown in Hebrew with a marker in English mode | No approved translations exist (§5.10 rule 5) |

---

## 6. Data Layer

### 6.1 Storage

File-based SQLite (`better-sqlite3`) through Drizzle ORM. Postgres-portable schema. Holds ingested reference data and layout metadata only; scenarios live in the URL and `localStorage`.

### 6.2 Tables

**Values**

| Table | Contents |
| :--- | :--- |
| `channels` | `channel_id`, `column_letter`, `column_order`, `axis_group_id`, `name_he`, `name_en`, `potential_mw` (nullable), `potential_raw`, `energy_role`, `cf` (nullable), `ci_g_per_kwh` (nullable), `params_recovered` |
| `sub_scores` | `channel_id`, `dimension`, `key`, `value` (nullable), `cell_ref` |
| `dimension_averages` | `channel_id`, `dimension`, `value` (nullable, cached formula result), `cell_ref` |
| `trajectories` | `channel_id`, `metric` (generation / emissions / price_impact), `year`, `value` (nullable), `cell_ref` |
| `channel_text` | `channel_id`, `likelihood`, `barriers_he`, `barriers_en`, cell refs |
| `roadmap_items` | `channel_id`, `phase`, `kind` (target / step / impact), `slot`, `title_he`, `detail_he`, `challenges_he`, `*_en`, `cell_refs` |
| `callouts` | `callout_id`, `channel_id`, `phase`, `anchor_cell`, `text_he`, `text_en` |
| `ramp` | `year`, `value` |
| `dataset_meta` | `dataset_version`, filename, SHA-256, ingested_at, row/column counts |

**Layout metadata**

| Table | Contents |
| :--- | :--- |
| `axis_groups` | `axis_group_id`, `name_he`, `name_en`, `start_column`, `end_column`, `header_fill`, `name_fill` |
| `row_labels` | `row`, `key`, `label_he`, `label_en`, `visible`, `height_pt` |
| `color_scale_rules` | `rule_id`, `dimension`, `ranges` (A1 list), `low`, `mid`, `high`, `mid_percentile` |
| `sparkline_specs` | `dimension`, `metric`, `axis_min`, `axis_max`, `fill` |
| `phase_bands` | `phase`, `start_row`, `end_row`, `label_fill`, `body_fill`, `sub_groups` |

Every value carries its `cell_ref` (NFR-6). Bilingual text is column pairs, so a missing translation is a `NULL` that CI can count.

### 6.3 Ingestion pipeline

`scripts/ingest-workbook.ts`, run manually when the workbook changes. Parses the OOXML package directly (`jszip` + `fast-xml-parser`): common spreadsheet libraries read cell values but not chart axes, drawing anchors or conditional-formatting rules, all of which the format depends on.

```
xlsx
 ├─ xl/workbook.xml, sheet1.xml ── cells, shared strings, merges, row heights/hidden, rightToLeft
 ├─ xl/styles.xml + theme1.xml ─── fills, resolving theme colour + tint (ECMA-376 HSL tint)
 ├─ sheet1.xml conditionalFormatting ── colour-scale rules and ranges
 ├─ xl/drawings/drawing1.xml ───── chart anchors, callout shapes and anchors
 └─ xl/charts/chartN.xml ───────── data ranges, axis min/max, series fill
      │
      ▼
 structural assertions   (row labels, merged ranges, column count, phase labels — §6.4)
 column map               (letter → channel_id, axis_group_id, energy_role)
 value extraction         (scores, averages, trajectories, text, roadmap, callouts)
 model recovery + verify  (§3.5)
 Zod validation           (types, 1–5 score ranges, likelihood vocabulary)
      │
      ▼
 db/reference.sqlite     (gitignored)
 db/snapshot.json        (committed — diffable record of every value and layout attribute)
 db/ingest-report.md     (committed — findings, warnings, recovered parameters)
```

**Fails closed.** A failed structural assertion or validation error aborts without writing. Model-verification failures and data anomalies are warnings in the report, not aborts, because the workbook remains displayable.

The current workbook's report must list at least: D copies C with no potential (OQ-14); K and L have no quantities (OQ-15); row 37 empty (OQ-16); duplicate callout at Q49 (OQ-18); charts 49–51 range/anchor mismatch; blank equity scores for F and M; blank security sub-scores for D.

### 6.4 Structural assertions (NFR-9)

Ingestion asserts, and aborts if any fails:

- Sheet count 1; channel columns exactly `C:S`.
- Column A labels at rows 1, 2, 3, 9, 20, 31, 38, 39 match §2.2.
- Rows 10–13, 21–24, 32–35 have column A labels 2025, 2030, 2040, 2050.
- Phase merges `A40:A51`, `A52:A60`, `A61:A66` exist with labels `2025-2030`, `2030-2040`, `2040-2050`.
- Average formulas in rows 9, 20, 31 reference rows 4–8, 15–19, 26–30.
- Exactly three sparkline rows' worth of charts, one per column per dimension (duplicates reported).

A structural change in a revised workbook therefore stops ingestion with a message naming the moved row or column, rather than shifting every value into the wrong field.

---

## 7. API Contract

Next.js route handlers. No authentication.

| Method | Route | Phase | Purpose |
| :--- | :--- | :-: | :--- |
| `GET` | `/api/workbook` | 1 | Complete values + layout metadata + `dataset_version`. Immutable-cached per version. The matrix renders from this single payload. |
| `GET` | `/api/channels/:id` | 1 | One column in full, with cell references (F-105) |
| `GET` | `/api/presets` | 2 | Scenario presets, including the workbook preset |
| `POST` | `/api/scenario/evaluate` | 2 | Server-side evaluation via the same `lib/engine`, for export and future consumers — never for interactive use |
| `POST` | `/api/export/json` | 2 | Scenario + results |
| `POST` | `/api/export/xlsx` | 4 | Scenario results written back in the workbook's layout |
| `POST` | `/api/export/pdf` | 4 | Executive summary in workbook format |

Errors: `{ error: { code, message_en, message_he, details? } }`; validation failures return 422 with Zod issues.

---

## 8. Internationalization

- Locale path segment: `/he` (default), `/en`. `lang` and `dir` set at the root layout only.
- CSS logical properties and Tailwind logical utilities only; physical `left`/`right` fails lint. The matrix's RTL fidelity depends entirely on this.
- Western Arabic numerals in both locales. Unit symbols (MW, TWh, MtCO₂e) Latin in both.
- Catalogue keys `module.feature.element`. Row labels, axis names and channel names come from the database's `*_he` / `*_en` columns, not the catalogue, since they originate in the workbook.
- Hebrew terminology is client-owned; English names are pending approval (OQ-11) and flagged in the UI until approved.
- CI fails on catalogue key mismatch.

---

## 9. Testing Strategy

| Layer | Approach |
| :--- | :--- |
| **Workbook parity (AC-1)** | Golden fixtures from the workbook: averages exact (1e-9); recomputed trajectories within ±0.0501 of stored values; stored values rendered verbatim. |
| **Colour scale** | Expected fill for every score and sub-score cell, computed independently from the workbook's rule ranges. Includes the `min == max` case (column D). |
| **Format fidelity (AC-2)** | DOM structural test: 17 columns in order; axis spans; header, name, band and sparkline fills; sticky elements; hidden-by-default sub-score groups; callouts inside their anchor cells; blank cells blank. Visual regression against a committed baseline in both locales. |
| **Ingestion** | Fixture workbooks with a moved row, an extra column, a broken merge, an out-of-range score — each must abort with a precise message. |
| **Engine (Phase 2)** | Unit tests per function; role rules (fuel sources never add to supply; D and enablers excluded); efficiency's negative intensity never double-counted; gas availability cap; the workbook preset reproduces the workbook trajectories. |
| **Property** | Scenario encode/decode round-trip; adding zero-carbon capacity never raises emissions. |
| **Accessibility (AC-5)** | axe in both locales; keyboard grid navigation; sparkline accessible names. |
| **Performance** | Full matrix first render ≤ 1 s; engine ≤ 16 ms. |

---

## 10. Traceability

| PRD feature | Spec | Workbook source |
| :--- | :--- | :--- |
| F-101 matrix | §5.1–5.6, §5.10 | rows 1–39 |
| F-102 disclosure | §3.1, §5.4, §5.5 | hidden rows 4–8, 10–13, 15–19, 21–24, 26–30, 32–35 |
| F-103 roadmap | §2.3, §5.7 | rows 40–66 |
| F-104 callouts | §5.8 | drawing1.xml shapes |
| F-105 detail drawer | §3, §7 | full column |
| F-106 filtering | §5.9 | — |
| F-201 – F-203 demand | §4.1, §4.4 | supplementary data |
| F-301 – F-304 scenarios | §4.2 – §4.4 | recovered parameters (§3.4) |
| F-401 mix | §4.4 | — |
| F-402 GHG | §4.5 | recovered CI (§3.4) |
| F-403 cost | §4.6 | supplementary data |
| F-404 reliability | §4.7 | supplementary data |
