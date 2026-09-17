/**
 * `DimensionAverage_i,d = mean of the non-blank sub-scores of channel i in
 * dimension d; null if all five are blank` (SPEC §3.1) — mirrors
 * `IFERROR(AVERAGE(...),"")`: `AVERAGE` skips blanks, `IFERROR` turns the
 * all-blank error into blank.
 */
export function dimensionAverage(subScores: readonly (number | null)[]): number | null {
  const present = subScores.filter((value): value is number => value !== null);
  if (present.length === 0) return null;
  return present.reduce((sum, value) => sum + value, 0) / present.length;
}
