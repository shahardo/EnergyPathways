import { describe, expect, it } from "vitest";
import { parseSheet } from "../../../scripts/ingest/sheet";
import { extractRoadmapItems } from "../../../scripts/ingest/roadmap";

function inlineStrCell(ref: string, text: string): string {
  return `<c r="${ref}" t="inlineStr"><is><t>${text}</t></is></c>`;
}

function buildSheetXml(cells: string): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<dimension ref="A1:S66"/>
<sheetViews><sheetView rightToLeft="1"/></sheetViews>
<sheetData>${cells}</sheetData>
</worksheet>`;
}

describe("extractRoadmapItems", () => {
  it("splits the אתגרים: prefix out of the challenges cell", () => {
    const xml = buildSheetXml(
      `<row r="43">${inlineStrCell("C43", "Title")}</row>` +
        `<row r="44">${inlineStrCell("C44", "Detail")}</row>` +
        `<row r="45">${inlineStrCell("C45", "אתגרים: some challenge text")}</row>`,
    );
    const sheet = parseSheet(xml, []);
    const items = extractRoadmapItems(sheet);
    const step = items.find(
      (i) => i.channelId === "efficiency" && i.kind === "step" && i.slot === 1,
    );
    expect(step).toBeDefined();
    expect(step?.titleHe).toBe("Title");
    expect(step?.detailHe).toBe("Detail");
    expect(step?.challengesHe).toBe("some challenge text");
  });

  it("keeps position-stable slots — an empty first slot doesn't shift the second", () => {
    const xml = buildSheetXml(
      `<row r="46">${inlineStrCell("C46", "Second slot title")}</row>`,
    );
    const sheet = parseSheet(xml, []);
    const items = extractRoadmapItems(sheet);
    const slot1 = items.find(
      (i) => i.channelId === "efficiency" && i.kind === "step" && i.slot === 1,
    );
    const slot2 = items.find(
      (i) => i.channelId === "efficiency" && i.kind === "step" && i.slot === 2,
    );
    expect(slot1).toBeUndefined();
    expect(slot2?.titleHe).toBe("Second slot title");
  });

  it("emits a target item for a single-line 2025-2030 target row", () => {
    const xml = buildSheetXml(`<row r="40">${inlineStrCell("E40", "30% target")}</row>`);
    const sheet = parseSheet(xml, []);
    const items = extractRoadmapItems(sheet);
    const target = items.find(
      (i) => i.channelId === "renewables_storage" && i.kind === "target",
    );
    expect(target?.titleHe).toBe("30% target");
    expect(target?.detailHe).toBeNull();
    expect(target?.challengesHe).toBeNull();
  });

  it("produces nothing for a channel/phase with no roadmap content", () => {
    const sheet = parseSheet(buildSheetXml(""), []);
    const items = extractRoadmapItems(sheet);
    expect(items).toHaveLength(0);
  });
});
