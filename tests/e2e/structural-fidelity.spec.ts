import { test, expect, type Page } from "@playwright/test";
import type { Locale } from "@/lib/i18n/locales";
import type { WorkbookPayload } from "@/lib/schemas/workbook";
import { computeAxisGroupSpans } from "@/components/workbook/gridLayout";
import { buildRoadmapLayout, parseCellRef } from "@/components/workbook/roadmapRows";

/**
 * AC-2 (SPEC §6.5 / DEV-PLAN T14): a DOM structural test against the
 * ingested layout metadata itself, so a wiring regression (wrong column
 * order, a span that no longer matches its axis group, a fill that
 * drifted from `payload`) fails here even though every pure function it's
 * built from (colorScale, computeAxisGroupSpans, buildRoadmapLayout, ...)
 * already has its own unit test. This is the render, not the math.
 *
 * These SPEC-normative fills are constants, not workbook data (see the
 * same constants in `WorkbookMatrix.tsx`) -- duplicated here deliberately,
 * the same way the source file hardcodes them once.
 */
const LABEL_FILL = "#A6A6A6";
const SPARKLINE_CELL_FILL = "#D9D9D9";
const BARRIER_FILL = "#BFBFBF";

// Default-collapsed `data-matrix-row` indices (rows 1-3 are 0-2; content
// rows start at 3). Deterministic because `buildScoreBlockRows` with an
// empty `expandedDimensions` set emits exactly one row per dimension, T9's
// sparkline row is always inserted directly after its score row, and the
// trilemma composite (OQ-16) always follows equity's sparkline
// (WorkbookMatrix.tsx's `contentRows` builder), with all three sections
// shown (the default, none toggled off).
const ROW = {
  axis: 0,
  name: 1,
  potential: 2,
  securityScore: 3,
  securitySparkline: 4,
  environmentScore: 5,
  environmentSparkline: 6,
  equityScore: 7,
  equitySparkline: 8,
  trilemma: 9,
  likelihood: 10,
  barriers: 11,
} as const;

