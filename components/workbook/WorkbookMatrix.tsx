"use client";

import { useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import {
  MILESTONE_YEARS,
  type ChannelId,
  type Dimension,
  type RowLabel,
  type TrajectoryMetric,
  type WorkbookPayload,
} from "@/lib/schemas/workbook";
import type { Locale } from "@/lib/i18n/locales";
import { contrastTextColor } from "@/lib/color";
import { useFormat } from "@/lib/i18n/useFormat";
import { resolveFreeText } from "@/lib/i18n/freeText";
import { sparklinePath } from "@/lib/engine/workbook/sparklinePath";
import { computeAxisGroupSpans, computeRowMetrics } from "./gridLayout";
import {
  buildDimensionColorScales,
  buildScoreBlockRows,
  type ScoreBlockRow,
} from "./scoreRows";
import {
  buildSparklineRowByDimension,
  trajectoryValuesForChannel,
} from "./sparklineRows";
import { Sparkline } from "./Sparkline";
import { HebrewSourceMark } from "./HebrewSourceMark";
import {
  buildRoadmapLayout,
  indexRoadmapItems,
  parseCellRef,
  roadmapItemKey,
  type RoadmapSubGroupSpan,
} from "./roadmapRows";
import { Callout } from "./Callout";
import { ChannelDrawer } from "./ChannelDrawer";

const LABEL_FILL = "#A6A6A6"; // SPEC §5.3: label column (rows 1-3) and the whole potential row; also the neutral fill for a blank score/sub-score cell (SPEC §5.4)
const SPARKLINE_CELL_FILL = "#D9D9D9"; // SPEC §5.5: sparkline cell background, white plot frame inside
const BARRIER_FILL = "#BFBFBF"; // SPEC §5.6: likelihood and barriers rows
const SPARKLINE_WIDTH = 100;
const SPARKLINE_HEIGHT = 32; // SVG viewBox units; the element itself stretches to fill the cell (preserveAspectRatio="none")
const LABEL_PANE_WIDTH = "8rem"; // shared by the matrix's single label column and the roadmap's phase+sub-group pair
// Roadmap step rows have no ingested per-row height (SPEC §5.7 gives the
// workbook's own range, 36-60pt, but that's real-workbook content-driven
// height that isn't captured by ingestion for rows 40-66 — see
// scripts/ingest/rowMap.ts's comment that this range is handled
// separately). Fixed UI pixel heights, generous enough for a title +
// detail + challenges card, stand in until that's ingested.
const ROADMAP_TARGET_ROW_HEIGHT = 32;
const ROADMAP_STEP_ROW_HEIGHT = 128;

// Row 38 (סבירות): גבוהה/בינונית/נמוכה, not colour-coded (SPEC §5.6). A blank
// cell in this row is always the workbook's literal "-" (the schema collapses
// it into `null` — see `likelihoodSchema`), so `null` renders as "-" too
// (SPEC §5.10 rule 2), never an empty cell.
const LIKELIHOOD_LABEL: Record<"high" | "medium" | "low", Record<Locale, string>> = {
  high: { he: "גבוהה", en: "High" },
  medium: { he: "בינונית", en: "Medium" },
  low: { he: "נמוכה", en: "Low" },
};

// UI chrome, not workbook text (SPEC §5.5 gives only an example accessible name) --
// same inline-ternary pattern as the rest of this component's labels.
const METRIC_LABEL: Record<TrajectoryMetric, Record<Locale, string>> = {
  generation: { he: "ייצור", en: "generation" },
  emissions: { he: "פליטות", en: "emissions" },
  price_impact: { he: "השפעת מחיר", en: "price impact" },
};
const METRIC_UNIT: Record<TrajectoryMetric, string> = {
  generation: "TWh",
  emissions: "MtCO₂e",
  price_impact: "", // unitless index (SPEC §1.1, OQ-12)
};

type ContentRow =
  | ScoreBlockRow
  | { kind: "sparkline"; dimension: Dimension; rowLabel: RowLabel }
  | { kind: "likelihood"; rowLabel: RowLabel }
  | { kind: "barriers"; rowLabel: RowLabel };

interface WorkbookMatrixProps {
  payload: WorkbookPayload;
  locale: Locale;
  /** F-106 column filtering (T13): `undefined` shows every channel. Colours are always computed over the unfiltered payload (SPEC §5.9), never recomputed from this subset. */
  visibleChannelIds?: ReadonlySet<ChannelId>;
}

interface DataCell {
  key: string;
  rowIndex: number; // 0 = axis header, 1 = channel name, 2 = potential
  colIndexes: number[]; // 1-based channel indices this cell covers (for spanned axis headers)
  gridColumnStart: number;
  gridColumnEnd: number;
  role: "columnheader" | "gridcell";
  ariaColspan?: number;
  background: string;
  content: ReactNode;
  className: string;
  /** F-105: the channel-name cell activates the detail drawer (click or Enter/Space). */
  onActivate?: () => void;
}

/**
 * F-101 matrix skeleton (DEV-PLAN T7): the label column, the 17 channel
 * columns in workbook order, and rows 1-3 (axis header / channel name /
 * potential).
 *
 * **Two panes, not one CSS Grid with a sticky column.** A sticky label
 * column inside a single very-wide (~2700px) CSS Grid did not stay stuck
 * under horizontal scroll in testing — in both RTL and LTR the label
 * column scrolled away with the rest of the content instead of pinning to
 * the inline-start edge (a `position: sticky` + CSS Grid interaction that
 * didn't behave as expected here). A fixed label pane next to an
 * independently horizontally-scrolling data pane sidesteps that
 * entirely and is simpler to reason about; `dir` still does all the
 * mirroring since the panes are laid out with `flex-row` (first DOM child
 * = inline-start in both directions).
 */
export function WorkbookMatrix({
  payload,
  locale,
  visibleChannelIds,
}: WorkbookMatrixProps) {
  const channels = useMemo(
    () =>
      [...payload.channels]
        .filter((c) => !visibleChannelIds || visibleChannelIds.has(c.channelId))
        .sort((a, b) => a.columnOrder - b.columnOrder),
    [payload.channels, visibleChannelIds],
  );
  const axisSpans = useMemo(
    () => computeAxisGroupSpans(channels, payload.axisGroups),
    [channels, payload.axisGroups],
  );
  const headerRows = useMemo(
    () => payload.rowLabels.filter((r) => r.row === 1 || r.row === 2 || r.row === 3),
    [payload.rowLabels],
  );

  // F-102: sub-score rows are collapsed by default; each dimension expands
  // independently, in place, above its score row (SPEC §2.2 row order).
  const [expandedDimensions, setExpandedDimensions] = useState<ReadonlySet<Dimension>>(
    () => new Set(),
  );
  function toggleDimension(dimension: Dimension) {
    setExpandedDimensions((prev) => {
      const next = new Set(prev);
      if (next.has(dimension)) next.delete(dimension);
      else next.add(dimension);
      return next;
    });
  }
  const scoreBlockRows = useMemo(
    () => buildScoreBlockRows(payload.rowLabels, expandedDimensions),
    [payload.rowLabels, expandedDimensions],
  );
  // T9: one always-visible sparkline row directly below each score row
  // (SPEC §2.2 rows 14/25/36) -- never collapsed, so it isn't part of
  // buildScoreBlockRows' disclosure toggle.
  const sparklineRowByDimension = useMemo(
    () => buildSparklineRowByDimension(payload.rowLabels),
    [payload.rowLabels],
  );
  const sparklineSpecByDimension = useMemo(
    () => new Map(payload.sparklineSpecs.map((s) => [s.dimension, s])),
    [payload.sparklineSpecs],
  );
  // T10: likelihood (row 38) and barriers (row 39) follow the equity block —
  // row 37 (trilemma) is hidden in the source workbook and never rendered.
  const likelihoodRowLabel = useMemo(
    () => payload.rowLabels.find((r) => r.key === "likelihood"),
    [payload.rowLabels],
  );
  const barriersRowLabel = useMemo(
    () => payload.rowLabels.find((r) => r.key === "barriers"),
    [payload.rowLabels],
  );
  const contentRows = useMemo<ContentRow[]>(() => {
    const rows: ContentRow[] = [];
    for (const row of scoreBlockRows) {
      rows.push(row);
      if (row.kind === "score") {
        const sparkRowLabel = sparklineRowByDimension.get(row.dimension);
        if (sparkRowLabel) {
          rows.push({
            kind: "sparkline",
            dimension: row.dimension,
            rowLabel: sparkRowLabel,
          });
        }
      }
    }
    if (likelihoodRowLabel)
      rows.push({ kind: "likelihood", rowLabel: likelihoodRowLabel });
    if (barriersRowLabel) rows.push({ kind: "barriers", rowLabel: barriersRowLabel });
    return rows;
  }, [scoreBlockRows, sparklineRowByDimension, likelihoodRowLabel, barriersRowLabel]);
  const channelTextByChannelId = useMemo(
    () => new Map(payload.channelText.map((t) => [t.channelId, t])),
    [payload.channelText],
  );
  const colorScales = useMemo(
    () =>
      buildDimensionColorScales(
        payload.colorScaleRules,
        payload.subScores,
        payload.dimensionAverages,
      ),
    [payload.colorScaleRules, payload.subScores, payload.dimensionAverages],
  );
  const subScoreByChannelDimKey = useMemo(() => {
    const map = new Map<string, WorkbookPayload["subScores"][number]>();
    for (const s of payload.subScores)
      map.set(`${s.channelId}|${s.dimension}|${s.key}`, s);
    return map;
  }, [payload.subScores]);
  const averageByChannelDim = useMemo(() => {
    const map = new Map<string, WorkbookPayload["dimensionAverages"][number]>();
    for (const d of payload.dimensionAverages)
      map.set(`${d.channelId}|${d.dimension}`, d);
    return map;
  }, [payload.dimensionAverages]);
  const format = useFormat(locale);

  // T10: roadmap section (SPEC §5.7) — derived from ingested phase bands and
  // roadmap items, not from the row-label mechanism above (rows 40-66 are
  // outside rowLabels; see scripts/ingest/rowMap.ts).
  const roadmapLayout = useMemo(
    () => buildRoadmapLayout(payload.phaseBands),
    [payload.phaseBands],
  );
  const roadmapItemsByKey = useMemo(
    () => indexRoadmapItems(payload.roadmapItems),
    [payload.roadmapItems],
  );
  // T11: each callout's anchor cell (e.g. "G53", SPEC §5.8) resolves to the
  // roadmap slot that owns that workbook row, via the same layout the
  // step/target/impact cells above already use -- never a second,
  // hard-coded row-number lookup.
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
  const roadmapRowHeights = useMemo(
    () =>
      roadmapLayout.rows.map((r) =>
        r.kind === "step" ? ROADMAP_STEP_ROW_HEIGHT : ROADMAP_TARGET_ROW_HEIGHT,
      ),
    [roadmapLayout],
  );
  function sumRoadmapHeights(startIndex: number, count: number): number {
    let sum = 0;
    for (let i = startIndex; i < startIndex + count; i++)
      sum += roadmapRowHeights[i] ?? 0;
    return sum;
  }
  const bodyFillByPhase = useMemo(
    () => new Map(roadmapLayout.phaseSpans.map((s) => [s.phase, s.bodyFill])),
    [roadmapLayout],
  );
  // A sub-group column block per phase, always -- a phase with no
  // sub-groups (2030-2040, 2040-2050) still needs one full-height blank
  // block so the column's total height matches the phase column's.
  const subGroupColumnBlocks = useMemo<RoadmapSubGroupSpan[]>(() => {
    const byPhase = new Map<string, RoadmapSubGroupSpan[]>();
    for (const s of roadmapLayout.subGroupSpans) {
      const list = byPhase.get(s.phase) ?? [];
      list.push(s);
      byPhase.set(s.phase, list);
    }
    return roadmapLayout.phaseSpans.flatMap((phaseSpan) => {
      const subs = byPhase.get(phaseSpan.phase);
      if (subs && subs.length > 0) return subs;
      return [
        {
          phase: phaseSpan.phase,
          key: `${phaseSpan.phase}-blank`,
          labelHe: "",
          labelEn: "",
          startIndex: phaseSpan.startIndex,
          rowCount: phaseSpan.rowCount,
        },
      ];
    });
  }, [roadmapLayout]);

  const allRows = useMemo(
    () => [...headerRows, ...contentRows.map((r) => r.rowLabel)],
    [headerRows, contentRows],
  );
  const rowMetrics = useMemo(() => computeRowMetrics(allRows), [allRows]);

  const colCount = channels.length; // channel columns only; the label pane is separate
  const cellRefs = useRef(new Map<string, HTMLDivElement>());
  const [focus, setFocus] = useState({ row: 0, col: 0 });
  // F-105: the channel detail drawer (T12) opens from the channel-name cell.
  // drawerTriggerRef tracks which cell to restore focus to on close --
  // Radix's own focus-restore is keyed to its <Dialog.Trigger>, which we
  // don't use (the trigger is a generic grid cell, not a dedicated
  // trigger element), so we capture and restore it ourselves via
  // SheetContent's onCloseAutoFocus (see ChannelDrawer.tsx).
  const [selectedChannelId, setSelectedChannelId] = useState<ChannelId | null>(null);
  const drawerTriggerRef = useRef<HTMLDivElement | null>(null);

  function registerCell(row: number, col: number, el: HTMLDivElement | null) {
    const key = `${row}-${col}`;
    if (el) cellRefs.current.set(key, el);
    else cellRefs.current.delete(key);
  }

  function focusCell(row: number, col: number) {
    const clampedRow = Math.min(Math.max(row, 0), rowMetrics.length - 1);
    const clampedCol = Math.min(Math.max(col, 0), colCount);
    const el = cellRefs.current.get(`${clampedRow}-${clampedCol}`);
    if (el) {
      el.focus();
      setFocus({ row: clampedRow, col: clampedCol });
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const { row, col } = focus;
    switch (event.key) {
      case "ArrowRight":
        event.preventDefault();
        focusCell(row, col + 1);
        break;
      case "ArrowLeft":
        event.preventDefault();
        focusCell(row, col - 1);
        break;
      case "ArrowDown":
        event.preventDefault();
        focusCell(row + 1, col);
        break;
      case "ArrowUp":
        event.preventDefault();
        focusCell(row - 1, col);
        break;
      case "Home":
        event.preventDefault();
        focusCell(row, 0);
        break;
      case "End":
        event.preventDefault();
        focusCell(row, colCount);
        break;
      default:
        break;
    }
  }

  const dataCells = useMemo<DataCell[]>(() => {
    const axisHeaderCells: DataCell[] = axisSpans.map((span) => {
      const colIndexes: number[] = [];
      for (let i = span.gridColumnStart - 1; i <= span.gridColumnEnd - 2; i++)
        colIndexes.push(i);
      return {
        key: `axis-${span.axisGroup.axisGroupId}`,
        rowIndex: 0,
        colIndexes,
        gridColumnStart: span.gridColumnStart - 1,
        gridColumnEnd: span.gridColumnEnd - 1,
        role: "columnheader",
        ariaColspan: span.columnCount > 1 ? span.columnCount : undefined,
        background: span.axisGroup.headerFill,
        content: locale === "he" ? span.axisGroup.nameHe : span.axisGroup.nameEn,
        className: "flex items-center justify-center p-2 text-sm font-bold",
      };
    });

    const nameCells: DataCell[] = channels.map((channel, index) => {
      const axisGroup = payload.axisGroups.find(
        (g) => g.axisGroupId === channel.axisGroupId,
      );
      return {
        key: `name-${channel.channelId}`,
        rowIndex: 1,
        colIndexes: [index + 1],
        gridColumnStart: index + 1,
        gridColumnEnd: index + 2,
        role: "columnheader",
        background: axisGroup?.nameFill ?? "#FFFFFF",
        content: locale === "he" ? channel.nameHe : channel.nameEn,
        className:
          "flex items-center justify-center p-2 text-center text-sm font-semibold cursor-pointer underline-offset-2 hover:underline",
        onActivate: () => setSelectedChannelId(channel.channelId),
      };
    });

    const potentialCells: DataCell[] = channels.map((channel, index) => ({
      key: `potential-${channel.channelId}`,
      rowIndex: 2,
      colIndexes: [index + 1],
      gridColumnStart: index + 1,
      gridColumnEnd: index + 2,
      role: "gridcell",
      background: LABEL_FILL,
      content: channel.potentialRaw !== null && (
        // Isolate: "3,000 MW" is Latin content and must not be bidi-reordered
        // by the surrounding RTL paragraph (which would flip it to "MW 3,000").
        <span dir="ltr">{channel.potentialRaw}</span>
      ),
      className: "flex items-center justify-center p-2 text-sm",
    }));

    const contentCells: DataCell[] = contentRows.flatMap(
      (row, blockIndex): DataCell[] => {
        if (row.kind === "sparkline") {
          const spec = sparklineSpecByDimension.get(row.dimension);
          if (!spec) {
            throw new Error(
              `WorkbookMatrix: missing sparkline spec for dimension "${row.dimension}"`,
            );
          }
          const metricLabel = METRIC_LABEL[spec.metric][locale];
          const unit = METRIC_UNIT[spec.metric];
          return channels.map((channel, index) => {
            const values = trajectoryValuesForChannel(
              payload.trajectories,
              channel.channelId,
              spec.metric,
            );
            const geometry = sparklinePath(
              values,
              { axisMin: spec.axisMin, axisMax: spec.axisMax },
              SPARKLINE_WIDTH,
              SPARKLINE_HEIGHT,
            );
            const channelName = locale === "he" ? channel.nameHe : channel.nameEn;
            const formattedValues = values.map((v) => format.trajectoryValue(v));
            const hasData = formattedValues.some((v) => v !== null);
            const unitSuffix = unit ? ` ${unit}` : "";
            const accessibleName = hasData
              ? locale === "he"
                ? `${channelName}, ${metricLabel}: ${formattedValues.join(", ")}${unitSuffix} עבור ${MILESTONE_YEARS.join(", ")}`
                : `${channelName}, ${metricLabel}: ${formattedValues.join(", ")}${unitSuffix} for ${MILESTONE_YEARS.join(", ")}`
              : locale === "he"
                ? `${channelName}, ${metricLabel}: אין נתונים`
                : `${channelName}, ${metricLabel}: no data`;
            const tooltipLines = hasData
              ? MILESTONE_YEARS.map(
                  (year, i) => `${year}: ${formattedValues[i]}${unitSuffix}`,
                )
              : [];
            return {
              key: `sparkline-${row.dimension}-${channel.channelId}`,
              rowIndex: 3 + blockIndex,
              colIndexes: [index + 1],
              gridColumnStart: index + 1,
              gridColumnEnd: index + 2,
              role: "gridcell",
              background: SPARKLINE_CELL_FILL,
              content: (
                <Sparkline
                  areaPath={geometry.areaPath}
                  zeroY={geometry.zeroY}
                  width={SPARKLINE_WIDTH}
                  height={SPARKLINE_HEIGHT}
                  fill={spec.fill}
                  accessibleName={accessibleName}
                  tooltipLines={tooltipLines}
                />
              ),
              className: "p-1",
            };
          });
        }

        if (row.kind === "likelihood") {
          return channels.map((channel, index) => {
            const value =
              channelTextByChannelId.get(channel.channelId)?.likelihood ?? null;
            const label = value === null ? "-" : LIKELIHOOD_LABEL[value][locale];
            return {
              key: `likelihood-${channel.channelId}`,
              rowIndex: 3 + blockIndex,
              colIndexes: [index + 1],
              gridColumnStart: index + 1,
              gridColumnEnd: index + 2,
              role: "gridcell",
              background: BARRIER_FILL,
              content: label,
              className: "flex items-center justify-center p-2 text-sm",
            };
          });
        }

        if (row.kind === "barriers") {
          return channels.map((channel, index) => {
            const text = channelTextByChannelId.get(channel.channelId);
            const resolved = text
              ? resolveFreeText(locale, text.barriersHe, text.barriersEn)
              : null;
            return {
              key: `barriers-${channel.channelId}`,
              rowIndex: 3 + blockIndex,
              colIndexes: [index + 1],
              gridColumnStart: index + 1,
              gridColumnEnd: index + 2,
              role: "gridcell",
              background: BARRIER_FILL,
              content: resolved ? (
                resolved.isHebrewSource ? (
                  <HebrewSourceMark locale={locale}>{resolved.text}</HebrewSourceMark>
                ) : (
                  resolved.text
                )
              ) : null,
              className: "flex items-center justify-center p-2 text-center text-xs",
            };
          });
        }

        return channels.map((channel, index) => {
          const record: { value: number | null; cellRef: string } | undefined =
            row.kind === "score"
              ? averageByChannelDim.get(`${channel.channelId}|${row.dimension}`)
              : subScoreByChannelDimKey.get(
                  `${channel.channelId}|${row.dimension}|${row.subScoreKey}`,
                );
          const background =
            record && record.value !== null
              ? (colorScales.colorForCell(
                  row.dimension,
                  channel.columnLetter,
                  record.cellRef,
                ) ?? LABEL_FILL)
              : LABEL_FILL;
          return {
            key: `${row.kind}-${row.dimension}-${row.kind === "subscore" ? row.subScoreKey : "avg"}-${channel.channelId}`,
            rowIndex: 3 + blockIndex,
            colIndexes: [index + 1],
            gridColumnStart: index + 1,
            gridColumnEnd: index + 2,
            role: "gridcell",
            background,
            content: record?.value != null && (
              <span dir="ltr">{format.score(record.value)}</span>
            ),
            className: "flex items-center justify-center p-2 text-sm",
          };
        });
      },
    );

    return [...axisHeaderCells, ...nameCells, ...potentialCells, ...contentCells];
  }, [
    axisSpans,
    channels,
    payload.axisGroups,
    payload.trajectories,
    locale,
    contentRows,
    sparklineSpecByDimension,
    averageByChannelDim,
    subScoreByChannelDimKey,
    colorScales,
    format,
    channelTextByChannelId,
  ]);

  const gridTemplateColumns = `repeat(${colCount}, minmax(9.5rem, 1fr))`;

  return (
    <div
      role="grid"
      aria-label={locale === "he" ? "לוח מסלולי האנרגיה" : "Energy pathways matrix"}
      aria-rowcount={rowMetrics.length}
      aria-colcount={colCount + 1}
      onKeyDown={handleKeyDown}
      className="border-border flex max-w-full items-start rounded-md border"
    >
      {/* Label pane — fixed, never scrolls horizontally */}
      <div className="shrink-0" style={{ width: LABEL_PANE_WIDTH }}>
        {allRows.map((row, rowIndex) => {
          const metrics = rowMetrics[rowIndex];
          const text = locale === "he" ? (row.labelHe ?? "") : row.labelEn;
          const isFocusable = focus.row === rowIndex && focus.col === 0;
          const blockRow: ContentRow | undefined =
            rowIndex >= 3 ? contentRows[rowIndex - 3] : undefined;

          const commonClassName =
            "border-border flex items-center justify-center gap-1 border-e border-b p-2 text-xs font-bold last:border-b-0";
          const commonStyle = {
            minBlockSize: metrics?.heightPx,
            background: LABEL_FILL,
            color: contrastTextColor(LABEL_FILL),
          };

          if (blockRow?.kind === "score") {
            const dimension = blockRow.dimension;
            const isExpanded = expandedDimensions.has(dimension);
            return (
              <div
                key={rowIndex}
                ref={(el) => registerCell(rowIndex, 0, el)}
                role="rowheader"
                aria-rowindex={rowIndex + 1}
                aria-colindex={1}
                aria-expanded={isExpanded}
                tabIndex={isFocusable ? 0 : -1}
                onFocus={() => setFocus({ row: rowIndex, col: 0 })}
                onClick={() => toggleDimension(dimension)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    toggleDimension(dimension);
                  }
                }}
                className={`${commonClassName} cursor-pointer`}
                style={commonStyle}
              >
                <span aria-hidden="true">{isExpanded ? "−" : "+"}</span>
                {text}
              </div>
            );
          }

          return (
            <div
              key={rowIndex}
              ref={(el) => registerCell(rowIndex, 0, el)}
              role="rowheader"
              aria-rowindex={rowIndex + 1}
              aria-colindex={1}
              tabIndex={isFocusable ? 0 : -1}
              onFocus={() => setFocus({ row: rowIndex, col: 0 })}
              className={commonClassName}
              style={commonStyle}
            >
              {text}
            </div>
          );
        })}

        {/* Roadmap phase + sub-group columns (SPEC §5.7, §5.1's "sticky at
            inline-start"): two narrow flex-columns of variable-height
            blocks, in the same fixed pane as the row labels above, so they
            never scroll horizontally either. Rotated with `writing-mode`
            so the same markup reads correctly in both locales -- it
            doesn't depend on page `dir`. */}
        <div className="border-border flex border-b">
          <div className="flex shrink-0 flex-col" style={{ width: "4rem" }}>
            {roadmapLayout.phaseSpans.map((span) => (
              <div
                key={span.phase}
                className="border-border flex items-center justify-center border-e border-b p-1 text-[0.7rem] font-bold last:border-b-0"
                style={{
                  minBlockSize: sumRoadmapHeights(span.startIndex, span.rowCount),
                  background: span.labelFill,
                  color: contrastTextColor(span.labelFill),
                }}
              >
                <span dir="ltr" style={{ writingMode: "vertical-rl" }}>
                  {span.phase.replace("-", "–")}
                </span>
              </div>
            ))}
          </div>
          <div className="flex shrink-0 flex-col" style={{ width: "4rem" }}>
            {subGroupColumnBlocks.map((span) => (
              <div
                key={`${span.phase}-${span.key}`}
                className="border-border flex items-center justify-center border-b p-1 text-[0.7rem] font-bold last:border-b-0"
                style={{
                  minBlockSize: sumRoadmapHeights(span.startIndex, span.rowCount),
                  background: bodyFillByPhase.get(span.phase) ?? "#FFFFFF",
                  color: contrastTextColor(bodyFillByPhase.get(span.phase) ?? "#FFFFFF"),
                }}
              >
                {span.labelHe && (
                  <span style={{ writingMode: "vertical-rl" }}>
                    {locale === "he" ? span.labelHe : span.labelEn}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Data pane — the 17 channel columns, scrolls horizontally on its own */}
      <div className="min-w-0 flex-1 overflow-x-auto">
        <div style={{ display: "grid", gridTemplateColumns }}>
          {dataCells.map((cell) => {
            const metrics = rowMetrics[cell.rowIndex];
            const isFocusable =
              cell.colIndexes.includes(focus.col) && focus.row === cell.rowIndex;
            return (
              <div
                key={cell.key}
                ref={(el) => {
                  for (const col of cell.colIndexes) registerCell(cell.rowIndex, col, el);
                }}
                role={cell.role}
                aria-rowindex={cell.rowIndex + 1}
                aria-colindex={cell.colIndexes[0]! + 1}
                aria-colspan={cell.ariaColspan}
                tabIndex={isFocusable ? 0 : -1}
                aria-haspopup={cell.onActivate ? "dialog" : undefined}
                onFocus={() => setFocus({ row: cell.rowIndex, col: cell.colIndexes[0]! })}
                onClick={
                  cell.onActivate
                    ? (event) => {
                        drawerTriggerRef.current = event.currentTarget;
                        cell.onActivate!();
                      }
                    : undefined
                }
                onKeyDown={
                  cell.onActivate
                    ? (event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          drawerTriggerRef.current = event.currentTarget;
                          cell.onActivate!();
                        }
                      }
                    : undefined
                }
                className={`${cell.className} border-border border-e border-b last:border-e-0 ${cell.rowIndex === allRows.length - 1 ? "border-b-0" : ""}`}
                style={{
                  gridColumnStart: cell.gridColumnStart,
                  gridColumnEnd: cell.gridColumnEnd,
                  gridRow: cell.rowIndex + 1,
                  minBlockSize: metrics?.heightPx,
                  background: cell.background,
                  color: contrastTextColor(cell.background),
                }}
              >
                {cell.content}
              </div>
            );
          })}
        </div>

        {/* Roadmap step cards (SPEC §5.7): same 17-column grid, same
            scrolling data pane, so it shares horizontal scroll position
            with the matrix above automatically. */}
        <div
          role="grid"
          aria-label={locale === "he" ? "מפת דרכים" : "Roadmap"}
          aria-rowcount={roadmapLayout.rows.length}
          aria-colcount={colCount}
          style={{ display: "grid", gridTemplateColumns }}
        >
          {roadmapLayout.rows.flatMap((row, rowIndex) =>
            channels.map((channel, colIndex) => {
              const item = roadmapItemsByKey.get(
                roadmapItemKey(row.phase, row.kind, row.slot, channel.channelId),
              );
              const background = bodyFillByPhase.get(row.phase) ?? "#FFFFFF";
              const heightPx = roadmapRowHeights[rowIndex];

              let content: ReactNode = null;
              if (item) {
                if (row.kind === "step") {
                  const title = resolveFreeText(locale, item.titleHe, item.titleEn);
                  const detail = resolveFreeText(locale, item.detailHe, item.detailEn);
                  const challenges = resolveFreeText(
                    locale,
                    item.challengesHe,
                    item.challengesEn,
                  );
                  content = (
                    <div className="flex h-full w-full flex-col gap-0.5 overflow-hidden p-1">
                      {title && (
                        <div className="text-center text-[0.7rem] font-bold">
                          {title.isHebrewSource ? (
                            <HebrewSourceMark locale={locale}>
                              {title.text}
                            </HebrewSourceMark>
                          ) : (
                            title.text
                          )}
                        </div>
                      )}
                      {detail && (
                        <div className="text-[0.65rem]">
                          {detail.isHebrewSource ? (
                            <HebrewSourceMark locale={locale}>
                              {detail.text}
                            </HebrewSourceMark>
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
                  );
                } else {
                  const title = resolveFreeText(locale, item.titleHe, item.titleEn);
                  content = title && (
                    <div className="p-1 text-center text-[0.7rem]">
                      {title.isHebrewSource ? (
                        <HebrewSourceMark locale={locale}>{title.text}</HebrewSourceMark>
                      ) : (
                        title.text
                      )}
                    </div>
                  );
                }
              }

              // T11: trigger callouts (SPEC §5.8) attach to their anchor
              // cell's grid area and overflow toward the next phase
              // boundary -- never float free of the grid.
              const callouts = calloutsByCellKey.get(
                roadmapItemKey(row.phase, row.kind, row.slot, channel.channelId),
              );

              return (
                <div
                  key={`roadmap-${row.phase}-${row.kind}-${row.slot}-${channel.channelId}`}
                  role="gridcell"
                  aria-rowindex={rowIndex + 1}
                  aria-colindex={colIndex + 1}
                  aria-describedby={callouts?.map((c) => c.calloutId).join(" ")}
                  tabIndex={0}
                  className="border-border relative flex items-stretch border-e border-b last:border-e-0"
                  style={{
                    gridColumnStart: colIndex + 1,
                    gridColumnEnd: colIndex + 2,
                    gridRow: rowIndex + 1,
                    minBlockSize: heightPx,
                    background,
                    color: contrastTextColor(background),
                  }}
                >
                  {content}
                  {callouts?.map((callout) => {
                    const resolved = resolveFreeText(
                      locale,
                      callout.textHe,
                      callout.textEn,
                    );
                    return (
                      <Callout
                        key={callout.calloutId}
                        id={callout.calloutId}
                        text={
                          resolved?.isHebrewSource ? (
                            <HebrewSourceMark locale={locale}>
                              {resolved.text}
                            </HebrewSourceMark>
                          ) : (
                            (resolved?.text ?? callout.textHe)
                          )
                        }
                      />
                    );
                  })}
                </div>
              );
            }),
          )}
        </div>
      </div>
      <ChannelDrawer
        payload={payload}
        channel={channels.find((c) => c.channelId === selectedChannelId) ?? null}
        locale={locale}
        colorScales={colorScales}
        triggerRef={drawerTriggerRef}
        onOpenChange={(open) => {
          if (!open) setSelectedChannelId(null);
        }}
      />
    </div>
  );
}
