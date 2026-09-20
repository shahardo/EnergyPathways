/**
 * Zod schemas as the single source of truth for the workbook domain model
 * (DEV-PLAN T3, SPEC §6.2). Types are `z.infer`, never hand-written.
 *
 * A blank workbook cell is `null`, never an error and never `0` (SPEC §1.3,
 * §5.10 rule 2) — every field that can be blank in the current workbook is
 * `.nullable()` here, not optional-with-a-default.
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Primitives (SPEC §1, §2.5, §4.2)
// ---------------------------------------------------------------------------

export const milestoneYearSchema = z.union([
  z.literal(2025),
  z.literal(2030),
  z.literal(2040),
  z.literal(2050),
]);
export type MilestoneYear = z.infer<typeof milestoneYearSchema>;
export const MILESTONE_YEARS = [
  2025, 2030, 2040, 2050,
] as const satisfies readonly MilestoneYear[];

/** Column order C→S, SPEC §2.5. Stable keys assigned by the ingestion column map, never derived from Hebrew text. */
export const CHANNEL_IDS = [
  "efficiency",
  "demand_reduction",
  "renewables_storage",
  "regional_interconnection",
  "lng_import",
  "gas_ccs",
  "pipeline_gas_import",
  "gas_generation_expansion",
  "fuel_supply",
  "grid_development",
  "geothermal",
  "nuclear_smr",
  "nuclear_fusion",
  "hydrogen_import",
  "deepwater_gas_exploration",
  "small_gas_fields",
  "return_to_coal",
] as const;
export const channelIdSchema = z.enum(CHANNEL_IDS);
export type ChannelId = z.infer<typeof channelIdSchema>;

export const AXIS_GROUP_IDS = [
  "efficiency",
  "renewables",
  "electricity_import",
  "natural_gas",
  "fuels",
  "grid",
  "future_tech",
  "hydrogen",
  "domestic_gas",
  "coal",
] as const;
export const axisGroupIdSchema = z.enum(AXIS_GROUP_IDS);
export type AxisGroupId = z.infer<typeof axisGroupIdSchema>;

export const dimensionSchema = z.enum(["security", "environment", "equity"]);
export type Dimension = z.infer<typeof dimensionSchema>;

/** SPEC §4.2 — every column has exactly one role; totals are only ever summed within these rules. */
export const energyRoleSchema = z.enum([
  "demand_reduction",
  "demand_reduction_unconfirmed",
  "generation_variable",
  "import_electricity",
  "generation_gas",
  "fuel_source_gas",
  "generation_firm",
  "enabler",
]);
export type EnergyRole = z.infer<typeof energyRoleSchema>;

/** Row 38 (סבירות): גבוהה / בינונית / נמוכה / `-`. `-` is `null`, not a fourth value. */
export const likelihoodSchema = z.enum(["high", "medium", "low"]).nullable();
export type Likelihood = z.infer<typeof likelihoodSchema>;

/** 1–5, 5 = best (SPEC §1.1). Blank sub-score / all-blank average is `null`. */
export const scoreSchema = z.number().min(1).max(5).nullable();

export const trajectoryMetricSchema = z.enum(["generation", "emissions", "price_impact"]);
export type TrajectoryMetric = z.infer<typeof trajectoryMetricSchema>;

export const phaseSchema = z.enum(["2025-2030", "2030-2040", "2040-2050"]);
export type Phase = z.infer<typeof phaseSchema>;

export const roadmapKindSchema = z.enum(["target", "step", "impact"]);
export type RoadmapKind = z.infer<typeof roadmapKindSchema>;

/** A1-style cell reference, e.g. `F49`. Every value carries one (NFR-6). */
export const cellRefSchema = z
  .string()
  .regex(/^[A-Z]+[0-9]+$/, "expected an A1-style cell reference, e.g. F49");

/** A1 range, single cell or `A1:B2`. Used for colour-scale rule ranges (SPEC §5.4). */
export const a1RangeSchema = z
  .string()
  .regex(/^[A-Z]+[0-9]+(:[A-Z]+[0-9]+)?$/, "expected an A1-style range, e.g. C4:S8");

export const hexColorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, "expected a 6-digit hex colour");

// ---------------------------------------------------------------------------
// Value tables (SPEC §6.2)
// ---------------------------------------------------------------------------

