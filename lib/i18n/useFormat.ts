"use client";

import { useMemo } from "react";
import type { Locale } from "./locales";

const NUMBER_LOCALE: Record<Locale, string> = {
  he: "he-IL-u-nu-latn",
  en: "en-US-u-nu-latn",
};

/**
 * Score / potential formatting shared by both locales (SPEC §5.10 rule 3):
 * one-decimal scores, thousands-separated MW, Western Arabic numerals throughout.
 */
export function useFormat(locale: Locale) {
  return useMemo(() => {
    const numberLocale = NUMBER_LOCALE[locale];
    const scoreFormatter = new Intl.NumberFormat(numberLocale, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
    const megawattFormatter = new Intl.NumberFormat(numberLocale, {
      maximumFractionDigits: 0,
    });

    return {
      score: (value: number | null): string | null =>
        value === null ? null : scoreFormatter.format(value),
      /** Same one-decimal, Western-numeral precision as `score`, for trajectory values (SPEC §5.5). */
      trajectoryValue: (value: number | null): string | null =>
        value === null ? null : scoreFormatter.format(value),
      megawatts: (value: number | null): string | null =>
        value === null ? null : `${megawattFormatter.format(value)} MW`,
    };
  }, [locale]);
}
