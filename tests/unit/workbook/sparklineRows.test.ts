import { describe, expect, it } from "vitest";
import {
  buildSparklineRowByDimension,
  trajectoryValuesForChannel,
} from "@/components/workbook/sparklineRows";
import type { RowLabel, TrajectoryPoint } from "@/lib/schemas/workbook";

describe("buildSparklineRowByDimension", () => {
  const rowLabels: RowLabel[] = [
    {
      row: 9,
      key: "security",
      labelHe: "ביטחון",
      labelEn: "Security",
      visible: true,
      heightPt: 15.75,
    },
    {
      row: 14,
      key: "sparkline.security",
      labelHe: null,
      labelEn: "Generation trajectory",
      visible: true,
      heightPt: 37.5,
    },
    {
      row: 25,
      key: "sparkline.environment",
      labelHe: null,
      labelEn: "Emissions trajectory",
      visible: true,
      heightPt: 37.5,
    },
  ];

  it("maps each dimension to its sparkline row, ignoring unrelated rows", () => {
    const map = buildSparklineRowByDimension(rowLabels);
    expect(map.get("security")?.row).toBe(14);
    expect(map.get("environment")?.row).toBe(25);
    expect(map.has("equity")).toBe(false);
  });
});

describe("trajectoryValuesForChannel", () => {
  const trajectories: TrajectoryPoint[] = [
    {
      channelId: "renewables_storage",
      metric: "generation",
      year: 2025,
      value: 8.8,
      cellRef: "E10",
    },
    {
      channelId: "renewables_storage",
      metric: "generation",
      year: 2030,
      value: 26.3,
      cellRef: "E11",
    },
    {
      channelId: "renewables_storage",
      metric: "generation",
      year: 2040,
      value: 56.9,
      cellRef: "E12",
    },
    {
      channelId: "renewables_storage",
      metric: "generation",
      year: 2050,
      value: 87.6,
      cellRef: "E13",
    },
    {
      channelId: "fuel_supply",
      metric: "generation",
      year: 2025,
      value: null,
      cellRef: "K10",
    },
    {
      channelId: "fuel_supply",
      metric: "generation",
      year: 2030,
      value: null,
      cellRef: "K11",
    },
    {
      channelId: "fuel_supply",
      metric: "generation",
      year: 2040,
      value: null,
      cellRef: "K12",
    },
    {
      channelId: "fuel_supply",
      metric: "generation",
      year: 2050,
      value: null,
      cellRef: "K13",
    },
  ];

  it("orders the four milestone years regardless of input order", () => {
    const shuffled = [...trajectories].reverse();
    expect(
      trajectoryValuesForChannel(shuffled, "renewables_storage", "generation"),
    ).toEqual([8.8, 26.3, 56.9, 87.6]);
  });

  it("returns all-null for a column with no data (K, L)", () => {
    expect(trajectoryValuesForChannel(trajectories, "fuel_supply", "generation")).toEqual(
      [null, null, null, null],
    );
  });

  it("returns all-null when the channel/metric pair is entirely absent", () => {
    expect(
      trajectoryValuesForChannel(trajectories, "fuel_supply", "price_impact"),
    ).toEqual([null, null, null, null]);
  });
});
