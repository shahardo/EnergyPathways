import type { PhaseBand } from "@/lib/schemas/workbook";

/** Phase band layout (SPEC §2.3, §5.7). Fills are the workbook's; only 2025–2030 has sub-groups. */
export const PHASE_BANDS: readonly PhaseBand[] = [
  {
    phase: "2025-2030",
    startRow: 40,
    endRow: 51,
    labelFill: "#BDD7EE",
    bodyFill: "#DEEBF7",
    subGroups: [
      { key: "targets", labelHe: "יעדים", labelEn: "Targets", startRow: 40, endRow: 42 },
      { key: "steps", labelHe: "צעדים", labelEn: "Steps", startRow: 43, endRow: 48 },
      { key: "impact", labelHe: "אימפקט", labelEn: "Impact", startRow: 49, endRow: 51 },
    ],
  },
  {
    phase: "2030-2040",
    startRow: 52,
    endRow: 60,
    labelFill: "#F8CBAD",
    bodyFill: "#FBE5D6",
    subGroups: [],
  },
  {
    phase: "2040-2050",
    startRow: 61,
    endRow: 66,
    labelFill: "#C5E0B4",
    bodyFill: "#E2F0D9",
    subGroups: [],
  },
];
