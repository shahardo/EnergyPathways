"use client";

import type { AxisGroup, Likelihood } from "@/lib/schemas/workbook";
import type { Locale } from "@/lib/i18n/locales";
import { contrastTextColor } from "@/lib/color";
import type { ColumnFilters } from "./columnFilters";

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

export interface FilterToolbarProps {
  axisGroups: readonly AxisGroup[];
  locale: Locale;
  filters: ColumnFilters;
  onToggleAxisGroup: (id: AxisGroup["axisGroupId"]) => void;
  onToggleLikelihood: (value: Likelihood) => void;
  onClear: () => void;
}

/**
 * F-106 column filtering toolbar (DEV-PLAN T13). Additive over the
 * workbook's own default view (SPEC §5.10's recorded deviation) -- with
 * nothing selected in a dimension, every channel is visible, exactly as
 * in the workbook. Filtering never touches colour: `WorkbookMatrix`
 * always computes its colour scales from the full, unfiltered payload
 * (SPEC §5.9); this toolbar only ever changes which of the 17 columns
 * render.
 */
export function FilterToolbar({
  axisGroups,
  locale,
  filters,
  onToggleAxisGroup,
  onToggleLikelihood,
  onClear,
}: FilterToolbarProps) {
  const hasActiveFilter = filters.axisGroups.size > 0 || filters.likelihoods.size > 0;
  return (
    <div
      role="toolbar"
      aria-label={locale === "he" ? "סינון עמודות" : "Column filters"}
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
