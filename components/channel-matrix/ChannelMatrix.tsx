"use client";

/**
 * The transposed workbook view (channels-as-rows): one row per generation
 * path/channel, columns grouped by dimension (score + that dimension's
 * trajectory metric across the 4 milestone years), Trilemma, Likelihood,
 * Barriers, then one column-group per roadmap phase with that phase's
 * target/step/impact slots as columns instead of rows. See
 * `channelMatrixColumns.ts` for why the score itself has no per-year
 * columns (the workbook scores a channel once, not per year -- only the
 * associated trajectory *metric* is time-series data).
 *
 * Deliberately a plain semantic `<table>`, not the main matrix's CSS-Grid
 * two-pane split: with channels as rows there are only 17 of them, so no
 * row virtualization/pane trick is needed, and a real `<table>` gives
 * correct row-height agreement between the pinned first column and the
 * rest for free (native table row layout, not two independently-rendered
 * DOM trees) -- the exact problem `WorkbookMatrix.tsx` had to solve by
 * hand for its own pinned label pane doesn't exist here. The first column
 * (channel name) is pinned via `position: sticky` on its `<th>`/`<td>`
 * cells, inside a `overflow-x-auto` wrapper around the whole `<table>` --
 * this is the standard frozen-first-column pattern and works here despite
 * `WorkbookMatrix.tsx`'s note that sticky failed *inside a wide CSS Grid*;
 * verified directly in the browser (Playwright scroll test) before relying
 * on it, since that failure mode was specific to the Grid architecture,
 * not sticky positioning in general.
 */
import { useMemo } from "react";
import {
  MILESTONE_YEARS,
  type Channel,
  type Dimension,
  type MilestoneYear,
  type RoadmapKind,
  type TrajectoryMetric,
  type WorkbookPayload,
} from "@/lib/schemas/workbook";
import type { Locale } from "@/lib/i18n/locales";
import { contrastTextColor } from "@/lib/color";
import { useFormat } from "@/lib/i18n/useFormat";
import { resolveFreeText } from "@/lib/i18n/freeText";
import {
  DIMENSIONS,
  buildDimensionColorScales,
  computeTrilemmaScores,
} from "../workbook/scoreRows";
import {
  buildRoadmapLayout,
  indexRoadmapItems,
  parseCellRef,
  roadmapItemKey,
  type RoadmapSlotRow,
} from "../workbook/roadmapRows";
import { trajectoryValuesForChannel } from "../workbook/sparklineRows";
import { CALLOUT_FILL } from "../workbook/Callout";
import { HebrewSourceMark } from "../workbook/HebrewSourceMark";
import {
  buildChannelMatrixColumnGroups,
  channelMatrixColumnKey,
  flattenChannelMatrixColumns,
  type ChannelMatrixColumn,
  type ChannelMatrixColumnGroup,
} from "./channelMatrixColumns";

const LABEL_FILL = "#A6A6A6"; // SPEC §5.3/§5.4: neutral header/blank-cell grey, same value WorkbookMatrix.tsx uses
const BARRIER_FILL = "#BFBFBF"; // SPEC §5.6: likelihood and barriers

const LIKELIHOOD_LABEL: Record<"high" | "medium" | "low", Record<Locale, string>> = {
  high: { he: "גבוהה", en: "High" },
  medium: { he: "בינונית", en: "Medium" },
  low: { he: "נמוכה", en: "Low" },
};

// UI chrome, not workbook text -- same inline-map pattern WorkbookMatrix.tsx
// uses for its own METRIC_LABEL/LIKELIHOOD_LABEL (SPEC gives no catalogue
// string for these; they don't come from the ingested workbook).
const CHANNEL_HEADER_LABEL: Record<Locale, string> = { he: "ערוץ", en: "Channel" };
const SCORE_SUBLABEL: Record<Locale, string> = { he: "ציון", en: "Score" }; // matches ChannelDrawer.tsx's existing wording
const ROADMAP_KIND_FALLBACK_LABEL: Record<RoadmapKind, Record<Locale, string>> = {
  target: { he: "יעד", en: "Target" },
  step: { he: "צעד", en: "Step" },
  impact: { he: "אימפקט", en: "Impact" },
};

