import type { Callout, Phase } from "@/lib/schemas/workbook";
import { COLUMN_MAP } from "./columnMap";
import type { CalloutShape } from "./drawings";

const PHASE_ROW_RANGES: readonly { phase: Phase; start: number; end: number }[] = [
  { phase: "2025-2030", start: 40, end: 51 },
  { phase: "2030-2040", start: 52, end: 60 },
  { phase: "2040-2050", start: 61, end: 66 },
];

function phaseForRow(row: number): Phase {
  const match = PHASE_ROW_RANGES.find((r) => row >= r.start && row <= r.end);
  if (!match)
    throw new Error(`ingest-workbook: callout row ${row} is outside any roadmap phase`);
  return match.phase;
}

function splitAnchorCell(anchorCell: string): { column: string; row: number } {
  const match = /^([A-Z]+)(\d+)$/.exec(anchorCell);
  if (!match || !match[1] || !match[2]) {
    throw new Error(`ingest-workbook: malformed callout anchor "${anchorCell}"`);
  }
  return { column: match[1], row: Number(match[2]) };
}

export interface CalloutExtraction {
  callouts: Callout[];
  /** Anchor cells that carried more than one identical callout — reported, not silently kept (OQ-18). */
  duplicateAnchors: string[];
}

/** Resolves each drawing callout shape to its channel/phase and de-duplicates identical ⚠ notes at the same anchor (T5.5, SPEC §5.8, OQ-18). */
export function resolveCallouts(shapes: readonly CalloutShape[]): CalloutExtraction {
  const seen = new Map<string, Callout>();
  const duplicateAnchors: string[] = [];

  shapes.forEach((shape, index) => {
    const { column, row } = splitAnchorCell(shape.anchorCell);
    const entry = COLUMN_MAP.find((c) => c.columnLetter === column);
    if (!entry) {
      throw new Error(
        `ingest-workbook: callout anchored at ${shape.anchorCell} is outside the channel columns`,
      );
    }
    const dedupeKey = `${shape.anchorCell}::${shape.text}`;
    if (seen.has(dedupeKey)) {
      duplicateAnchors.push(shape.anchorCell);
      return;
    }
    seen.set(dedupeKey, {
      calloutId: `callout-${index + 1}`,
      channelId: entry.channelId,
      phase: phaseForRow(row),
      anchorCell: shape.anchorCell,
      textHe: shape.text,
      textEn: null,
    });
  });

  return { callouts: [...seen.values()], duplicateAnchors };
}
