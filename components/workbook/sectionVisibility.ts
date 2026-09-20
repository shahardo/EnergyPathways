const HIDE_PARAM = "hide";

export const SECTION_KEYS = ["scores", "charts", "roadmap"] as const;
export type SectionKey = (typeof SECTION_KEYS)[number];

function isSectionKey(value: string): value is SectionKey {
  return (SECTION_KEYS as readonly string[]).includes(value);
}

/** Empty set = every section visible, the workbook's own default view. */
export type SectionVisibility = ReadonlySet<SectionKey>;

export const EMPTY_HIDDEN_SECTIONS: SectionVisibility = new Set();

/**
 * Show/hide selectors for the Trilemma scores, Trilemma charts (sparkline
 * rows) and roadmap sections. URL is the source of truth, same additive
 * pattern as `columnFilters.ts`'s column filters -- only *hidden* sections
 * are listed, so the default (everything shown, matching the workbook) is
 * an empty/absent param, not a `scores=1,charts=1,roadmap=1` that a reload
 * would have to reconstruct.
 */
export function parseSectionVisibility(params: URLSearchParams): SectionVisibility {
  const raw = params.get(HIDE_PARAM);
  if (!raw) return EMPTY_HIDDEN_SECTIONS;
  return new Set(raw.split(",").filter(isSectionKey));
}

export function serializeSectionVisibility(hidden: SectionVisibility): URLSearchParams {
  const params = new URLSearchParams();
  if (hidden.size > 0) params.set(HIDE_PARAM, [...hidden].join(","));
  return params;
}
