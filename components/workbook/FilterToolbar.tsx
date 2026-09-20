"use client";

import type { AxisGroup, Likelihood } from "@/lib/schemas/workbook";
import type { Locale } from "@/lib/i18n/locales";
import { contrastTextColor } from "@/lib/color";
import type { ColumnFilters } from "./columnFilters";
import {
  SECTION_KEYS,
  type SectionKey,
  type SectionVisibility,
} from "./sectionVisibility";

const LIKELIHOOD_OPTIONS: readonly {
  value: Likelihood;
  labelHe: string;
  labelEn: string;
}[] = [
  { value: "high", labelHe: "גבוהה", labelEn: "High" },
  { value: "medium", labelHe: "בינונית", labelEn: "Medium" },
  { value: "low", labelHe: "נמוכה", labelEn: "Low" },
  { value: null, labelHe: "-", labelEn: "Unspecified" },
];

const SECTION_LABEL: Record<SectionKey, { labelHe: string; labelEn: string }> = {
  scores: { labelHe: "ציוני הטרילמה", labelEn: "Trilemma scores" },
  charts: { labelHe: "גרפי הטרילמה", labelEn: "Trilemma charts" },
  roadmap: { labelHe: "מפת דרכים ופעולות", labelEn: "Roadmap / operations" },
};

export interface FilterToolbarProps {
  axisGroups: readonly AxisGroup[];
  locale: Locale;
  filters: ColumnFilters;
  hiddenSections: SectionVisibility;
  onToggleAxisGroup: (id: AxisGroup["axisGroupId"]) => void;
  onToggleLikelihood: (value: Likelihood) => void;
  onToggleSection: (key: SectionKey) => void;
  onClear: () => void;
}

/**
 * F-106 column filtering toolbar (DEV-PLAN T13), plus the Trilemma
 * scores/charts/roadmap section visibility selectors. Both are additive
 * over the workbook's own default view (SPEC §5.10's recorded deviation)
 * -- with nothing toggled off, everything is visible, exactly as in the
 * workbook. Neither ever touches colour: `WorkbookMatrix` always computes
 * its colour scales from the full, unfiltered payload (SPEC §5.9); the
 * column filters only change which of the 17 columns render, and the
 * section selectors only change which row-groups render.
 */
export function FilterToolbar({
  axisGroups,
  locale,
  filters,
  hiddenSections,
  onToggleAxisGroup,
  onToggleLikelihood,
  onToggleSection,
  onClear,
}: FilterToolbarProps) {
  const hasActiveFilter = filters.axisGroups.size > 0 || filters.likelihoods.size > 0;
  return (
    <div
      role="toolbar"
      aria-label={locale === "he" ? "סינון ותצוגה" : "Filters and display"}
      className="flex flex-wrap items-center gap-4 text-sm"
    >
      <div className="flex flex-wrap items-center gap-1">
        <span className="text-muted-foreground text-xs font-semibold">
          {locale === "he" ? "ציר:" : "Axis:"}
        </span>
        {axisGroups.map((group) => {
          const pressed = filters.axisGroups.has(group.axisGroupId);
          return (
            <button
              key={group.axisGroupId}
              type="button"
              aria-pressed={pressed}
              onClick={() => onToggleAxisGroup(group.axisGroupId)}
              className="border-border rounded-full border px-2 py-0.5 text-xs"
              style={
                pressed
                  ? {
                      background: group.headerFill,
                      color: contrastTextColor(group.headerFill),
                      borderColor: group.headerFill,
                    }
                  : undefined
              }
            >
              {locale === "he" ? group.nameHe : group.nameEn}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <span className="text-muted-foreground text-xs font-semibold">
          {locale === "he" ? "סבירות:" : "Likelihood:"}
        </span>
        {LIKELIHOOD_OPTIONS.map((option) => {
          const pressed = filters.likelihoods.has(option.value);
          return (
            <button
              key={option.value ?? "none"}
              type="button"
              aria-pressed={pressed}
              onClick={() => onToggleLikelihood(option.value)}
              className={`border-border rounded-full border px-2 py-0.5 text-xs ${
                pressed ? "bg-primary text-primary-foreground border-primary" : ""
              }`}
            >
              {locale === "he" ? option.labelHe : option.labelEn}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <span className="text-muted-foreground text-xs font-semibold">
          {locale === "he" ? "תצוגה:" : "Show:"}
        </span>
        {SECTION_KEYS.map((key) => {
          const pressed = !hiddenSections.has(key);
          const label = SECTION_LABEL[key];
          return (
            <button
              key={key}
              type="button"
              aria-pressed={pressed}
              onClick={() => onToggleSection(key)}
              className={`border-border rounded-full border px-2 py-0.5 text-xs ${
                pressed ? "bg-primary text-primary-foreground border-primary" : ""
              }`}
            >
              {locale === "he" ? label.labelHe : label.labelEn}
            </button>
          );
        })}
      </div>
      {hasActiveFilter && (
        <button
          type="button"
          onClick={onClear}
          className="text-muted-foreground text-xs underline underline-offset-2"
        >
          {locale === "he" ? "נקה סינון" : "Clear filters"}
        </button>
      )}
    </div>
  );
}
