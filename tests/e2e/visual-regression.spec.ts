import { test, expect } from "@playwright/test";
import type { Locale } from "@/lib/i18n/locales";

/**
 * AC-2's visual leg (SPEC §6.5 / DEV-PLAN T14): screenshots of the matrix
 * in both locales against committed baselines. A pixel diff catches what
 * the structural-fidelity DOM test (structural-fidelity.spec.ts) can't --
 * spacing, borders, font rendering of the fills it already checks by
 * value. `expect.toHaveScreenshot`'s `maxDiffPixelRatio` (playwright.config.ts)
 * tolerates the sub-pixel anti-aliasing noise between machines without
 * masking a real regression.
 *
 * Baselines are committed per OS (Playwright's default naming), so
 * regenerate them with `npm run e2e -- --update-snapshots
 * tests/e2e/visual-regression.spec.ts` on the same platform CI runs on
 * (linux) if a deliberate visual change lands.
 */
for (const locale of ["he", "en"] as const satisfies readonly Locale[]) {
  test(`matrix screenshot matches baseline (${locale})`, async ({ page }) => {
    await page.goto(`/${locale}`);
    await page.waitForSelector('[role="grid"]');
    // Sparklines/roadmap measurement effects settle asynchronously
    // (ResizeObserver, see WorkbookMatrix.tsx) -- wait a frame past load
    // so the baseline captures the settled layout, not a transient one.
    await page.waitForTimeout(250);
    await expect(page).toHaveScreenshot(`matrix-${locale}.png`, {
      fullPage: true,
      animations: "disabled",
    });
  });
}
