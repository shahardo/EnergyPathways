import type { Phase, RoadmapItem } from "@/lib/schemas/workbook";
import { CHANNEL_COLUMNS, COLUMN_MAP } from "./columnMap";
import { cellValue, type RawSheet } from "./sheet";

const CHALLENGES_PREFIX = /^אתגרים:\s*/;

interface PhaseSpec {
  phase: Phase;
  targetRows?: readonly number[]; // one row per slot, single-line (SPEC §2.3)
  stepSlots: readonly (readonly [number, number, number])[]; // [title, detail, challenges]
  impactRows?: readonly number[]; // one row per slot, single-line, column E only in the current workbook
}

/** Roadmap block structure (SPEC §2.3, §2.4). Row numbers are the workbook's own. */
const PHASES: readonly PhaseSpec[] = [
  {
    phase: "2025-2030",
    targetRows: [40, 41, 42],
    stepSlots: [
      [43, 44, 45],
      [46, 47, 48],
    ],
    impactRows: [49, 50, 51],
  },
  {
    phase: "2030-2040",
    stepSlots: [
      [52, 53, 54],
      [55, 56, 57],
      [58, 59, 60],
    ],
  },
  {
    phase: "2040-2050",
    stepSlots: [
      [61, 62, 63],
      [64, 65, 66],
    ],
  },
];

function textAt(sheet: RawSheet, ref: string): string | null {
  const value = cellValue(sheet, ref);
  if (value === null) return null;
  if (typeof value !== "string") {
    throw new Error(
      `ingest-workbook: expected roadmap text at ${ref}, got ${JSON.stringify(value)}`,
    );
  }
  return value.trim() === "" ? null : value;
}

function splitChallenges(raw: string | null): string | null {
  if (raw === null) return null;
  return raw.replace(CHALLENGES_PREFIX, "");
}

/** Extracts every roadmap cell into position-stable items (T5.9). Empty slots are simply omitted — the UI (T10) renders the fixed grid of slots itself. */
export function extractRoadmapItems(sheet: RawSheet): RoadmapItem[] {
  const items: RoadmapItem[] = [];

  for (const phaseSpec of PHASES) {
    for (const col of CHANNEL_COLUMNS) {
      const entry = COLUMN_MAP.find((c) => c.columnLetter === col);
      if (!entry) continue;

      if (phaseSpec.targetRows) {
        phaseSpec.targetRows.forEach((row, index) => {
          const ref = `${col}${row}`;
          const titleHe = textAt(sheet, ref);
          if (titleHe === null) return;
          items.push({
            channelId: entry.channelId,
            phase: phaseSpec.phase,
            kind: "target",
            slot: index + 1,
            titleHe,
            detailHe: null,
            challengesHe: null,
            titleEn: null,
            detailEn: null,
            challengesEn: null,
            cellRefs: [ref],
          });
        });
      }

      phaseSpec.stepSlots.forEach(([titleRow, detailRow, challengesRow], index) => {
        const titleRef = `${col}${titleRow}`;
        const detailRef = `${col}${detailRow}`;
        const challengesRef = `${col}${challengesRow}`;
        const titleHe = textAt(sheet, titleRef);
        const detailHe = textAt(sheet, detailRef);
        const challengesRaw = textAt(sheet, challengesRef);
        if (titleHe === null && detailHe === null && challengesRaw === null) return;
        items.push({
          channelId: entry.channelId,
          phase: phaseSpec.phase,
          kind: "step",
          slot: index + 1,
          titleHe,
          detailHe,
          challengesHe: splitChallenges(challengesRaw),
          titleEn: null,
          detailEn: null,
          challengesEn: null,
          cellRefs: [titleRef, detailRef, challengesRef],
        });
      });

      if (phaseSpec.impactRows) {
        phaseSpec.impactRows.forEach((row, index) => {
          const ref = `${col}${row}`;
          const titleHe = textAt(sheet, ref);
          if (titleHe === null) return;
          items.push({
            channelId: entry.channelId,
            phase: phaseSpec.phase,
            kind: "impact",
            slot: index + 1,
            titleHe,
            detailHe: null,
            challengesHe: null,
            titleEn: null,
            detailEn: null,
            challengesEn: null,
            cellRefs: [ref],
          });
        });
      }
    }
  }

  return items;
}
