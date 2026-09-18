import { describe, expect, it } from "vitest";
import {
  EMPTY_FILTERS,
  isChannelVisible,
  parseColumnFilters,
  serializeColumnFilters,
  toggleSetMember,
  type ColumnFilters,
} from "@/components/workbook/columnFilters";
import type { Channel } from "@/lib/schemas/workbook";

function channel(axisGroupId: Channel["axisGroupId"]): Channel {
  return {
    channelId: "efficiency",
    columnLetter: "C",
    columnOrder: 1,
    axisGroupId,
    nameHe: "x",
    nameEn: "x",
    potentialMw: null,
    potentialRaw: null,
    energyRole: "enabler",
    cf: null,
    ciGPerKwh: null,
    paramsRecovered: false,
  };
}

describe("parseColumnFilters / serializeColumnFilters", () => {
  it("round-trips axis groups and likelihoods through the URL", () => {
    const params = new URLSearchParams(
      "axis=renewables,natural_gas&likelihood=high,none",
    );
    const filters = parseColumnFilters(params);
    expect(filters.axisGroups).toEqual(new Set(["renewables", "natural_gas"]));
    expect(filters.likelihoods).toEqual(new Set(["high", null]));

    const serialized = serializeColumnFilters(filters);
    expect(serialized.get("axis")).toBe("renewables,natural_gas");
    expect(serialized.get("likelihood")).toBe("high,none");
  });

  it("parses empty params as no filter (both dimensions empty)", () => {
    const filters = parseColumnFilters(new URLSearchParams());
    expect(filters.axisGroups.size).toBe(0);
    expect(filters.likelihoods.size).toBe(0);
  });

  it("omits a dimension from the URL entirely when its filter set is empty", () => {
    const params = serializeColumnFilters(EMPTY_FILTERS);
    expect(params.toString()).toBe("");
  });
});

describe("isChannelVisible", () => {
  it("is visible when no filters are active", () => {
    expect(isChannelVisible(channel("renewables"), "high", EMPTY_FILTERS)).toBe(true);
  });

  it("is hidden when its axis group isn't in an active axis filter", () => {
    const filters: ColumnFilters = {
      axisGroups: new Set(["natural_gas"]),
      likelihoods: new Set(),
    };
    expect(isChannelVisible(channel("renewables"), "high", filters)).toBe(false);
  });

  it("is visible when its axis group is in an active axis filter", () => {
    const filters: ColumnFilters = {
      axisGroups: new Set(["renewables"]),
      likelihoods: new Set(),
    };
    expect(isChannelVisible(channel("renewables"), "high", filters)).toBe(true);
  });

  it("filters on a blank likelihood via the null member", () => {
    const filters: ColumnFilters = {
      axisGroups: new Set(),
      likelihoods: new Set([null]),
    };
    expect(isChannelVisible(channel("renewables"), null, filters)).toBe(true);
    expect(isChannelVisible(channel("renewables"), "low", filters)).toBe(false);
  });

  it("requires both dimensions to pass when both filters are active", () => {
    const filters: ColumnFilters = {
      axisGroups: new Set(["renewables"]),
      likelihoods: new Set(["high"]),
    };
    expect(isChannelVisible(channel("renewables"), "high", filters)).toBe(true);
    expect(isChannelVisible(channel("renewables"), "low", filters)).toBe(false);
    expect(isChannelVisible(channel("natural_gas"), "high", filters)).toBe(false);
  });
});

describe("toggleSetMember", () => {
  it("adds a value not yet present", () => {
    expect(toggleSetMember(new Set(["a"]), "b")).toEqual(new Set(["a", "b"]));
  });

  it("removes a value already present", () => {
    expect(toggleSetMember(new Set(["a", "b"]), "b")).toEqual(new Set(["a"]));
  });
});
