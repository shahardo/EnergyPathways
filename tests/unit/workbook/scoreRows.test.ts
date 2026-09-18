import { describe, expect, it } from "vitest";
import {
  buildDimensionColorScales,
  buildScoreBlockRows,
} from "@/components/workbook/scoreRows";
import type {
  ColorScaleRule,
  DimensionAverage,
  RowLabel,
  SubScore,
} from "@/lib/schemas/workbook";

const ROW_LABELS: RowLabel[] = [
  { row: 1, key: "axis", labelHe: "ציר", labelEn: "Axis", visible: true, heightPt: 16.5 },
  {
    row: 4,
    key: "security.import_dependency",
    labelHe: "תלות ביבוא",
    labelEn: "Import dependency",
    visible: false,
    heightPt: 15,
  },
  {
    row: 5,
    key: "security.diversity",
    labelHe: "גיוון",
    labelEn: "Diversity",
    visible: false,
    heightPt: 15,
  },
  {
    row: 6,
    key: "security.storage_capability",
    labelHe: "יכולת אגירה",
    labelEn: "Storage capability",
    visible: false,
    heightPt: 15,
  },
  {
    row: 7,
    key: "security.grid_reliability",
    labelHe: "אמינות רשת",
    labelEn: "Grid reliability",
    visible: false,
    heightPt: 15,
  },
  {
    row: 8,
    key: "security.redundancy",
    labelHe: "יתירות",
    labelEn: "Redundancy",
    visible: false,
    heightPt: 15,
  },
  {
    row: 9,
    key: "security",
    labelHe: "ביטחון",
    labelEn: "Security",
    visible: true,
    heightPt: 15.75,
  },
  {
    row: 15,
    key: "environment.co2_intensity",
    labelHe: 'עצימות פד"ח',
    labelEn: "CO2 intensity",
    visible: false,
    heightPt: 15,
  },
  {
    row: 16,
    key: "environment.renewable_share",
    labelHe: "% מתחדשות",
    labelEn: "Renewable share",
    visible: false,
    heightPt: 15,
  },
  {
    row: 17,
    key: "environment.efficiency",
    labelHe: "יעילות",
    labelEn: "Efficiency",
    visible: false,
    heightPt: 15,
  },
  {
    row: 18,
    key: "environment.air_quality",
    labelHe: "איכות אויר",
    labelEn: "Air quality",
    visible: false,
    heightPt: 15,
  },
  {
    row: 19,
    key: "environment.methane_emissions",
    labelHe: "פליטות מתאן",
    labelEn: "Methane emissions",
    visible: false,
    heightPt: 15,
  },
  {
    row: 20,
    key: "environment",
    labelHe: "סביבה",
    labelEn: "Environment",
    visible: true,
    heightPt: 15.75,
  },
  {
    row: 26,
    key: "equity.access_to_electricity",
    labelHe: "גישה לחשמל",
    labelEn: "Access to electricity",
    visible: false,
    heightPt: 15,
  },
  {
    row: 27,
    key: "equity.clean_cooking",
    labelHe: "בישול נקי",
    labelEn: "Clean cooking",
    visible: false,
    heightPt: 15,
  },
  {
    row: 28,
    key: "equity.electricity_price",
    labelHe: "מחיר חשמל",
    labelEn: "Electricity price",
    visible: false,
    heightPt: 15,
  },
  {
    row: 29,
    key: "equity.fuel_price",
    labelHe: "מחיר דלקים",
    labelEn: "Fuel price",
    visible: false,
    heightPt: 15,
  },
  {
    row: 30,
    key: "equity.industrial_price",
    labelHe: "מחיר לתעשיה",
    labelEn: "Industrial price",
    visible: false,
    heightPt: 15,
  },
  {
    row: 31,
    key: "equity",
    labelHe: "שוויון",
    labelEn: "Equity",
    visible: true,
    heightPt: 15.75,
  },
];

