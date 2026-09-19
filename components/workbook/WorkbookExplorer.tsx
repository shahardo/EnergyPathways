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
import { FilterToolbar } from "./FilterToolbar";
import { WorkbookMatrix } from "./WorkbookMatrix";

export interface WorkbookExplorerProps {
  payload: WorkbookPayload;
  locale: Locale;
}

/**
 * Owns F-106's URL-synced filter state (DEV-PLAN T13) and derives which
 * channels `WorkbookMatrix` shows from it. The URL is the only source of
 * truth for the filter -- no separate component state -- so a reload
 * restores it exactly (the acceptance criterion) with no hydration
 * mismatch to reconcile.
 */
export function WorkbookExplorer({ payload, locale }: WorkbookExplorerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = useMemo(() => parseColumnFilters(searchParams), [searchParams]);

  function applyFilters(next: ColumnFilters) {
    const query = serializeColumnFilters(next).toString();
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
        onToggleAxisGroup={(id) =>
          applyFilters({
            ...filters,
            axisGroups: toggleSetMember(filters.axisGroups, id),
          })
        }
        onToggleLikelihood={(value) =>
          applyFilters({
            ...filters,
            likelihoods: toggleSetMember(filters.likelihoods, value),
          })
        }
        onClear={() => applyFilters(EMPTY_FILTERS)}
      />
      <WorkbookMatrix
        payload={payload}
        locale={locale}
        visibleChannelIds={visibleChannelIds}
      />
    </div>
  );
}