interface ChannelMatrixProps {
  payload: WorkbookPayload;
  locale: Locale;
}

function trajectoryValueForYear(
  values: readonly (number | null)[],
  year: MilestoneYear,
): number | null {
  const index = MILESTONE_YEARS.indexOf(year);
  return index >= 0 ? (values[index] ?? null) : null;
}

export function ChannelMatrix({ payload, locale }: ChannelMatrixProps) {
  const format = useFormat(locale);

  const channels = useMemo(
    () => [...payload.channels].sort((a, b) => a.columnOrder - b.columnOrder),
    [payload.channels],
  );

  const roadmapLayout = useMemo(
    () => buildRoadmapLayout(payload.phaseBands),
    [payload.phaseBands],
  );
  const columnGroups = useMemo(
    () => buildChannelMatrixColumnGroups(payload.sparklineSpecs, roadmapLayout),
    [payload.sparklineSpecs, roadmapLayout],
  );
  const flatColumns = useMemo(
    () => flattenChannelMatrixColumns(columnGroups),
    [columnGroups],
  );
  const groupByColumnKey = useMemo(() => {
    const map = new Map<string, ChannelMatrixColumnGroup>();
    for (const group of columnGroups) {
      for (const column of group.columns) map.set(channelMatrixColumnKey(column), group);
    }
    return map;
  }, [columnGroups]);

  const averageByChannelDim = useMemo(() => {
    const map = new Map<string, { value: number | null; cellRef: string }>();
    for (const d of payload.dimensionAverages) {
      map.set(`${d.channelId}|${d.dimension}`, { value: d.value, cellRef: d.cellRef });
    }
    return map;
  }, [payload.dimensionAverages]);

  const colorScales = useMemo(
    () =>
      buildDimensionColorScales(
        payload.colorScaleRules,
        payload.subScores,
        payload.dimensionAverages,
      ),
    [payload.colorScaleRules, payload.subScores, payload.dimensionAverages],
  );

  const trilemmaScores = useMemo(
    () =>
      computeTrilemmaScores(
        channels,
        payload.dimensionAverages,
        payload.trilemmaColorScale,
      ),
    [channels, payload.dimensionAverages, payload.trilemmaColorScale],
  );

  const channelTextByChannelId = useMemo(
    () => new Map(payload.channelText.map((t) => [t.channelId, t])),
    [payload.channelText],
  );

  const trajectoryByChannelMetric = useMemo(() => {
    const map = new Map<string, (number | null)[]>();
    for (const channel of channels) {
      for (const metric of [
        "generation",
        "emissions",
        "price_impact",
      ] as TrajectoryMetric[]) {
        map.set(
          `${channel.channelId}|${metric}`,
          trajectoryValuesForChannel(payload.trajectories, channel.channelId, metric),
        );
      }
    }
    return map;
  }, [channels, payload.trajectories]);

  const roadmapItemsByKey = useMemo(
    () => indexRoadmapItems(payload.roadmapItems),
    [payload.roadmapItems],
  );
  const calloutsByCellKey = useMemo(() => {
    const map = new Map<string, WorkbookPayload["callouts"][number][]>();
    for (const callout of payload.callouts) {
      const { row } = parseCellRef(callout.anchorCell);
      const slot = roadmapLayout.rowNumberToSlot.get(row);
      if (!slot) continue;
      const key = roadmapItemKey(slot.phase, slot.kind, slot.slot, callout.channelId);
      const list = map.get(key) ?? [];
      list.push(callout);
      map.set(key, list);
    }
    return map;
  }, [payload.callouts, roadmapLayout]);

  const phaseFillById = useMemo(
    () =>
      new Map(
        payload.phaseBands.map((band) => [
          band.phase,
          { label: band.labelFill, body: band.bodyFill },
        ]),
      ),
    [payload.phaseBands],
  );
  const subGroupLabelByKey = useMemo(() => {
    const map = new Map<string, { labelHe: string; labelEn: string }>();
    for (const band of payload.phaseBands) {
      for (const group of band.subGroups) {
        map.set(`${band.phase}|${group.key}`, {
          labelHe: group.labelHe,
          labelEn: group.labelEn,
        });
      }
    }
    return map;
  }, [payload.phaseBands]);

  const rowLabelByKey = useMemo(
    () => new Map(payload.rowLabels.map((r) => [r.key, r])),
    [payload.rowLabels],
  );

  function groupLabel(group: ChannelMatrixColumnGroup): string {
    if (group.id === "potential") {
      const row = rowLabelByKey.get("potential");
      return row ? (locale === "he" ? (row.labelHe ?? "") : row.labelEn) : "Potential";
    }
    if (group.id === "trilemma" || group.id === "likelihood" || group.id === "barriers") {
      const row = rowLabelByKey.get(group.id);
      return row ? (locale === "he" ? (row.labelHe ?? "") : row.labelEn) : group.id;
    }
    if (DIMENSIONS.includes(group.id as Dimension)) {
      const row = rowLabelByKey.get(group.id);
      return row ? (locale === "he" ? (row.labelHe ?? "") : row.labelEn) : group.id;
    }
    // A roadmap phase id, e.g. "2025-2030".
    return group.id.replace("-", "–");
  }

  function groupHeaderFill(group: ChannelMatrixColumnGroup): string {
    const phaseFill = phaseFillById.get(group.id as never);
    return phaseFill ? phaseFill.label : LABEL_FILL;
  }

  function columnSubLabel(column: ChannelMatrixColumn): string {
    if (column.kind === "dimension-score") return SCORE_SUBLABEL[locale];
    if (column.kind === "trajectory") return String(column.year);
    if (column.kind === "roadmap-slot") {
      const subLabel = column.slot.subGroupKey
        ? subGroupLabelByKey.get(`${column.slot.phase}|${column.slot.subGroupKey}`)
        : undefined;
      const text = subLabel
        ? locale === "he"
          ? subLabel.labelHe
          : subLabel.labelEn
        : ROADMAP_KIND_FALLBACK_LABEL[column.slot.kind][locale];
      return `${text} ${column.slot.slot}`;
    }
    return "";
  }

  function columnSubHeaderFill(column: ChannelMatrixColumn): string {
    if (column.kind === "roadmap-slot") {
      return phaseFillById.get(column.slot.phase)?.body ?? "#FFFFFF";
    }
    return LABEL_FILL;
  }

  function renderCell(channel: Channel, column: ChannelMatrixColumn) {
    switch (column.kind) {
      case "potential": {
        return {
          background: LABEL_FILL,
          content: channel.potentialRaw !== null && (
            <span dir="ltr">{channel.potentialRaw}</span>
          ),
        };
      }
      case "dimension-score": {
        const record = averageByChannelDim.get(
          `${channel.channelId}|${column.dimension}`,
        );
        const background =
          record && record.value !== null
            ? (colorScales.colorForCell(
                column.dimension,
                channel.columnLetter,
                record.cellRef,
              ) ?? LABEL_FILL)
            : LABEL_FILL;
        return {
          background,
          content: record?.value != null && (
            <span dir="ltr">{format.score(record.value)}</span>
          ),
        };
      }
      case "trajectory": {
        const values =
          trajectoryByChannelMetric.get(`${channel.channelId}|${column.metric}`) ?? [];
        const value = trajectoryValueForYear(values, column.year);
        return {
          background: "#FFFFFF",
          content: value !== null && (
            <span dir="ltr">{format.trajectoryValue(value)}</span>
          ),
        };
      }
      case "trilemma": {
        const value = trilemmaScores.valueByChannelId.get(channel.channelId) ?? null;
        const background =
          value !== null
            ? (trilemmaScores.colorForChannel(channel.channelId) ?? LABEL_FILL)
            : LABEL_FILL;
        return {
          background,
          content: value !== null && <span dir="ltr">{format.score(value)}</span>,
        };
      }
      case "likelihood": {
        const value = channelTextByChannelId.get(channel.channelId)?.likelihood ?? null;
        return {
          background: BARRIER_FILL,
          content: value === null ? "-" : LIKELIHOOD_LABEL[value][locale],
        };
      }
      case "barriers": {
        const text = channelTextByChannelId.get(channel.channelId);
        const resolved = resolveFreeText(
          locale,
          text?.barriersHe ?? null,
          text?.barriersEn ?? null,
        );
        return {
          background: BARRIER_FILL,
          content: resolved ? (
            resolved.isHebrewSource ? (
              <HebrewSourceMark locale={locale}>{resolved.text}</HebrewSourceMark>
            ) : (
              resolved.text
            )
          ) : null,
        };
      }
      case "roadmap-slot": {
        const slot: RoadmapSlotRow = column.slot;
        const item = roadmapItemsByKey.get(
          roadmapItemKey(slot.phase, slot.kind, slot.slot, channel.channelId),
        );
        const background = phaseFillById.get(slot.phase)?.body ?? "#FFFFFF";
        const callouts = calloutsByCellKey.get(
          roadmapItemKey(slot.phase, slot.kind, slot.slot, channel.channelId),
        );
        if (!item) return { background, content: null, callouts };

        if (slot.kind === "step") {
          const title = resolveFreeText(locale, item.titleHe, item.titleEn);
          const detail = resolveFreeText(locale, item.detailHe, item.detailEn);
          const challenges = resolveFreeText(
            locale,
            item.challengesHe,
            item.challengesEn,
          );
          return {
            background,
            callouts,
            content: (
              <div className="flex flex-col gap-0.5">
                {title && (
                  <div className="text-[0.7rem] font-bold">
                    {title.isHebrewSource ? (
                      <HebrewSourceMark locale={locale}>{title.text}</HebrewSourceMark>
                    ) : (
                      title.text
                    )}
                  </div>
                )}
                {detail && (
                  <div className="text-[0.65rem]">
                    {detail.isHebrewSource ? (
                      <HebrewSourceMark locale={locale}>{detail.text}</HebrewSourceMark>
                    ) : (
                      detail.text
                    )}
                  </div>
                )}
                {challenges && (
                  <div className="text-[0.65rem]">
                    <strong>אתגרים:</strong>{" "}
                    {challenges.isHebrewSource ? (
                      <HebrewSourceMark locale={locale}>
                        {challenges.text}
                      </HebrewSourceMark>
                    ) : (
                      challenges.text
                    )}
                  </div>
                )}
              </div>
            ),
          };
        }

        const title = resolveFreeText(locale, item.titleHe, item.titleEn);
        return {
          background,
          callouts,
          content: title && (
            <div className="text-center text-[0.7rem]">
              {title.isHebrewSource ? (
                <HebrewSourceMark locale={locale}>{title.text}</HebrewSourceMark>
              ) : (
                title.text
              )}
            </div>
          ),
        };
      }
    }
  }

  return (
    <div
      className="border-border overflow-x-auto rounded-md border"
      tabIndex={0}
      role="region"
      aria-label={
        locale === "he" ? "מטריצת הערוצים, ניתנת לגלילה" : "Channel matrix, scrollable"
      }
    >
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            <th
              rowSpan={2}
              scope="col"
              className="border-border sticky start-0 z-20 border-e border-b p-2 text-sm font-bold"
              style={{ background: LABEL_FILL, color: contrastTextColor(LABEL_FILL) }}
            >
              {CHANNEL_HEADER_LABEL[locale]}
            </th>
            {columnGroups.map((group) => {
              const fill = groupHeaderFill(group);
              const isPhaseGroup = phaseFillById.has(group.id as never);
              return (
                <th
                  key={group.id}
                  colSpan={group.columns.length}
                  scope="colgroup"
                  className="border-border border-e border-b p-1.5 text-[0.7rem] font-bold last:border-e-0"
                  style={{ background: fill, color: contrastTextColor(fill) }}
                >
                  {/* A phase id like "2025-2030" is two Latin numeric runs
                      joined by a dash -- inside the surrounding Hebrew (RTL)
                      flow, the bidi algorithm visually swaps them ("2030–2025")
                      without this isolation (the same class of bug CLAUDE.md
                      documents for the main matrix's potential row). */}
                  {isPhaseGroup ? (
                    <span dir="ltr">{groupLabel(group)}</span>
                  ) : (
                    groupLabel(group)
                  )}
                </th>
              );
            })}
          </tr>
          <tr>
            {flatColumns.map((column) => {
              const fill = columnSubHeaderFill(column);
              const label = columnSubLabel(column);
              const key = channelMatrixColumnKey(column);
              return (
                <th
                  key={key}
                  scope="col"
                  className="border-border border-e border-b p-1 text-[0.65rem] font-semibold last:border-e-0"
                  style={{ background: fill, color: contrastTextColor(fill) }}
                >
                  {label ? (
                    <span dir={/^[0-9]+$/.test(label) ? "ltr" : undefined}>{label}</span>
                  ) : (
                    // A single-column group (Potential/Trilemma/Likelihood/
                    // Barriers) has nothing further to say here -- the group
                    // header above already names it -- but an empty <th> has
                    // no screen-reader-discernible text (axe's
                    // empty-table-header rule). Repeat the group's own label,
                    // visually hidden, so this column's header still resolves
                    // to real text for assistive tech.
                    <span className="sr-only">
                      {groupLabel(groupByColumnKey.get(key)!)}
                    </span>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {channels.map((channel) => {
            const name = locale === "he" ? channel.nameHe : channel.nameEn;
            return (
              <tr key={channel.channelId}>
                <th
                  scope="row"
                  className="border-border sticky start-0 z-10 border-e border-b bg-white p-2 text-start text-sm font-bold"
                >
                  {name}
                </th>
                {flatColumns.map((column) => {
                  const { background, content, callouts } = renderCell(channel, column);
                  const key = `${channel.channelId}-${channelMatrixColumnKey(column)}`;
                  return (
                    <td
                      key={key}
                      className="border-border relative border-e border-b p-1 text-center last:border-e-0"
                      style={{ background, color: contrastTextColor(background) }}
                    >
                      {content}
                      {/* Callouts render inline rather than as an overflowing
                          overlay (SPEC §5.8's original treatment): the
                          workbook's "overflow toward the next phase" reads
                          naturally in a row-per-channel layout where phases
                          are vertical bands, but here phases are column
                          groups, so overflow would need a direction-aware
                          (RTL-mirrored) transform per callout -- an inline
                          note avoids that risk entirely for a handful of
                          callouts. */}
                      {callouts?.map((callout) => {
                        const resolved = resolveFreeText(
                          locale,
                          callout.textHe,
                          callout.textEn,
                        );
                        return (
                          <div
                            key={callout.calloutId}
                            id={callout.calloutId}
                            role="note"
                            className="mt-1 flex items-start gap-1 rounded p-1 text-start text-[0.6rem]"
                            style={{
                              background: CALLOUT_FILL,
                              color: contrastTextColor(CALLOUT_FILL),
                            }}
                          >
                            <span aria-hidden="true">⚠</span>
                            <span>
                              {resolved?.isHebrewSource ? (
                                <HebrewSourceMark locale={locale}>
                                  {resolved.text}
                                </HebrewSourceMark>
                              ) : (
                                (resolved?.text ?? callout.textHe)
                              )}
                            </span>
                          </div>
                        );
                      })}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
