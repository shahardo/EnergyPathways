import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import type { Locale } from "@/lib/i18n/locales";
import type { WorkbookPayload } from "@/lib/schemas/workbook";

/**
 * The transposed (channels-as-rows) view's own quality gate, mirroring
 * structural-fidelity.spec.ts/accessibility.spec.ts/visual-regression.spec.ts's
 * conventions for the main matrix, scoped to what's specific to this page:
 * every channel gets exactly one row, the pinned channel column really
 * stays pinned under horizontal scroll, and colours still resolve through
 * the same `buildColorScale`/`computeTrilemmaScores` the main matrix uses
 * (verified against a live fetched value, not a hand-picked constant, so
 * this doesn't drift from the real workbook data).
 */
async function fetchPayload(page: Page): Promise<WorkbookPayload> {
  const response = await page.request.get("/api/workbook");
  expect(response.ok()).toBe(true);
  return (await response.json()) as WorkbookPayload;
}

for (const locale of ["he", "en"] as const satisfies readonly Locale[]) {
  test.describe(`channel matrix (${locale})`, () => {
    test("has no axe violations", async ({ page }) => {
      await page.goto(`/${locale}/by-channel`);
      await page.waitForSelector("table");
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
        .analyze();
      expect(results.violations).toEqual([]);
    });

    test("renders exactly one row per channel, in workbook column order", async ({
      page,
    }) => {
      const payload = await fetchPayload(page);
      await page.goto(`/${locale}/by-channel`);
      const rows = page.locator("tbody tr");
      await expect(rows).toHaveCount(payload.channels.length);

      const expectedOrder = [...payload.channels]
        .sort((a, b) => a.columnOrder - b.columnOrder)
        .map((c) => (locale === "he" ? c.nameHe : c.nameEn));
      const renderedNames = await rows.locator("th").allTextContents();
      expect(renderedNames).toEqual(expectedOrder);
    });

    test("the pinned channel column stays in place under horizontal scroll", async ({
      page,
    }) => {
      await page.goto(`/${locale}/by-channel`);
      const scroller = page.locator('[role="region"]');
      const firstRowHeader = page.locator("tbody tr th").first();
      const before = await firstRowHeader.boundingBox();
      await scroller.evaluate((el) => {
        el.scrollLeft = 300;
      });
      await page.waitForTimeout(50);
      const after = await firstRowHeader.boundingBox();
      expect(after?.x).toBeCloseTo(before?.x ?? -1, 0);
    });

    test("a dimension score cell's colour matches the same colour scale the main matrix uses", async ({
      page,
    }) => {
      const payload = await fetchPayload(page);
      const security5 = payload.dimensionAverages.find(
        (d) => d.dimension === "security" && d.value === 5,
      );
      test.skip(
        !security5,
        "no channel scores a perfect 5 on security in the current workbook",
      );
      await page.goto(`/${locale}/by-channel`);
      // The main matrix's own golden-colour anchor (T6b): a dimension
      // average of 5 renders #63BE7B, since colour scales are shared code
      // (buildColorScale), not re-implemented for this view.
      const cell = page.locator("td", { hasText: "5.0" }).first();
      await expect(cell).toHaveCSS("background-color", "rgb(99, 190, 123)");
    });

    test("screenshot matches baseline", async ({ page }) => {
      await page.goto(`/${locale}/by-channel`);
      await page.waitForSelector("table");
      await page.waitForTimeout(150);
      await expect(page).toHaveScreenshot(`channel-matrix-${locale}.png`, {
        fullPage: true,
        animations: "disabled",
      });
    });
  });
}
