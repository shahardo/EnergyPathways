/**
 * T6b parity fixture generator (DEV-PLAN T6b, AC-1). Run explicitly with
 * `npm run parity:generate` whenever `db/snapshot.json` changes — never
 * automatically, and never from CI. Reads the committed snapshot and,
 * using the same pure engine functions the app renders with
 * (`dimensionAverage`, `buildColorScale`), computes:
 *
 * - the recomputed dimension average for every channel/dimension, and
 * - the expected colour for every cell in every colour-scale rule's range,
 *
 * writing both to `db/parity-fixtures.json` (committed). The comparison
 * test (`tests/unit/engine/parity.test.ts`) runs in ordinary CI and
 * recomputes both independently from the live snapshot — this script's
 * job is only to freeze a reviewable, diffable expectation.
 */

import path from "node:path";
import { readFileSync, writeFileSync } from "node:fs";
import { dimensionAverage } from "../lib/engine/workbook/dimensionAverage";
import { buildColorScale, expandRange } from "../lib/engine/workbook/colorScale";
import { workbookPayloadSchema } from "../lib/schemas/workbook";

const SNAPSHOT_PATH = path.join(process.cwd(), "db", "snapshot.json");
const OUTPUT_PATH = path.join(process.cwd(), "db", "parity-fixtures.json");

function main() {
  const snapshot = workbookPayloadSchema.parse(
    JSON.parse(readFileSync(SNAPSHOT_PATH, "utf-8")),
  );

  const recomputedAverages = snapshot.dimensionAverages.map((avg) => {
    const subScores = snapshot.subScores.filter(
      (s) => s.channelId === avg.channelId && s.dimension === avg.dimension,
    );
    const recomputed = dimensionAverage(subScores.map((s) => s.value));
    return {
      channelId: avg.channelId,
      dimension: avg.dimension,
      cellRef: avg.cellRef,
      recomputed,
    };
  });

  const cellValues = new Map<string, number | null>();
  for (const s of snapshot.subScores) cellValues.set(s.cellRef, s.value);
  for (const a of snapshot.dimensionAverages) cellValues.set(a.cellRef, a.value);

  const cellColors: Record<string, string | null> = {};
  for (const rule of snapshot.colorScaleRules) {
    const scale = buildColorScale(rule, (ref) => cellValues.get(ref) ?? null);
    const cellRefs = rule.ranges.flatMap(expandRange);
    for (const ref of cellRefs) {
      cellColors[ref] = scale(ref);
    }
  }

  const output = {
    datasetVersion: snapshot.datasetMeta.datasetVersion,
    generatedAt: new Date().toISOString(),
    recomputedAverages,
    cellColors,
  };

  writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2) + "\n");
  console.log(`generate-parity-fixtures: wrote ${OUTPUT_PATH}`);
  console.log(
    `generate-parity-fixtures: ${recomputedAverages.length} averages, ${Object.keys(cellColors).length} cell colours across ${snapshot.colorScaleRules.length} rules`,
  );
}

main();
