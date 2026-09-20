/**
 * Drizzle schema over `better-sqlite3` (DEV-PLAN T4, SPEC §6.1–6.2).
 * Column types stick to what `drizzle-orm/sqlite-core` maps cleanly onto
 * Postgres equivalents (text/integer/real, JSON-mode text for arrays) so a
 * later Postgres swap (PRD §5.1) is a driver change, not a schema rewrite.
 */

import { sqliteTable, text, integer, real, primaryKey } from "drizzle-orm/sqlite-core";

// ---------------------------------------------------------------------------
// Value tables
// ---------------------------------------------------------------------------

export const datasetMeta = sqliteTable("dataset_meta", {
  datasetVersion: text("dataset_version").primaryKey(),
  filename: text("filename").notNull(),
  sha256: text("sha256").notNull(),
  ingestedAt: text("ingested_at").notNull(),
  rowCount: integer("row_count").notNull(),
  columnCount: integer("column_count").notNull(),
});

export const channels = sqliteTable("channels", {
  channelId: text("channel_id").primaryKey(),
  columnLetter: text("column_letter").notNull(),
  columnOrder: integer("column_order").notNull(),
  axisGroupId: text("axis_group_id").notNull(),
  nameHe: text("name_he").notNull(),
  nameEn: text("name_en").notNull(),
  potentialMw: real("potential_mw"),
  potentialRaw: text("potential_raw"),
  energyRole: text("energy_role").notNull(),
  cf: real("cf"),
  ciGPerKwh: real("ci_g_per_kwh"),
  paramsRecovered: integer("params_recovered", { mode: "boolean" }).notNull(),
});

export const subScores = sqliteTable(
  "sub_scores",
  {
    channelId: text("channel_id").notNull(),
    dimension: text("dimension").notNull(),
    key: text("key").notNull(),
    value: real("value"),
    cellRef: text("cell_ref").notNull(),
  },
  (t) => [primaryKey({ columns: [t.channelId, t.dimension, t.key] })],
);

export const dimensionAverages = sqliteTable(
  "dimension_averages",
  {
    channelId: text("channel_id").notNull(),
    dimension: text("dimension").notNull(),
    value: real("value"),
    cellRef: text("cell_ref").notNull(),
  },
  (t) => [primaryKey({ columns: [t.channelId, t.dimension] })],
);

export const trajectories = sqliteTable(
  "trajectories",
  {
    channelId: text("channel_id").notNull(),
    metric: text("metric").notNull(),
    year: integer("year").notNull(),
    value: real("value"),
    cellRef: text("cell_ref").notNull(),
  },
  (t) => [primaryKey({ columns: [t.channelId, t.metric, t.year] })],
);

export const channelText = sqliteTable("channel_text", {
  channelId: text("channel_id").primaryKey(),
  likelihood: text("likelihood"),
  likelihoodCellRef: text("likelihood_cell_ref").notNull(),
  barriersHe: text("barriers_he"),
  barriersEn: text("barriers_en"),
  barriersCellRef: text("barriers_cell_ref").notNull(),
});

export const roadmapItems = sqliteTable("roadmap_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  channelId: text("channel_id").notNull(),
  phase: text("phase").notNull(),
  kind: text("kind").notNull(),
  slot: integer("slot").notNull(),
  titleHe: text("title_he"),
  detailHe: text("detail_he"),
  challengesHe: text("challenges_he"),
  titleEn: text("title_en"),
  detailEn: text("detail_en"),
  challengesEn: text("challenges_en"),
  cellRefs: text("cell_refs", { mode: "json" }).notNull().$type<string[]>(),
});

export const callouts = sqliteTable("callouts", {
  calloutId: text("callout_id").primaryKey(),
  channelId: text("channel_id").notNull(),
  phase: text("phase").notNull(),
  anchorCell: text("anchor_cell").notNull(),
  textHe: text("text_he").notNull(),
  textEn: text("text_en"),
});

export const ramp = sqliteTable("ramp", {
  year: integer("year").primaryKey(),
  value: real("value").notNull(),
});

// ---------------------------------------------------------------------------
// Layout metadata tables
// ---------------------------------------------------------------------------

export const axisGroups = sqliteTable("axis_groups", {
  axisGroupId: text("axis_group_id").primaryKey(),
  nameHe: text("name_he").notNull(),
  nameEn: text("name_en").notNull(),
  startColumn: text("start_column").notNull(),
  endColumn: text("end_column").notNull(),
  headerFill: text("header_fill").notNull(),
  nameFill: text("name_fill").notNull(),
});

export const rowLabels = sqliteTable("row_labels", {
  row: integer("row").primaryKey(),
  key: text("key").notNull(),
  labelHe: text("label_he"),
  labelEn: text("label_en").notNull(),
  visible: integer("visible", { mode: "boolean" }).notNull(),
  heightPt: real("height_pt").notNull(),
});

export const colorScaleRules = sqliteTable("color_scale_rules", {
  ruleId: text("rule_id").primaryKey(),
  dimension: text("dimension").notNull(),
  ranges: text("ranges", { mode: "json" }).notNull().$type<string[]>(),
  low: text("low").notNull(),
  mid: text("mid").notNull(),
  high: text("high").notNull(),
  midPercentile: real("mid_percentile").notNull(),
});

/** Singleton row (row 37's own colour-scale rule, OQ-16) -- `id` is always 0; absent entirely if the workbook carries none. */
export const trilemmaColorScale = sqliteTable("trilemma_color_scale", {
  id: integer("id").primaryKey(),
  ranges: text("ranges", { mode: "json" }).notNull().$type<string[]>(),
  low: text("low").notNull(),
  mid: text("mid").notNull(),
  high: text("high").notNull(),
  midPercentile: real("mid_percentile").notNull(),
});

export const sparklineSpecs = sqliteTable("sparkline_specs", {
  dimension: text("dimension").primaryKey(),
  metric: text("metric").notNull(),
  axisMin: real("axis_min").notNull(),
  axisMax: real("axis_max").notNull(),
  fill: text("fill").notNull(),
});

export const phaseBands = sqliteTable("phase_bands", {
  phase: text("phase").primaryKey(),
  startRow: integer("start_row").notNull(),
  endRow: integer("end_row").notNull(),
  labelFill: text("label_fill").notNull(),
  bodyFill: text("body_fill").notNull(),
  subGroups: text("sub_groups", { mode: "json" }).notNull().$type<
    {
      key: string;
      labelHe: string;
      labelEn: string;
      startRow: number;
      endRow: number;
    }[]
  >(),
});
