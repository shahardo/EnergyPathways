import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import type { Locale } from "@/lib/i18n/locales";

/**
 * AC-5 (SPEC §6.5 / DEV-PLAN T14): no WCAG 2.2 AA violations, in both
 * locales, on the states a user actually reaches -- collapsed (default),
 * one dimension expanded (F-102's disclosure), and the channel drawer
 * open (F-105) -- not just the initial paint.
 */
for (const locale of ["he", "en"] as const satisfies readonly Locale[]) {
  test.describe(`accessibility (${locale})`, () => {
    test("initial matrix has no axe violations", async ({ page }) => {
      await page.goto(`/${locale}`);
      await page.waitForSelector('[role="grid"]');
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
        .analyze();
      expect(results.violations).toEqual([]);
    });

    test("an expanded dimension has no axe violations", async ({ page }) => {
      await page.goto(`/${locale}`);
      const securityHeader = page.getByRole("rowheader", {
        name: locale === "he" ? "ביטחון" : "Security",
        exact: true,
      });
      await securityHeader.click();
      await expect(securityHeader).toHaveAttribute("aria-expanded", "true");
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
        .analyze();
      expect(results.violations).toEqual([]);
    });

    test("the channel detail drawer has no axe violations", async ({ page }) => {
      await page.goto(`/${locale}`);
      const firstChannelName = page
        .locator('[data-matrix-row="1"][role="columnheader"]')
        .first();
      await firstChannelName.click();
      await expect(page.getByRole("dialog")).toBeVisible();
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
        .analyze();
      expect(results.violations).toEqual([]);
    });
  });
}