export const channelSchema = z.object({
  channelId: channelIdSchema,
  columnLetter: z.string().regex(/^[A-Z]$/),
  columnOrder: z.number().int().min(1),
  axisGroupId: axisGroupIdSchema,
  nameHe: z.string(),
  nameEn: z.string(),
  /** Deployment potential, MW. `null` for D, K, L — none of which carry a potential. */
  potentialMw: z.number().nonnegative().nullable(),
  /**
   * Verbatim workbook cell text, e.g. `"3,000 MW"`. `null` when the cell is
   * truly blank (D, L) — distinct from K, whose cell literally contains the
   * text `"-"`, which is preserved as `"-"`, not collapsed to `null`
   * (SPEC §2.2, §5.10 rules 2–3).
   */
  potentialRaw: z.string().nullable(),
  energyRole: energyRoleSchema,
  /** Recovered capacity factor (SPEC §3.5). `null` when unrecoverable (column D has no potential). */
  cf: z.number().min(0).max(1).nullable(),
  /** Recovered carbon intensity, gCO2e/kWh. Can be negative (efficiency's avoided-emissions column). */
  ciGPerKwh: z.number().nullable(),
  /** False when the recovered parameters failed §3.5 step 4 verification; Phase 1 still shows stored values. */
  paramsRecovered: z.boolean(),
});
export type Channel = z.infer<typeof channelSchema>;

export const SUB_SCORE_KEYS = [
  // security (rows 4–8)
  "import_dependency",
  "diversity",
  "storage_capability",
  "grid_reliability",
  "redundancy",
  // environment (rows 15–19)
  "co2_intensity",
  "renewable_share",
  "efficiency",
  "air_quality",
  "methane_emissions",
  // equity (rows 26–30)
  "access_to_electricity",
  "clean_cooking",
  "electricity_price",
  "fuel_price",
  "industrial_price",
] as const;
export const subScoreKeySchema = z.enum(SUB_SCORE_KEYS);
export type SubScoreKey = z.infer<typeof subScoreKeySchema>;

export const subScoreSchema = z.object({
  channelId: channelIdSchema,
  dimension: dimensionSchema,
  key: subScoreKeySchema,
  value: scoreSchema,
  cellRef: cellRefSchema,
});
export type SubScore = z.infer<typeof subScoreSchema>;

/** Rows 9, 20, 31 — `=IFERROR(AVERAGE(...),"")`, cached formula result (SPEC §3.1). */
export const dimensionAverageSchema = z.object({
  channelId: channelIdSchema,
  dimension: dimensionSchema,
  value: scoreSchema,
  cellRef: cellRefSchema,
});
export type DimensionAverage = z.infer<typeof dimensionAverageSchema>;

export const trajectoryPointSchema = z.object({
  channelId: channelIdSchema,
  metric: trajectoryMetricSchema,
  year: milestoneYearSchema,
  value: z.number().nullable(),
  cellRef: cellRefSchema,
});
export type TrajectoryPoint = z.infer<typeof trajectoryPointSchema>;

export const channelTextSchema = z.object({
  channelId: channelIdSchema,
  likelihood: likelihoodSchema,
  likelihoodCellRef: cellRefSchema,
  barriersHe: z.string().nullable(),
  barriersEn: z.string().nullable(),
  barriersCellRef: cellRefSchema,
});
export type ChannelText = z.infer<typeof channelTextSchema>;

/** One step/target/impact cell. Slot numbering keeps empty cells position-stable across all 17 columns (SPEC §5.7). */
export const roadmapItemSchema = z.object({
  channelId: channelIdSchema,
  phase: phaseSchema,
  kind: roadmapKindSchema,
  slot: z.number().int().min(1),
  titleHe: z.string().nullable(),
  detailHe: z.string().nullable(),
  /** Text after the `אתגרים:` prefix, which ingestion strips and the UI re-bolds (SPEC §2.3, §5.7). */
  challengesHe: z.string().nullable(),
  titleEn: z.string().nullable(),
  detailEn: z.string().nullable(),
  challengesEn: z.string().nullable(),
  cellRefs: z.array(cellRefSchema).min(1),
});
export type RoadmapItem = z.infer<typeof roadmapItemSchema>;

export const calloutSchema = z.object({
  calloutId: z.string(),
  channelId: channelIdSchema,
  phase: phaseSchema,
  anchorCell: cellRefSchema,
  /** Leading ⚠ stripped at ingestion and rendered as an icon (SPEC §5.8). */
  textHe: z.string(),
  textEn: z.string().nullable(),
});
export type Callout = z.infer<typeof calloutSchema>;

export const rampPointSchema = z.object({
  year: milestoneYearSchema,
  value: z.number().min(0).max(1),
});
export type RampPoint = z.infer<typeof rampPointSchema>;

