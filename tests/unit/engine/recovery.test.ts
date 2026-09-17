import { describe, expect, it } from "vitest";
import {
  computeRamp,
  recoverParameters,
  verifyTrajectories,
  type YearValues,
} from "@/lib/engine/workbook/recovery";
import { MILESTONE_YEARS } from "@/lib/schemas/workbook";

/**
 * Golden fixture transcribed from SPEC §3.4's "Recovered parameters" table
 * — independently re-verified against the real workbook in DEV-PLAN T5.10.
 * Potential MW is SPEC §2.5; generation/emissions 2050 are SPEC §3.4.
 */
const GOLDEN: {
  col: string;
  potentialMw: number | null;
  generation2050: number | null;
  emissions2050: number | null;
  expectedCf: number | null;
  expectedCi: number | null;
}[] = [
  {
    col: "C",
    potentialMw: 3000,
    generation2050: 13.1,
    emissions2050: -5.3,
    expectedCf: 0.5,
    expectedCi: -400,
  },
  {
    col: "D",
    potentialMw: null,
    generation2050: 13.1,
    emissions2050: -5.3,
    expectedCf: null,
    expectedCi: -400,
  },
  {
    col: "E",
    potentialMw: 50000,
    generation2050: 87.6,
    emissions2050: 0,
    expectedCf: 0.2,
    expectedCi: 0,
  },
  {
    col: "F",
    potentialMw: 8000,
    generation2050: 35.0,
    emissions2050: 10.5,
    expectedCf: 0.5,
    expectedCi: 300,
  },
  {
    col: "G",
    potentialMw: 10000,
    generation2050: 52.6,
    emissions2050: 23.7,
    expectedCf: 0.6,
    expectedCi: 450,
  },
  {
    col: "H",
    potentialMw: 10000,
    generation2050: 61.3,
    emissions2050: 6.1,
    expectedCf: 0.7,
    expectedCi: 100,
  },
  {
    col: "I",
    potentialMw: 10000,
    generation2050: 52.6,
    emissions2050: 21.0,
    expectedCf: 0.6,
    expectedCi: 400,
  },
  {
    col: "J",
    potentialMw: 10000,
    generation2050: 52.6,
    emissions2050: 21.0,
    expectedCf: 0.6,
    expectedCi: 400,
  },
  {
    col: "K",
    potentialMw: null,
    generation2050: null,
    emissions2050: null,
    expectedCf: null,
    expectedCi: null,
  },
  {
    col: "L",
    potentialMw: null,
    generation2050: null,
    emissions2050: null,
    expectedCf: null,
    expectedCi: null,
  },
  {
    col: "M",
    potentialMw: 10000,
    generation2050: 61.3,
    emissions2050: 0,
    expectedCf: 0.7,
    expectedCi: 0,
  },
  {
    col: "N",
    potentialMw: 8000,
    generation2050: 63.1,
    emissions2050: 0,
    expectedCf: 0.9,
    expectedCi: 0,
  },
  {
    col: "O",
    potentialMw: 5000,
    generation2050: 35.0,
    emissions2050: 0,
    expectedCf: 0.8,
    expectedCi: 0,
  },
  {
    col: "P",
    potentialMw: 8000,
    generation2050: 35.0,
    emissions2050: 0,
    expectedCf: 0.5,
    expectedCi: 0,
  },
  {
    col: "Q",
    potentialMw: 2000,
    generation2050: 10.5,
    emissions2050: 4.2,
    expectedCf: 0.6,
    expectedCi: 400,
  },
  {
    col: "R",
    potentialMw: 1000,
    generation2050: 5.3,
    emissions2050: 2.1,
    expectedCf: 0.6,
    expectedCi: 400,
  },
  {
    col: "S",
    potentialMw: 5000,
    generation2050: 30.7,
    emissions2050: 27.6,
    expectedCf: 0.7,
    expectedCi: 900,
  },
];

function trajectoryFor(generation2050: number | null): YearValues {
  if (generation2050 === null) {
    return { 2025: null, 2030: null, 2040: null, 2050: null };
  }
  // Reconstructs each year from the SPEC §3.2 ramp so the fixture is self-consistent.
  const ramp = { 2025: 0.1, 2030: 0.3, 2040: 0.65, 2050: 1 };
  return Object.fromEntries(
    MILESTONE_YEARS.map((year) => [
      year,
      Math.round(generation2050 * ramp[year] * 10) / 10,
    ]),
  );
}

