"use client";

/**
 * F-101 sparkline cell (DEV-PLAN T9, SPEC §5.5): inline SVG, not a chart
 * library instance — 51 of these with their own resize observers would
 * strain the render budget for what is a four-point filled area. Geometry
 * (`areaPath`/`zeroY`) comes from the pure `sparklinePath` in
 * `lib/engine/workbook`; this component only draws it and wires up the
 * hover/focus tooltip.
 */
export interface SparklineProps {
  /** `null` renders the empty white plot frame (columns with no data). */
  areaPath: string | null;
  zeroY: number;
  width: number;
  height: number;
  fill: string;
  accessibleName: string;
  /** Four `year: value unit` lines (SPEC §5.5); empty when every value is blank. */
  tooltipLines: readonly string[];
}

export function Sparkline({
  areaPath,
  zeroY,
  width,
  height,
  fill,
  accessibleName,
  tooltipLines,
}: SparklineProps) {
  return (
    <div
      className="group/spark relative flex h-full w-full items-center justify-center"
      tabIndex={0}
      aria-label={accessibleName}
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="h-full w-full bg-white"
        aria-hidden="true"
      >
        {areaPath && <path d={areaPath} fill={fill} stroke="none" />}
        <line
          x1={0}
          y1={zeroY}
          x2={width}
          y2={zeroY}
          stroke="#BFBFBF"
          strokeWidth={0.5}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {tooltipLines.length > 0 && (
        <div
          role="tooltip"
          className="border-border bg-popover text-popover-foreground pointer-events-none absolute start-0 bottom-full z-10 mb-1 hidden w-max max-w-3xs rounded border p-2 text-xs whitespace-pre-line shadow-md group-hover/spark:block group-focus/spark:block"
        >
          {tooltipLines.join("\n")}
        </div>
      )}
    </div>
  );
}
