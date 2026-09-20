import { describe, expect, it } from "vitest";
import { getWorkbookPayload } from "@/lib/db/queries";
import { sparklinePath } from "@/lib/engine/workbook/sparklinePath";
import { buildDimensionColorScales } from "@/components/workbook/scoreRows";
import { trajectoryValuesForChannel } from "@/components/workbook/sparklineRows";

/**
 * SPEC §6.5 / DEV-PLAN T14 performance gate: "engine ≤ 16 ms per
 * evaluation" (PRD §5.2). This times the actual per-render engine work --
 * building all 3 dimensions' colour scales plus all 51 sparkline
 * geometries (17 channels × 3 dimensions) over the real ingested
 * payload -- rather than a single pure function in isolation, since
 * that's the unit that has to fit the budget on every expand/filter
 * re-render (`WorkbookMatrix.tsx`'s `useMemo`s).
 *
 * The ceiling here is intentionally looser than the strict 16 ms PRD
 * figure: this suite runs on whatever CI runner is available, not the
 * "mid-tier laptop" the budget is stated for, and vitest/V8 warm-up noise
 * on a shared runner is real. 16 ms was already comfortably met when this
 * test was written (see the console output on a local run); the assertion
 * below is a regression tripwire against an accidental O(n²) blowup, not
 * a substitute for profiling on target hardware.
 */
describe("engine performance budget", () => {
  it("computes every colour scale and sparkline for a full render within budget", () => {
    const payload = getWorkbookPayload();
    const dimensions = ["security", "environment", "equity"] as const;
    const metricByDimension = {
      security: "generation",
      environment: "emissions",
      equity: "price_impact",
    } as const;
    const sparklineSpecByDimension = new Map(
      payload.sparklineSpecs.map((s) => [s.dimension, s]),
    );

    function runOneFullMatrixEvaluation() {
      const colorScales = buildDimensionColorScales(
        payload.colorScaleRules,
        payload.subScores,
        payload.dimensionAverages,
      );
      for (const channel of payload.channels) {
        for (const dimension of dimensions) {
          colorScales.colorForCell(dimension, channel.columnLetter, "unused");
        }
      }

      for (const dimension of dimensions) {
        const spec = sparklineSpecByDimension.get(dimension);
        if (!spec) continue;
        for (const channel of payload.channels) {
          const values = trajectoryValuesForChannel(
            payload.trajectories,
            channel.channelId,
            metricByDimension[dimension],
          );
          sparklinePath(
            values,
            { axisMin: spec.axisMin, axisMax: spec.axisMax },
            100,
            32,
          );
        }
      }
    }

    // Warm up the JIT once, then take the median of several runs so one
    // GC pause doesn't fail an otherwise-fast suite.
    runOneFullMatrixEvaluation();
    const durationsMs: number[] = [];
    for (let i = 0; i < 15; i++) {
      const start = performance.now();
      runOneFullMatrixEvaluation();
      durationsMs.push(performance.now() - start);
    }
    durationsMs.sort((a, b) => a - b);
    const median = durationsMs[Math.floor(durationsMs.length / 2)]!;

    expect(median).toBeLessThan(50);
  });
});
