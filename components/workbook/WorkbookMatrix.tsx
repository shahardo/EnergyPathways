"use client";

import { useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import type { Dimension, WorkbookPayload } from "@/lib/schemas/workbook";
import type { Locale } from "@/lib/i18n/locales";
import { contrastTextColor } from "@/lib/color";
import { useFormat } from "@/lib/i18n/useFormat";
import { computeAxisGroupSpans, computeRowMetrics } from "./gridLayout";
import {
  buildDimensionColorScales,
  buildScoreBlockRows,
  type ScoreBlockRow,
} from "./scoreRows";

const LABEL_FILL = "#A6A6A6"; // SPEC §5.3: label column (rows 1-3) and the whole potential row; also the neutral fill for a blank score/sub-score cell (SPEC §5.4)

interface WorkbookMatrixProps {
  payload: WorkbookPayload;
  locale: Locale;
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
export function WorkbookMatrix({ payload, locale }: WorkbookMatrixProps) {
  const channels = useMemo(
    () => [...payload.channels].sort((a, b) => a.columnOrder - b.columnOrder),
    [payload.channels],
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

  const allRows = useMemo(
    () => [...headerRows, ...scoreBlockRows.map((r) => r.rowLabel)],
    [headerRows, scoreBlockRows],
  );
  const rowMetrics = useMemo(() => computeRowMetrics(allRows), [allRows]);

  const colCount = channels.length; // channel columns only; the label pane is separate
  const cellRefs = useRef(new Map<string, HTMLDivElement>());
  const [focus, setFocus] = useState({ row: 0, col: 0 });

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
          "flex items-center justify-center p-2 text-center text-sm font-semibold",
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

    const scoreBlockCells: DataCell[] = scoreBlockRows.flatMap((row, blockIndex) =>
      channels.map((channel, index) => {
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
      }),
    );

    return [...axisHeaderCells, ...nameCells, ...potentialCells, ...scoreBlockCells];
  }, [
    axisSpans,
    channels,
    payload.axisGroups,
    locale,
    scoreBlockRows,
    averageByChannelDim,
    subScoreByChannelDimKey,
    colorScales,
    format,
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
      <div className="shrink-0" style={{ width: "8rem" }}>
        {allRows.map((row, rowIndex) => {
          const metrics = rowMetrics[rowIndex];
          const text = locale === "he" ? (row.labelHe ?? "") : row.labelEn;
          const isFocusable = focus.row === rowIndex && focus.col === 0;
          const blockRow: ScoreBlockRow | undefined =
            rowIndex >= 3 ? scoreBlockRows[rowIndex - 3] : undefined;

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
                onFocus={() => setFocus({ row: cell.rowIndex, col: cell.colIndexes[0]! })}
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
      </div>
    </div>
  );
}
