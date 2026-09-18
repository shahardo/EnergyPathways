import type {
  ChannelId,
  Phase,
  PhaseBand,
  RoadmapItem,
  RoadmapKind,
} from "@/lib/schemas/workbook";

/** Step slots occupy row triplets — title, detail, challenges (SPEC §2.3). */
const STEP_ROW_TRIPLET = 3;

export interface RoadmapSlotRow {
  phase: Phase;
  kind: RoadmapKind;
  slot: number;
  /** `null` for a phase with no sub-groups (2030-2040, 2040-2050). */
  subGroupKey: string | null;
}

export interface RoadmapPhaseSpan {
  phase: Phase;
  startIndex: number;
  rowCount: number;
  labelFill: string;
  bodyFill: string;
}

export interface RoadmapSubGroupSpan {
  phase: Phase;
  key: string;
  labelHe: string;
  labelEn: string;
  startIndex: number;
  rowCount: number;
}

export interface RoadmapLayout {
  /** Flat, in render order — one entry per UI row (SPEC §5.7's step "card" is one row, not three). */
  rows: RoadmapSlotRow[];
  phaseSpans: RoadmapPhaseSpan[];
  subGroupSpans: RoadmapSubGroupSpan[];
  /**
   * Every workbook row 40-66 mapped back to the UI slot it belongs to — a
   * step slot's three rows (title/detail/challenges) all map to the same
   * slot. Lets a callout's `anchorCell` row (e.g. `G53`) resolve to the
   * step card it should attach to (T11), without re-deriving the
   * triplet/single-row split a second time.
   */
  rowNumberToSlot: ReadonlyMap<number, RoadmapSlotRow>;
}

function kindForSubGroupKey(key: string): RoadmapKind {
  if (key === "targets") return "target";
  if (key === "impact") return "impact";
  return "step";
}

/**
 * Derives the roadmap's row/phase/sub-group layout from ingested
 * `phaseBands` (SPEC §2.3, §5.7) rather than hard-coding workbook row
 * numbers again. The one structural fact this still encodes is the
 * workbook's own step-triplet convention (title/detail/challenges = one
 * row triplet = one UI row); targets and impact rows are one workbook row
 * per slot.
 */
export function buildRoadmapLayout(phaseBands: readonly PhaseBand[]): RoadmapLayout {
  const rows: RoadmapSlotRow[] = [];
  const phaseSpans: RoadmapPhaseSpan[] = [];
  const subGroupSpans: RoadmapSubGroupSpan[] = [];
  const rowNumberToSlot = new Map<number, RoadmapSlotRow>();

  for (const band of [...phaseBands].sort((a, b) => a.startRow - b.startRow)) {
    const phaseStartIndex = rows.length;
    const hasSubGroups = band.subGroups.length > 0;
    const groups = hasSubGroups
      ? [...band.subGroups].sort((a, b) => a.startRow - b.startRow)
      : [
          {
            key: "steps",
            labelHe: "",
            labelEn: "",
            startRow: band.startRow,
            endRow: band.endRow,
          },
        ];

    for (const group of groups) {
      const kind = kindForSubGroupKey(group.key);
      const rowSpan = group.endRow - group.startRow + 1;
      const rowsPerSlot = kind === "step" ? STEP_ROW_TRIPLET : 1;
      const slotCount = rowSpan / rowsPerSlot;
      const subGroupStartIndex = rows.length;
      for (let slot = 1; slot <= slotCount; slot++) {
        const slotRow: RoadmapSlotRow = {
          phase: band.phase,
          kind,
          slot,
          subGroupKey: hasSubGroups ? group.key : null,
        };
        rows.push(slotRow);
        const firstWorkbookRow = group.startRow + (slot - 1) * rowsPerSlot;
        for (let r = firstWorkbookRow; r < firstWorkbookRow + rowsPerSlot; r++) {
          rowNumberToSlot.set(r, slotRow);
        }
      }
      if (hasSubGroups) {
        subGroupSpans.push({
          phase: band.phase,
          key: group.key,
          labelHe: group.labelHe,
          labelEn: group.labelEn,
          startIndex: subGroupStartIndex,
          rowCount: rows.length - subGroupStartIndex,
        });
      }
    }

    phaseSpans.push({
      phase: band.phase,
      startIndex: phaseStartIndex,
      rowCount: rows.length - phaseStartIndex,
      labelFill: band.labelFill,
      bodyFill: band.bodyFill,
    });
  }

  return { rows, phaseSpans, subGroupSpans, rowNumberToSlot };
}

/** Splits an A1-style cell reference (e.g. `G53`) into its column letters and row number. */
export function parseCellRef(cellRef: string): { column: string; row: number } {
  const match = /^([A-Z]+)([0-9]+)$/.exec(cellRef);
  if (!match || !match[1] || !match[2]) {
    throw new Error(`parseCellRef: malformed cell reference "${cellRef}"`);
  }
  return { column: match[1], row: Number(match[2]) };
}

export function roadmapItemKey(
  phase: Phase,
  kind: RoadmapKind,
  slot: number,
  channelId: ChannelId,
): string {
  return `${phase}|${kind}|${slot}|${channelId}`;
}

/** Indexes roadmap items for O(1) lookup by (phase, kind, slot, channel) — the fixed grid a row/channel pair addresses. */
export function indexRoadmapItems(
  items: readonly RoadmapItem[],
): ReadonlyMap<string, RoadmapItem> {
  const map = new Map<string, RoadmapItem>();
  for (const item of items) {
    map.set(roadmapItemKey(item.phase, item.kind, item.slot, item.channelId), item);
  }
  return map;
}