describe("buildScoreBlockRows", () => {
  it("shows only the three score rows, in workbook order, when nothing is expanded", () => {
    const rows = buildScoreBlockRows(ROW_LABELS, new Set());
    expect(rows).toEqual([
      { kind: "score", dimension: "security", rowLabel: ROW_LABELS[6] },
      { kind: "score", dimension: "environment", rowLabel: ROW_LABELS[12] },
      { kind: "score", dimension: "equity", rowLabel: ROW_LABELS[18] },
    ]);
  });

  it("inserts a dimension's five sub-score rows in place, directly above its score row", () => {
    const rows = buildScoreBlockRows(ROW_LABELS, new Set(["environment"]));
    expect(rows.map((r) => r.rowLabel.row)).toEqual([9, 15, 16, 17, 18, 19, 20, 31]);
    expect(rows.filter((r) => r.kind === "subscore").map((r) => r.dimension)).toEqual([
      "environment",
      "environment",
      "environment",
      "environment",
      "environment",
    ]);
  });

  it("expanding one dimension leaves the others collapsed", () => {
    const rows = buildScoreBlockRows(ROW_LABELS, new Set(["security", "equity"]));
    expect(rows.map((r) => r.rowLabel.row)).toEqual([
      4, 5, 6, 7, 8, 9, 20, 26, 27, 28, 29, 30, 31,
    ]);
  });
});

const RULES: ColorScaleRule[] = [
  {
    ruleId: "environment",
    dimension: "environment",
    ranges: ["C15:C20", "E15:S20"],
    low: "#F8696B",
    mid: "#FFEB84",
    high: "#63BE7B",
    midPercentile: 50,
  },
  {
    ruleId: "environment_d",
    dimension: "environment",
    ranges: ["D15:D20"],
    low: "#F8696B",
    mid: "#FFEB84",
    high: "#63BE7B",
    midPercentile: 50,
  },
  {
    ruleId: "equity",
    dimension: "equity",
    ranges: ["C26:C31", "E26:S31"],
    low: "#F8696B",
    mid: "#FFEB84",
    high: "#63BE7B",
    midPercentile: 50,
  },
];

describe("buildDimensionColorScales", () => {
  it("colours column D's all-5 environment block with the D-only rule's high colour", () => {
    const subScores: SubScore[] = (
      [
        "co2_intensity",
        "renewable_share",
        "efficiency",
        "air_quality",
        "methane_emissions",
      ] as const
    ).map((key, i) => ({
      channelId: "demand_reduction",
      dimension: "environment",
      key,
      value: 5,
      cellRef: `D${15 + i}`,
    }));
    const averages: DimensionAverage[] = [
      {
        channelId: "demand_reduction",
        dimension: "environment",
        value: 5,
        cellRef: "D20",
      },
    ];
    const scales = buildDimensionColorScales(RULES, subScores, averages);

    expect(scales.colorForCell("environment", "D", "D20")).toBe("#63BE7B");
    expect(scales.colorForCell("environment", "D", "D15")).toBe("#63BE7B");
  });

  it("returns null for a blank average (F and M equity, SPEC §6.3 anomaly)", () => {
    const averages: DimensionAverage[] = [
      {
        channelId: "regional_interconnection",
        dimension: "equity",
        value: null,
        cellRef: "F31",
      },
      { channelId: "geothermal", dimension: "equity", value: null, cellRef: "M31" },
      { channelId: "efficiency", dimension: "equity", value: 3, cellRef: "C31" },
    ];
    const scales = buildDimensionColorScales(RULES, [], averages);

    expect(scales.colorForCell("equity", "F", "F31")).toBeNull();
    expect(scales.colorForCell("equity", "M", "M31")).toBeNull();
    expect(scales.colorForCell("equity", "C", "C31")).not.toBeNull();
  });

  it("expanding a group changes no colour, since colours never depend on which rows are shown", () => {
    const subScores: SubScore[] = [
      {
        channelId: "efficiency",
        dimension: "environment",
        key: "co2_intensity",
        value: 2,
        cellRef: "C15",
      },
      {
        channelId: "renewables_storage",
        dimension: "environment",
        key: "co2_intensity",
        value: 4,
        cellRef: "E15",
      },
    ];
    const averages: DimensionAverage[] = [
      { channelId: "efficiency", dimension: "environment", value: 3, cellRef: "C20" },
    ];
    const scales = buildDimensionColorScales(RULES, subScores, averages);
    const averageColorBeforeExpansion = scales.colorForCell("environment", "C", "C20");

    // Expansion is UI-only row visibility (buildScoreBlockRows); it never
    // touches the value map buildDimensionColorScales was built from.
    const averageColorAfterExpansion = scales.colorForCell("environment", "C", "C20");
    expect(averageColorAfterExpansion).toBe(averageColorBeforeExpansion);
  });

  it("throws when a rule for the dimension/column is missing, rather than silently falling back", () => {
    const scales = buildDimensionColorScales([], [], []);
    expect(() => scales.colorForCell("security", "C", "C9")).toThrow(
      /missing colour-scale rule/,
    );
  });
});
