# Workbook Ingestion Report

- **Dataset version:** `a42326b533e46f9f`
- **Source file:** `Israel 2050 Pathways 06092026.xlsx`
- **SHA-256:** `a42326b533e46f9f7ef7505d1b817d60b2320b44c70de84fd747f15daee6beda`
- **Ingested at:** 2026-09-17T20:32:20.541Z
- **Rows × columns read:** 78 × 17

## Anomalies and warnings

- Row 31 (equity average) holds literal cached numbers, not a live `IFERROR(AVERAGE(...),"")` formula like rows 9 and 20 — displayed values are unaffected, but editing a hidden equity sub-score will not update this row automatically.
- Column D (demand reduction) has no security sub-scores — it copies column C's trajectories with no potential and no security scoring of its own (OQ-14).
- Column D (demand reduction) has no deployment potential — its generation/emissions trajectories are carried as data, identical to column C's (OQ-14).
- Column fuel_supply carries no potential or trajectory quantities — it is an enabler, not an energy pathway (OQ-15).
- Column grid_development carries no potential or trajectory quantities — it is an enabler, not an energy pathway (OQ-15).
- Blank equity averages: regional_interconnection, fuel_supply, grid_development, geothermal.
- chart49.xml plots column C's data but is rendered in column D's sparkline slot.
- chart50.xml plots column C's data but is rendered in column D's sparkline slot.
- chart51.xml plots column C's data but is rendered in column D's sparkline slot.
- Duplicate callout at Q49 — de-duplicated, one kept (OQ-18).
- Row 37 (טרילמה) carries a colour-scale rule but is entirely blank — not displayed in Phase 1 (OQ-16).

## Recovered parameters (SPEC §3.5)

Ramp: 2025=0.1, 2030=0.3, 2040=0.65, 2050=1

| Col | Channel | CF | CI (g/kWh) | Recovered | Verification issues |
| :-- | :--- | --: | --: | :-: | --: |
| C | efficiency | 0.5 | -400 | ✅ | 0 |
| D | demand_reduction | — | -400 | ❌ | 0 |
| E | renewables_storage | 0.2 | 0 | ✅ | 0 |
| F | regional_interconnection | 0.5 | 300 | ✅ | 0 |
| G | lng_import | 0.6 | 450 | ✅ | 0 |
| H | gas_ccs | 0.7 | 100 | ✅ | 0 |
| I | pipeline_gas_import | 0.6 | 400 | ✅ | 0 |
| J | gas_generation_expansion | 0.6 | 400 | ✅ | 0 |
| K | fuel_supply | — | — | ❌ | 0 |
| L | grid_development | — | — | ❌ | 0 |
| M | geothermal | 0.7 | 0 | ✅ | 0 |
| N | nuclear_smr | 0.9 | 0 | ✅ | 0 |
| O | nuclear_fusion | 0.8 | 0 | ✅ | 0 |
| P | hydrogen_import | 0.5 | 0 | ✅ | 0 |
| Q | deepwater_gas_exploration | 0.6 | 400 | ✅ | 0 |
| R | small_gas_fields | 0.6 | 400 | ✅ | 0 |
| S | return_to_coal | 0.7 | 900 | ✅ | 0 |