export const datasetMetaSchema = z.object({
  datasetVersion: z.string().min(1),
  filename: z.string().min(1),
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
  ingestedAt: z.string().datetime(),
  rowCount: z.number().int().positive(),
  columnCount: z.number().int().positive(),
});
export type DatasetMeta = z.infer<typeof datasetMetaSchema>;

// ---------------------------------------------------------------------------
// Layout metadata (SPEC §6.2) — ingested from the workbook, never hard-coded
// ---------------------------------------------------------------------------

export const axisGroupSchema = z.object({
  axisGroupId: axisGroupIdSchema,
  nameHe: z.string(),
  nameEn: z.string(),
  startColumn: z.string().regex(/^[A-Z]$/),
  endColumn: z.string().regex(/^[A-Z]$/),
  headerFill: hexColorSchema,
  nameFill: hexColorSchema,
});
export type AxisGroup = z.infer<typeof axisGroupSchema>;

export const rowLabelSchema = z.object({
  row: z.number().int().positive(),
  key: z.string(),
  /** `null` for the three unlabeled sparkline rows (14, 25, 36) — the workbook's column A is blank there. */
  labelHe: z.string().nullable(),
  labelEn: z.string(),
  visible: z.boolean(),
  heightPt: z.number().positive(),
});
export type RowLabel = z.infer<typeof rowLabelSchema>;

/** Excel three-colour scale rule (SPEC §5.4). Ranges are a union — e.g. security is `C4:S8, C9, E9:S9`. */
export const colorScaleRuleSchema = z.object({
  ruleId: z.string(),
  dimension: dimensionSchema,
  ranges: z.array(a1RangeSchema).min(1),
  low: hexColorSchema,
  mid: hexColorSchema,
  high: hexColorSchema,
  midPercentile: z.number().min(0).max(100),
});
export type ColorScaleRule = z.infer<typeof colorScaleRuleSchema>;

/**
 * Row 37's own colour-scale rule (טרילמה — OQ-16): captured separately from
 * `colorScaleRuleSchema` because it isn't keyed to one of the three
 * Trilemma dimensions, it colours a composite of all three. `null` if a
 * future workbook revision drops the rule — the composite row then
 * renders uncoloured rather than throwing (same "blank, not invented"
 * posture as everywhere else a colour scale can be absent).
 */
export const trilemmaColorScaleSchema = z.object({
  ranges: z.array(a1RangeSchema).min(1),
  low: hexColorSchema,
  mid: hexColorSchema,
  high: hexColorSchema,
  midPercentile: z.number().min(0).max(100),
});
export type TrilemmaColorScale = z.infer<typeof trilemmaColorScaleSchema>;

export const sparklineSpecSchema = z.object({
  dimension: dimensionSchema,
  metric: trajectoryMetricSchema,
  axisMin: z.number(),
  axisMax: z.number(),
  fill: hexColorSchema,
});
export type SparklineSpec = z.infer<typeof sparklineSpecSchema>;

export const phaseSubGroupSchema = z.object({
  key: z.string(),
  labelHe: z.string(),
  labelEn: z.string(),
  startRow: z.number().int().positive(),
  endRow: z.number().int().positive(),
});

export const phaseBandSchema = z.object({
  phase: phaseSchema,
  startRow: z.number().int().positive(),
  endRow: z.number().int().positive(),
  labelFill: hexColorSchema,
  bodyFill: hexColorSchema,
  /** Only the 2025–2030 band has sub-groups (יעדים / צעדים / אימפקט); the others are `[]`. */
  subGroups: z.array(phaseSubGroupSchema),
});
export type PhaseBand = z.infer<typeof phaseBandSchema>;

// ---------------------------------------------------------------------------
// WorkbookPayload — the whole /api/workbook response, T3
// ---------------------------------------------------------------------------

export const workbookPayloadSchema = z.object({
  datasetMeta: datasetMetaSchema,
  channels: z.array(channelSchema),
  subScores: z.array(subScoreSchema),
  dimensionAverages: z.array(dimensionAverageSchema),
  trajectories: z.array(trajectoryPointSchema),
  channelText: z.array(channelTextSchema),
  roadmapItems: z.array(roadmapItemSchema),
  callouts: z.array(calloutSchema),
  ramp: z.array(rampPointSchema),
  axisGroups: z.array(axisGroupSchema),
  rowLabels: z.array(rowLabelSchema),
  colorScaleRules: z.array(colorScaleRuleSchema),
  trilemmaColorScale: trilemmaColorScaleSchema.nullable(),
  sparklineSpecs: z.array(sparklineSpecSchema),
  phaseBands: z.array(phaseBandSchema),
});
export type WorkbookPayload = z.infer<typeof workbookPayloadSchema>;
