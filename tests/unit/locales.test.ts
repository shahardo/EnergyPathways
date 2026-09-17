import { describe, expect, it } from "vitest";
import { DEFAULT_LOCALE, LOCALE_DIRECTION, LOCALES, isLocale } from "@/lib/i18n/locales";

describe("locales", () => {
  it("defaults to Hebrew, matching the workbook's own orientation", () => {
    expect(DEFAULT_LOCALE).toBe("he");
  });

  it("maps Hebrew to rtl and English to ltr", () => {
    expect(LOCALE_DIRECTION.he).toBe("rtl");
    expect(LOCALE_DIRECTION.en).toBe("ltr");
  });

  it("recognizes only the supported locales", () => {
    for (const locale of LOCALES) {
      expect(isLocale(locale)).toBe(true);
    }
    expect(isLocale("fr")).toBe(false);
    expect(isLocale("")).toBe(false);
  });
});
