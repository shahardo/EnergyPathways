import { describe, expect, it } from "vitest";
import {
  computeAxisGroupSpans,
  computeRowMetrics,
} from "@/components/workbook/gridLayout";
import type { AxisGroup, Channel, RowLabel } from "@/lib/schemas/workbook";

function channel(
  columnLetter: string,
  columnOrder: number,
  axisGroupId: string,
): Channel {
  return {
    channelId: `ch_${columnLetter}` as Channel["channelId"],
    columnLetter,
    columnOrder,
    axisGroupId: axisGroupId as Channel["axisGroupId"],
    nameHe: columnLetter,
    nameEn: columnLetter,
    potentialMw: null,
    potentialRaw: null,
    energyRole: "enabler",
    cf: null,
    ciGPerKwh: null,
    paramsRecovered: false,
  };
}

describe("computeAxisGroupSpans", () => {
  const channels = [
    channel("C", 1, "efficiency"),
    channel("D", 2, "efficiency"),
    channel("E", 3, "renewables"),
    channel("F", 4, "electricity_import"),
  ];

  it("places a single-column axis group on one grid line", () => {
    const axisGroups: AxisGroup[] = [
      {
        axisGroupId: "renewables",
        nameHe: "x",
        nameEn: "x",
        startColumn: "E",
        endColumn: "E",
        headerFill: "#000000",
        nameFill: "#000000",
      },
    ];
    const [span] = computeAxisGroupSpans(channels, axisGroups);
    // E is channels[2] (0-indexed) -> grid line 2+2=4, end 2+3=5
    expect(span?.gridColumnStart).toBe(4);
    expect(span?.gridColumnEnd).toBe(5);
    expect(span?.columnCount).toBe(1);
  });

  it("spans a multi-column axis group across its full range", () => {
    const axisGroups: AxisGroup[] = [
      {
        axisGroupId: "efficiency",
        nameHe: "x",
        nameEn: "x",
        startColumn: "C",
        endColumn: "D",
        headerFill: "#000000",
        nameFill: "#000000",
      },
    ];
    const [span] = computeAxisGroupSpans(channels, axisGroups);
    // C is index 0 -> line 2; D is index 1 -> line 1+3=4
    expect(span?.gridColumnStart).toBe(2);
    expect(span?.gridColumnEnd).toBe(4);
    expect(span?.columnCount).toBe(2);
  });

  it("omits a group with no matching channels, rather than throwing (SPEC §5.9: fully hidden disappears)", () => {
    const axisGroups: AxisGroup[] = [
      {
        axisGroupId: "coal",
        nameHe: "x",
        nameEn: "x",
        startColumn: "S",
        endColumn: "S",
        headerFill: "#000000",
        nameFill: "#000000",
      },
    ];
    expect(computeAxisGroupSpans(channels, axisGroups)).toEqual([]);
  });

  it("shrinks a partly-filtered group to just its remaining columns (SPEC §5.9)", () => {
    const axisGroups: AxisGroup[] = [
      {
        axisGroupId: "efficiency",
        nameHe: "x",
        nameEn: "x",
        startColumn: "C",
        endColumn: "D",
        headerFill: "#000000",
        nameFill: "#000000",
      },
    ];
    // Simulate D filtered out: only C remains.
    const filtered = channels.filter((c) => c.columnLetter !== "D");
    const [span] = computeAxisGroupSpans(filtered, axisGroups);
    expect(span?.columnCount).toBe(1);
  });
});

describe("computeRowMetrics", () => {
  it("accumulates sticky offsets from each row's height", () => {
    const rows: RowLabel[] = [
      { row: 1, key: "axis", labelHe: "a", labelEn: "a", visible: true, heightPt: 10 },
      { row: 2, key: "channel", labelHe: "b", labelEn: "b", visible: true, heightPt: 20 },
      {
        row: 3,
        key: "potential",
        labelHe: "c",
        labelEn: "c",
        visible: true,
        heightPt: 5,
      },
    ];
    const metrics = computeRowMetrics(rows);
    expect(metrics[0]?.stickyTop).toBe(0);
    expect(metrics[1]?.stickyTop).toBeCloseTo(10 * 1.33, 5);
    expect(metrics[2]?.stickyTop).toBeCloseTo((10 + 20) * 1.33, 5);
  });
});
