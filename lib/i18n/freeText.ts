import type { Locale } from "./locales";

export interface ResolvedFreeText {
  text: string;
  /** True when English mode is falling back to the Hebrew source (SPEC §5.10 rule 5, OQ-11). */
  isHebrewSource: boolean;
}

/**
 * Free workbook text (barriers, roadmap steps, callouts) has no approved
 * English translation yet (OQ-11) — every `*_en` field is `""` or `null`.
 * English mode falls back to the Hebrew source with a marker rather than
 * shipping machine translation (SPEC §5.10 rule 5). `null` in, `null` out:
 * a genuinely blank workbook cell stays blank in both locales.
 */
export function resolveFreeText(
  locale: Locale,
  he: string | null,
  en: string | null,
): ResolvedFreeText | null {
  if (locale === "he") return he === null ? null : { text: he, isHebrewSource: false };
  if (en !== null && en !== "") return { text: en, isHebrewSource: false };
  return he === null ? null : { text: he, isHebrewSource: true };
}
