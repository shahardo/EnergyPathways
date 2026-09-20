"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Likelihood, WorkbookPayload } from "@/lib/schemas/workbook";
import type { Locale } from "@/lib/i18n/locales";
import {
  EMPTY_FILTERS,
  isChannelVisible,
  parseColumnFilters,
  serializeColumnFilters,
  toggleSetMember,
  type ColumnFilters,
} from "./columnFilters";
import {
  parseSectionVisibility,
  serializeSectionVisibility,
  type SectionVisibility,
} from "./sectionVisibility";
import { FilterToolbar } from "./FilterToolbar";
import { WorkbookMatrix } from "./WorkbookMatrix";

export interface WorkbookExplorerProps {
  payload: WorkbookPayload;
  locale: Locale;
}

/**
 * Owns F-106's URL-synced filter state (DEV-PLAN T13) plus the Trilemma
 * scores/charts/roadmap section-visibility selectors, and derives which
 * channels and row-groups `WorkbookMatrix` shows from them. The URL is the
 * only source of truth for both -- no separate component state -- so a
 * reload restores them exactly, with no hydration mismatch to reconcile.
 * The two dimensions are parsed/serialized independently
 * (`columnFilters.ts` / `sectionVisibility.ts`) but share one URL, so
 * `applyState` merges their params into a single query string rather than
 * letting one dimension's update clobber the other's.
 */
export function WorkbookExplorer({ payload, locale }: WorkbookExplorerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = useMemo(() => parseColumnFilters(searchParams), [searchParams]);
  const hiddenSections = useMemo(
    () => parseSectionVisibility(searchParams),
    [searchParams],
  );

  function applyState(nextFilters: ColumnFilters, nextHiddenSections: SectionVisibility) {
    const params = new URLSearchParams();
    for (const [key, value] of serializeColumnFilters(nextFilters)) {
      params.set(key, value);
    }
    for (const [key, value] of serializeSectionVisibility(nextHiddenSections)) {
      params.set(key, value);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  const likelihoodByChannelId = useMemo(() => {
    const map = new Map<string, Likelihood>();
    for (const t of payload.channelText) map.set(t.channelId, t.likelihood);
    return map;
  }, [payload.channelText]);

  const visibleChannelIds = useMemo(() => {
    if (filters.axisGroups.size === 0 && filters.likelihoods.size === 0) return undefined;
    return new Set(
      payload.channels
        .filter((c) =>
          isChannelVisible(c, likelihoodByChannelId.get(c.channelId) ?? null, filters),
        )
        .map((c) => c.channelId),
    );
  }, [payload.channels, likelihoodByChannelId, filters]);

  return (
    <div className="flex flex-col gap-3">
      <FilterToolbar
        axisGroups={payload.axisGroups}
        locale={locale}
        filters={filters}
        hiddenSections={hiddenSections}
        onToggleAxisGroup={(id) =>
          applyState(
            { ...filters, axisGroups: toggleSetMember(filters.axisGroups, id) },
            hiddenSections,
          )
        }
        onToggleLikelihood={(value) =>
          applyState(
            { ...filters, likelihoods: toggleSetMember(filters.likelihoods, value) },
            hiddenSections,
          )
        }
        onToggleSection={(key) =>
          applyState(filters, toggleSetMember(hiddenSections, key))
        }
        onClear={() => applyState(EMPTY_FILTERS, hiddenSections)}
      />
      <WorkbookMatrix
        payload={payload}
        locale={locale}
        visibleChannelIds={visibleChannelIds}
        showScores={!hiddenSections.has("scores")}
        showCharts={!hiddenSections.has("charts")}
        showRoadmap={!hiddenSections.has("roadmap")}
      />
    </div>
  );
}