describe("computeRamp", () => {
  it("recovers the workbook's shared ramp curve (SPEC §3.2)", () => {
    const channels = GOLDEN.filter((g) => g.generation2050 !== null).map((g) => ({
      generationByYear: trajectoryFor(g.generation2050),
    }));
    const ramp = computeRamp(channels);
    expect(ramp[2025]).toBeCloseTo(0.1, 5);
    expect(ramp[2030]).toBeCloseTo(0.3, 5);
    expect(ramp[2040]).toBeCloseTo(0.65, 5);
    expect(ramp[2050]).toBeCloseTo(1, 5);
  });
});

describe("recoverParameters", () => {
  for (const g of GOLDEN) {
    it(`recovers CF and CI for column ${g.col}`, () => {
      const { cf, ciGPerKwh } = recoverParameters({
        potentialMw: g.potentialMw,
        generation2050: g.generation2050,
        emissions2050: g.emissions2050,
      });
      if (g.expectedCf === null) expect(cf).toBeNull();
      else expect(cf).toBeCloseTo(g.expectedCf, 5);
      if (g.expectedCi === null) expect(ciGPerKwh).toBeNull();
      else expect(ciGPerKwh).toBeCloseTo(g.expectedCi, 5);
    });
  }
});

describe("verifyTrajectories", () => {
  it("finds no issues for trajectories built directly from the recovered model", () => {
    // Construct generation/emissions *from* potential x CF x ramp and
    // generation x CI, exactly as verifyTrajectories itself models them —
    // this is what "self-consistent" means for this test: it checks the
    // tolerance/pass-through logic, not any particular rounding of real
    // stored values (that's covered by the ingest-report parity check
    // against the actual workbook in DEV-PLAN T5).
    const ramp = { 2025: 0.1, 2030: 0.3, 2040: 0.65, 2050: 1 };
    for (const g of GOLDEN) {
      if (g.potentialMw === null || g.generation2050 === null) continue;
      const { cf, ciGPerKwh } = recoverParameters({
        potentialMw: g.potentialMw,
        generation2050: g.generation2050,
        emissions2050: g.emissions2050,
      });
      if (cf === null) continue;
      const potentialMw = g.potentialMw;
      const generationByYear: YearValues = {};
      const emissionsByYear: YearValues = {};
      for (const year of MILESTONE_YEARS) {
        const gen = potentialMw * cf * (8760 / 1e6) * ramp[year];
        generationByYear[year] = gen;
        emissionsByYear[year] = ciGPerKwh === null ? null : (gen * ciGPerKwh) / 1000;
      }
      const issues = verifyTrajectories({
        potentialMw: g.potentialMw,
        cf,
        ciGPerKwh,
        ramp,
        generationByYear,
        emissionsByYear,
      });
      expect(issues, `column ${g.col}`).toHaveLength(0);
    }
  });

  it("flags a stored value that drifts from the recovered model beyond tolerance", () => {
    const ramp = { 2025: 0.1, 2030: 0.3, 2040: 0.65, 2050: 1 };
    const issues = verifyTrajectories({
      potentialMw: 3000,
      cf: 0.5,
      ciGPerKwh: -400,
      ramp,
      generationByYear: { 2025: 1.3, 2030: 3.9, 2040: 8.5, 2050: 20 }, // 2050 should be ~13.1
      emissionsByYear: { 2025: -0.5, 2030: -1.6, 2040: -3.4, 2050: -5.3 },
    });
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]?.year).toBe(2050);
    expect(issues[0]?.metric).toBe("generation");
  });

  it("has nothing to verify when CF is unrecoverable (column D)", () => {
    const issues = verifyTrajectories({
      potentialMw: null,
      cf: null,
      ciGPerKwh: -400,
      ramp: { 2025: 0.1, 2030: 0.3, 2040: 0.65, 2050: 1 },
      generationByYear: { 2025: 1.3, 2030: 3.9, 2040: 8.5, 2050: 13.1 },
      emissionsByYear: { 2025: -0.5, 2030: -1.6, 2040: -3.4, 2050: -5.3 },
    });
    expect(issues).toHaveLength(0);
  });
});