function hexToRgb(hex: string): string {
  const clean = hex.replace(/^#/, "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgb(${r}, ${g}, ${b})`;
}

async function fetchPayload(page: Page): Promise<WorkbookPayload> {
  const response = await page.request.get("/api/workbook");
  expect(response.ok()).toBe(true);
  return (await response.json()) as WorkbookPayload;
}

function matrixCell(page: Page, rowIndex: number, colIndex: number) {
  return page.locator(`[data-matrix-row="${rowIndex}"][aria-colindex="${colIndex}"]`);
}

for (const locale of ["he", "en"] as const satisfies readonly Locale[]) {
  test.describe(`structural fidelity (${locale})`, () => {
    test("channel columns render in workbook order", async ({ page }) => {
      const payload = await fetchPayload(page);
      const channels = [...payload.channels].sort(
        (a, b) => a.columnOrder - b.columnOrder,
      );
      expect(channels).toHaveLength(17);

      await page.goto(`/${locale}`);
      const nameRow = page.locator(`[data-matrix-row="${ROW.name}"]`);
      await expect(nameRow).toHaveCount(17);

      for (const [index, channel] of channels.entries()) {
        const cell = matrixCell(page, ROW.name, index + 2);
        await expect(cell).toHaveText(locale === "he" ? channel.nameHe : channel.nameEn);
      }
    });

    test("axis group headers span exactly their channels' columns", async ({ page }) => {
      const payload = await fetchPayload(page);
      const channels = [...payload.channels].sort(
        (a, b) => a.columnOrder - b.columnOrder,
      );
      const spans = computeAxisGroupSpans(channels, payload.axisGroups);
      expect(spans.length).toBeGreaterThan(0);

      await page.goto(`/${locale}`);
      for (const span of spans) {
        // gridColumnStart is 1-based with the label column at line 1, so
        // channel index (gridColumnStart - 2) is the 0-based first column;
        // aria-colindex on that cell is index + 2 (see WorkbookMatrix.tsx).
        const colIndex = span.gridColumnStart;
        const header = matrixCell(page, ROW.axis, colIndex);
        await expect(header).toHaveText(
          locale === "he" ? span.axisGroup.nameHe : span.axisGroup.nameEn,
        );
        await expect(header).toHaveCSS(
          "background-color",
          hexToRgb(span.axisGroup.headerFill),
        );
        if (span.columnCount > 1) {
          await expect(header).toHaveAttribute("aria-colspan", String(span.columnCount));
        }
      }
    });

    test("channel name cells fill with their axis group's name colour", async ({
      page,
    }) => {
      const payload = await fetchPayload(page);
      const channels = [...payload.channels].sort(
        (a, b) => a.columnOrder - b.columnOrder,
      );
      const axisGroupById = new Map(payload.axisGroups.map((g) => [g.axisGroupId, g]));

      await page.goto(`/${locale}`);
      for (const [index, channel] of channels.entries()) {
        const axisGroup = axisGroupById.get(channel.axisGroupId);
        expect(axisGroup).toBeDefined();
        const cell = matrixCell(page, ROW.name, index + 2);
        await expect(cell).toHaveCSS("background-color", hexToRgb(axisGroup!.nameFill));
      }
    });

    test("potential row: grey fill everywhere, blank is empty text not zero", async ({
      page,
    }) => {
      const payload = await fetchPayload(page);
      const channels = [...payload.channels].sort(
        (a, b) => a.columnOrder - b.columnOrder,
      );
      await page.goto(`/${locale}`);

      let sawBlank = false;
      for (const [index, channel] of channels.entries()) {
        const cell = matrixCell(page, ROW.potential, index + 2);
        await expect(cell).toHaveCSS("background-color", hexToRgb(LABEL_FILL));
        const text = (await cell.textContent())?.trim() ?? "";
        if (channel.potentialRaw === null) {
          expect(text).toBe("");
          sawBlank = true;
        } else {
          expect(text).toBe(channel.potentialRaw);
          expect(text).not.toBe("0");
        }
      }
      // The current workbook has at least one channel with no potential
      // figure (SPEC §1.3's blank-is-null rule) -- assert the fixture
      // still exercises that path rather than passing vacuously.
      expect(sawBlank).toBe(true);
    });

    test("score rows collapsed by default; expanding adds exactly 5 sub-score rows without recolouring other rows", async ({
      page,
    }) => {
      const payload = await fetchPayload(page);
      await page.goto(`/${locale}`);

      const allMatrixRows = page.locator("[data-matrix-row]");
      const rowIndexes = new Set(
        await allMatrixRows.evaluateAll((els) =>
          els.map((el) => Number((el as HTMLElement).dataset.matrixRow)),
        ),
      );
      expect(Math.max(...rowIndexes)).toBe(ROW.barriers);
      expect(rowIndexes.size).toBe(ROW.barriers + 1);

      const channels = [...payload.channels].sort(
        (a, b) => a.columnOrder - b.columnOrder,
      );
      const demandReductionIndex = channels.findIndex(
        (c) => c.channelId === "demand_reduction",
      );
      expect(demandReductionIndex).toBeGreaterThanOrEqual(0);
      const envColBefore = matrixCell(
        page,
        ROW.environmentScore,
        demandReductionIndex + 2,
      );
      const colourBefore = await envColBefore.evaluate(
        (el) => getComputedStyle(el).backgroundColor,
      );

      // Located by its label text, not a fixed aria-rowindex: expanding
      // inserts the dimension's 5 sub-score rows *above* the score row
      // (the workbook's own order -- sub-scores 4-8 precede average row
      // 9), so the score row's own index shifts after the click.
      const securityHeader = page.getByRole("rowheader", {
        name: locale === "he" ? "ביטחון" : "Security",
        exact: true,
      });
      await expect(securityHeader).toHaveAttribute("aria-expanded", "false");
      await securityHeader.click();
      await expect(securityHeader).toHaveAttribute("aria-expanded", "true");

      const expandedRows = await allMatrixRows.evaluateAll((els) =>
        els.map((el) => Number((el as HTMLElement).dataset.matrixRow)),
      );
      expect(new Set(expandedRows).size).toBe(ROW.barriers + 1 + 5);

      const colourAfter = await matrixCell(
        page,
        ROW.environmentScore + 5,
        demandReductionIndex + 2,
      ).evaluate((el) => getComputedStyle(el).backgroundColor);
      expect(colourAfter).toBe(colourBefore);
    });

    test("golden colour: environment average of 5 renders #63BE7B (T6b anchor)", async ({
      page,
    }) => {
      const payload = await fetchPayload(page);
      const channels = [...payload.channels].sort(
        (a, b) => a.columnOrder - b.columnOrder,
      );
      const demandReductionIndex = channels.findIndex(
        (c) => c.channelId === "demand_reduction",
      );
      const average = payload.dimensionAverages.find(
        (d) => d.channelId === "demand_reduction" && d.dimension === "environment",
      );
      test.skip(
        average?.value !== 5,
        "workbook data changed: demand_reduction's environment average is no longer 5",
      );

      await page.goto(`/${locale}`);
      const cell = matrixCell(page, ROW.environmentScore, demandReductionIndex + 2);
      await expect(cell).toHaveCSS("background-color", hexToRgb("#63BE7B"));
    });

    test("sparkline and likelihood/barriers rows carry their SPEC fills", async ({
      page,
    }) => {
      const payload = await fetchPayload(page);
      const channels = [...payload.channels].sort(
        (a, b) => a.columnOrder - b.columnOrder,
      );
      await page.goto(`/${locale}`);

      for (const rowIndex of [
        ROW.securitySparkline,
        ROW.environmentSparkline,
        ROW.equitySparkline,
      ]) {
        for (const [index] of channels.entries()) {
          await expect(matrixCell(page, rowIndex, index + 2)).toHaveCSS(
            "background-color",
            hexToRgb(SPARKLINE_CELL_FILL),
          );
        }
      }
      for (const rowIndex of [ROW.likelihood, ROW.barriers]) {
        for (const [index] of channels.entries()) {
          await expect(matrixCell(page, rowIndex, index + 2)).toHaveCSS(
            "background-color",
            hexToRgb(BARRIER_FILL),
          );
        }
      }
    });

    test("sparklines for channels with no trajectory data expose an empty accessible name", async ({
      page,
    }) => {
      const payload = await fetchPayload(page);
      const channels = [...payload.channels].sort(
        (a, b) => a.columnOrder - b.columnOrder,
      );
      const noDataChannelIds = new Set(
        payload.channels
          .filter((c) =>
            payload.trajectories.every(
              (t) =>
                t.channelId !== c.channelId ||
                t.metric !== "generation" ||
                t.value === null,
            ),
          )
          .map((c) => c.channelId),
      );
      test.skip(noDataChannelIds.size === 0, "no channel is missing generation data");

      await page.goto(`/${locale}`);
      for (const [index, channel] of channels.entries()) {
        if (!noDataChannelIds.has(channel.channelId)) continue;
        const cell = matrixCell(page, ROW.securitySparkline, index + 2);
        const label = await cell.locator("[aria-label]").getAttribute("aria-label");
        expect(label).toMatch(locale === "he" ? /אין נתונים/ : /no data/);
      }
    });

    test("trigger callouts attach inside their anchor cell's roadmap slot", async ({
      page,
    }) => {
      const payload = await fetchPayload(page);
      const channels = [...payload.channels].sort(
        (a, b) => a.columnOrder - b.columnOrder,
      );
      const roadmapLayout = buildRoadmapLayout(payload.phaseBands);
      expect(payload.callouts.length).toBeGreaterThan(0);

      await page.goto(`/${locale}`);
      for (const callout of payload.callouts) {
        const { row } = parseCellRef(callout.anchorCell);
        const slot = roadmapLayout.rowNumberToSlot.get(row);
        expect(slot, `no roadmap slot for ${callout.anchorCell}`).toBeDefined();
        const roadmapRowIndex = roadmapLayout.rows.indexOf(slot!);
        expect(roadmapRowIndex).toBeGreaterThanOrEqual(0);
        const channelIndex = channels.findIndex((c) => c.channelId === callout.channelId);
        expect(channelIndex).toBeGreaterThanOrEqual(0);

        // aria-colindex continues the outer grid's numbering (column 1 =
        // the label column), so a roadmap channel column is colIndex + 2,
        // not + 1 (see WorkbookMatrix.tsx's roadmap gridcell comment).
        const anchorCell = page.locator(
          `[data-roadmap-row="${roadmapRowIndex}"][aria-colindex="${channelIndex + 2}"]`,
        );
        const note = page.locator(`#${callout.calloutId}`);
        await expect(note).toHaveAttribute("role", "note");
        const noteText = await note.textContent();
        expect(noteText).toBeTruthy();
        await expect(anchorCell).toContainText(noteText!);
        const describedBy = await anchorCell.getAttribute("aria-describedby");
        expect(describedBy?.split(/\s+/)).toContain(callout.calloutId);
      }
    });

    test("label pane stays fixed while the data pane scrolls horizontally", async ({
      page,
    }) => {
      await page.goto(`/${locale}`);
      // The row-1 label ("Channel"/"תחום"), in the fixed pane -- not a
      // channel-name data cell, which is expected to move with the scroll.
      const label = page.locator('[role="rowheader"][aria-rowindex="2"]');
      const dataCell = matrixCell(page, ROW.name, 2);
      const labelBefore = await label.boundingBox();
      const dataBefore = await dataCell.boundingBox();
      expect(labelBefore).not.toBeNull();
      expect(dataBefore).not.toBeNull();

      const dataPane = page
        .locator("[data-matrix-row]")
        .first()
        .locator("xpath=ancestor::div[contains(@class,'overflow-x-auto')]");
      await dataPane.evaluate((el) => {
        // RTL Chromium uses the negative-scrollLeft convention, so "scroll
        // toward the far edge" is -scrollWidth there and +scrollWidth in
        // LTR -- scrollWidth itself works as a magnitude in both.
        const rtl = getComputedStyle(el).direction === "rtl";
        el.scrollLeft = rtl ? -el.scrollWidth : el.scrollWidth;
      });

      const labelAfter = await label.boundingBox();
      const dataAfter = await dataCell.boundingBox();
      expect(labelAfter).not.toBeNull();
      expect(dataAfter).not.toBeNull();
      expect(Math.abs(labelAfter!.x - labelBefore!.x)).toBeLessThan(2);
      expect(Math.abs(dataAfter!.x - dataBefore!.x)).toBeGreaterThan(50);
    });
  });
}
