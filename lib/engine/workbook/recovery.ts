/**
 * Parameter recovery and verification (DEV-PLAN T6, SPEC §3.5). Pure
 * functions, shared verbatim between ingestion (T5, which calls these to
 * populate `channels.cf`/`ci_g_per_kwh`/`params_recovered`) and the parity
 * test harness (T6b) — the two must never run divergent copies of this
 * math (NFR-7).
 */

import { HOURS_PER_YEAR } from "../config";
import { MILESTONE_YEARS, type MilestoneYear } from "@/lib/schemas/workbook";

const VERIFY_TOLERANCE = 0.0501; // the workbook's own one-decimal rounding (SPEC §3.5 step 4)

function snapTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}

function median(values: readonly number[]): number {
  if (values.length === 0) throw new Error("recovery: median of an empty set");
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const lower = sorted[mid - 1];
  const upper = sorted[mid];
  if (upper === undefined) throw new Error("recovery: median index out of range");
  return sorted.length % 2 === 0 && lower !== undefined ? (lower + upper) / 2 : upper;
}

export type YearValues = Partial<Record<MilestoneYear, number | null>>;

/**
 * `ramp_t = median over columns of Generation_i,t / Generation_i,2050`
 * (SPEC §3.5 step 2), snapped to the nearest 0.05. Computed once, across
 * every channel that has a non-zero 2050 generation value — this is a
 * property of the workbook's shared deployment curve, not of one column.
 */
export function computeRamp(
  channels: ReadonlyArray<{ generationByYear: YearValues }>,
): Record<MilestoneYear, number> {
  const ramp = {} as Record<MilestoneYear, number>;
  for (const year of MILESTONE_YEARS) {
    const ratios: number[] = [];
    for (const channel of channels) {
      const g2050 = channel.generationByYear[2050];
      const gYear = channel.generationByYear[year];
      if (
        g2050 !== null &&
        g2050 !== undefined &&
        g2050 !== 0 &&
        gYear !== null &&
        gYear !== undefined
      ) {
        ratios.push(gYear / g2050);
      }
    }
    ramp[year] = snapTo(median(ratios), 0.05);
  }
  return ramp;
}

export interface RecoverParametersInput {
  potentialMw: number | null;
  generation2050: number | null;
  emissions2050: number | null;
}

export interface RecoveredParameters {
  /** `null` when unrecoverable — no potential to divide by (column D, SPEC §3.5's closing note; OQ-14). */
  cf: number | null;
  /** `null` when there is no 2050 generation to derive an intensity from (the enabler columns K, L). */
  ciGPerKwh: number | null;
}

/** SPEC §3.5 steps 1 and 3. */
export function recoverParameters(input: RecoverParametersInput): RecoveredParameters {
  const { potentialMw, generation2050, emissions2050 } = input;

  const cf =
    potentialMw !== null && potentialMw > 0 && generation2050 !== null
      ? snapTo(generation2050 / ((potentialMw * HOURS_PER_YEAR) / 1e6), 0.1)
      : null;

  const ciGPerKwh =
    generation2050 !== null && generation2050 !== 0 && emissions2050 !== null
      ? snapTo((emissions2050 / generation2050) * 1000, 50)
      : null;

  return { cf, ciGPerKwh };
}

export interface VerifyTrajectoriesInput {
  potentialMw: number | null;
  cf: number | null;
  ciGPerKwh: number | null;
  ramp: Record<MilestoneYear, number>;
  generationByYear: YearValues;
  emissionsByYear: YearValues;
}

export interface VerificationIssue {
  year: MilestoneYear;
  metric: "generation" | "emissions";
  modeled: number;
  stored: number;
  diff: number;
}

/**
 * SPEC §3.5 step 4: recompute `Generation_i,t = potential × CF × 8760/1e6 ×
 * ramp_t` and `Emissions_i,t = Generation_i,t(modeled) × CI / 1000`, and
 * flag every stored value more than `±0.0501` away from the model. A
 * channel with no recovered CF (D) or CI (K, L) has nothing to verify —
 * empty result, not a failure, per step 5 ("Phase 1 still displays its
 * stored values").
 */
export function verifyTrajectories(input: VerifyTrajectoriesInput): VerificationIssue[] {
  const { potentialMw, cf, ciGPerKwh, ramp, generationByYear, emissionsByYear } = input;
  if (potentialMw === null || cf === null) return [];

  const issues: VerificationIssue[] = [];
  for (const year of MILESTONE_YEARS) {
    const storedGen = generationByYear[year];
    if (storedGen === null || storedGen === undefined) continue;

    const modeledGen = potentialMw * cf * (HOURS_PER_YEAR / 1e6) * ramp[year];
    const diffGen = Math.abs(modeledGen - storedGen);
    if (diffGen > VERIFY_TOLERANCE) {
      issues.push({
        year,
        metric: "generation",
        modeled: modeledGen,
        stored: storedGen,
        diff: diffGen,
      });
    }

    const storedEm = emissionsByYear[year];
    if (storedEm === null || storedEm === undefined || ciGPerKwh === null) continue;
    const modeledEm = (modeledGen * ciGPerKwh) / 1000;
    const diffEm = Math.abs(modeledEm - storedEm);
    if (diffEm > VERIFY_TOLERANCE) {
      issues.push({
        year,
        metric: "emissions",
        modeled: modeledEm,
        stored: storedEm,
        diff: diffEm,
      });
    }
  }
  return issues;
}
