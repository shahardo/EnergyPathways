import type {
  ColorScaleRule,
  Dimension,
  TrilemmaColorScale,
} from "@/lib/schemas/workbook";
import type { RawColorScaleRule } from "./sheet";

/**
 * Maps a rule's `sqref` to the dimension + rule id it represents (SPEC
 * §5.4). Column D gets its own rule per dimension (it's excluded from the
 * main range so its `min == max` scale never skews the other 16 columns'
 * colours) — six rules in total.
 *
 * Row 37 (טרילמה) also carries a colour-scale rule in the file. The row
 * itself is entirely blank in the source workbook (OQ-16), but its
 * colour-scale rule is captured separately (`TrilemmaColorScale`, not a
 * seventh `ColorScaleRule`, since it isn't keyed to one of the three
 * Trilemma dimensions) for the UI's own computed composite -- "the mean
 * of the three dimension averages," OQ-16's documented default -- to
 * colour itself with the workbook's real colours rather than an invented
 * scale.
 */
const RULE_BY_SQREF: Record<
  string,
  { ruleId: string; dimension: Dimension } | "trilemma"
> = {
  "C4:S8 C9 E9:S9": { ruleId: "security", dimension: "security" },
  D9: { ruleId: "security_d", dimension: "security" },
  "C15:C20 E15:S20": { ruleId: "environment", dimension: "environment" },
  "D15:D20": { ruleId: "environment_d", dimension: "environment" },
  "C26:C31 E26:S31": { ruleId: "equity", dimension: "equity" },
  "D26:D31": { ruleId: "equity_d", dimension: "equity" },
  "C37:S37": "trilemma",
};

export interface ColorScaleExtraction {
  rules: ColorScaleRule[];
  trilemmaColorScale: TrilemmaColorScale | null;
}

export function resolveColorScaleRules(
  raw: readonly RawColorScaleRule[],
): ColorScaleExtraction {
  const rules: ColorScaleRule[] = [];
  let trilemmaColorScale: TrilemmaColorScale | null = null;

  for (const rule of raw) {
    const mapping = RULE_BY_SQREF[rule.sqref];
    if (mapping === undefined) {
      throw new Error(`ingest-workbook: unrecognized colour-scale range "${rule.sqref}"`);
    }
    if (mapping === "trilemma") {
      trilemmaColorScale = {
        ranges: rule.sqref.split(" "),
        low: rule.low,
        mid: rule.mid,
        high: rule.high,
        midPercentile: rule.midPercentile,
      };
      continue;
    }
    rules.push({
      ruleId: mapping.ruleId,
      dimension: mapping.dimension,
      ranges: rule.sqref.split(" "),
      low: rule.low,
      mid: rule.mid,
      high: rule.high,
      midPercentile: rule.midPercentile,
    });
  }

  return { rules, trilemmaColorScale };
}
