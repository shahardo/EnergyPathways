/**
 * Workbook ingestion pipeline (DEV-PLAN T5, SPEC §6.3).
 *
 * Parses `docs/Israel 2050 Pathways 06092026.xlsx` directly from its OOXML
 * parts (jszip + fast-xml-parser) — cell values, fills/theme colours,
 * conditional-formatting colour-scale rules, chart axes/series, and drawing
 * anchors for the callout shapes — because standard spreadsheet libraries do
 * not expose chart axes, drawing anchors or conditional-formatting rules.
 *
 * Run manually with `npm run ingest` whenever the workbook changes. Fails
 * closed: a failed structural assertion (SPEC §6.4) aborts without writing
 * `db/reference.sqlite`, `db/snapshot.json` or `db/ingest-report.md`.
 */

import path from "node:path";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

import { openWorkbookZip } from "./ingest/zip";
import { parseSharedStrings } from "./ingest/sharedStrings";
import { parseSheet } from "./ingest/sheet";
import { parseTheme } from "./ingest/theme";
import { parseStyles } from "./ingest/styles";
import { parseChart, type ParsedChart } from "./ingest/charts";
import { parseDrawing } from "./ingest/drawings";
import { parseRels } from "./ingest/rels";
import {
  runStructuralAssertions,
  assertAxisGroupFillsMatch,
  checkEquityAverageIsLiteral,
} from "./ingest/assertions";
import { COLUMN_MAP, AXIS_GROUPS } from "./ingest/columnMap";
import {
  extractChannelBase,
  extractSubScores,
  extractDimensionAverages,
  extractTrajectories,
  extractChannelText,
} from "./ingest/values";
import { extractRoadmapItems } from "./ingest/roadmap";
import { extractRowLabels } from "./ingest/layoutRowLabels";
import { resolveCallouts } from "./ingest/callouts";
import { resolveColorScaleRules } from "./ingest/colorScaleRules";
import { resolveSparklineSpecs } from "./ingest/sparklineSpecs";
import { PHASE_BANDS } from "./ingest/phaseBands";
import { renderIngestReport } from "./ingest/report";
import {
  computeRamp,
  recoverParameters,
  verifyTrajectories,
} from "../lib/engine/workbook/recovery";
import {
  MILESTONE_YEARS,
  workbookPayloadSchema,
  type Channel,
} from "../lib/schemas/workbook";
import * as schema from "../lib/db/schema";
import { hydrateFromSnapshot } from "../lib/db/hydrate";

const XLSX_PATH =
  process.argv[2] ??
  path.join(process.cwd(), "docs", "Israel 2050 Pathways 06092026.xlsx");
const DB_DIR = path.join(process.cwd(), "db");
const SNAPSHOT_PATH = path.join(DB_DIR, "snapshot.json");
const REPORT_PATH = path.join(DB_DIR, "ingest-report.md");
const SQLITE_PATH = path.join(DB_DIR, "reference.sqlite");
const MIGRATIONS_FOLDER = path.join(process.cwd(), "drizzle");

async function main() {
  console.log(`ingest-workbook: reading ${XLSX_PATH}`);
  const zip = await openWorkbookZip(XLSX_PATH);

  const sharedStrings = parseSharedStrings(await zip.readText("xl/sharedStrings.xml"));
  const sheet = parseSheet(await zip.readText("xl/worksheets/sheet1.xml"), sharedStrings);
  const palette = parseTheme(await zip.readText("xl/theme/theme1.xml"));
  const styles = parseStyles(await zip.readText("xl/styles.xml"), palette);

  console.log("ingest-workbook: running structural assertions (T5.6, SPEC §6.4)");
  runStructuralAssertions(sheet);
  assertAxisGroupFillsMatch(sheet, styles);
  const equityRowIsLiteral = checkEquityAverageIsLiteral(sheet);

  const anomalies: string[] = [];
  if (equityRowIsLiteral) {
    anomalies.push(
      'Row 31 (equity average) holds literal cached numbers, not a live `IFERROR(AVERAGE(...),"")` formula like rows 9 and 20 — displayed values are unaffected, but editing a hidden equity sub-score will not update this row automatically.',
    );
  }

  // --- Values ---------------------------------------------------------
  const channelBase = extractChannelBase(sheet);
  const subScores = extractSubScores(sheet);
  const dimensionAverages = extractDimensionAverages(sheet);
  const trajectories = extractTrajectories(sheet);
  const channelText = extractChannelText(sheet);
  const roadmapItems = extractRoadmapItems(sheet);
  const rowLabels = extractRowLabels(sheet);

  const dBlankSecurity = subScores.filter(
    (s) =>
      s.channelId === "demand_reduction" &&
      s.dimension === "security" &&
      s.value === null,
  );
  if (dBlankSecurity.length === 5) {
    anomalies.push(
      "Column D (demand reduction) has no security sub-scores — it copies column C's trajectories with no potential and no security scoring of its own (OQ-14).",
    );
  }
  const dPotential = channelBase.find(
    (c) => c.channelId === "demand_reduction",
  )?.potentialMw;
  if (dPotential === null) {
    anomalies.push(
      "Column D (demand reduction) has no deployment potential — its generation/emissions trajectories are carried as data, identical to column C's (OQ-14).",
    );
  }
  for (const enablerId of ["fuel_supply", "grid_development"] as const) {
    anomalies.push(
      `Column ${enablerId} carries no potential or trajectory quantities — it is an enabler, not an energy pathway (OQ-15).`,
    );
  }
  const blankEquity = dimensionAverages.filter(
    (d) =>
      d.dimension === "equity" && d.value === null && d.channelId !== "demand_reduction",
  );
  if (blankEquity.length > 0) {
    anomalies.push(
      `Blank equity averages: ${blankEquity.map((d) => d.channelId).join(", ")}.`,
    );
  }

  // --- Charts, drawing, callouts, colour scale -------------------------
  const chartFiles = zip.listParts("xl/charts/").filter((p) => /chart\d+\.xml$/.test(p));
  const charts = new Map<string, ParsedChart>();
  for (const filePath of chartFiles) {
    const file = filePath.split("/").pop()!;
    charts.set(file, parseChart(file, await zip.readText(filePath), palette));
  }
  const sparklineSpecs = resolveSparklineSpecs([...charts.values()]);

  const drawing = parseDrawing(await zip.readText("xl/drawings/drawing1.xml"));
  const rels = parseRels(await zip.readText("xl/drawings/_rels/drawing1.xml.rels"));
  for (const anchor of drawing.chartAnchors) {
    const target = rels.get(anchor.chartRelId);
    const file = target?.split("/").pop();
    const chart = file ? charts.get(file) : undefined;
    if (chart && chart.dataColumn !== anchor.visualColumn) {
      anomalies.push(
        `${chart.file} plots column ${chart.dataColumn}'s data but is rendered in column ${anchor.visualColumn}'s sparkline slot.`,
      );
    }
  }

  const calloutExtraction = resolveCallouts(drawing.callouts);
  for (const anchor of calloutExtraction.duplicateAnchors) {
    anomalies.push(`Duplicate callout at ${anchor} — de-duplicated, one kept (OQ-18).`);
  }

  const colorScaleExtraction = resolveColorScaleRules(sheet.colorScaleRanges);
  if (colorScaleExtraction.trilemmaColorScale) {
    anomalies.push(
      "Row 37 (טרילמה) is entirely blank in the source workbook, but carries a colour-scale rule; the UI computes and displays it as the mean of the three dimension averages (OQ-16), using this rule's own colours.",
    );
  }

  // --- Parameter recovery (T5.10 / T6, SPEC §3.5) ----------------------
  const trajectoryByChannel = new Map(
    COLUMN_MAP.map((col) => [
      col.channelId,
      {
        generationByYear: Object.fromEntries(
          MILESTONE_YEARS.map((year) => [
            year,
            trajectories.find(
              (t) =>
                t.channelId === col.channelId &&
                t.metric === "generation" &&
                t.year === year,
            )?.value ?? null,
          ]),
        ),
        emissionsByYear: Object.fromEntries(
          MILESTONE_YEARS.map((year) => [
            year,
            trajectories.find(
              (t) =>
                t.channelId === col.channelId &&
                t.metric === "emissions" &&
                t.year === year,
            )?.value ?? null,
          ]),
        ),
      },
    ]),
  );
  const ramp = computeRamp([...trajectoryByChannel.values()]);
  const verificationIssueCounts = new Map<string, number>();

  const channels: Channel[] = channelBase.map((base) => {
    const traj = trajectoryByChannel.get(base.channelId)!;
    const recovered = recoverParameters({
      potentialMw: base.potentialMw,
      generation2050: traj.generationByYear[2050] ?? null,
      emissions2050: traj.emissionsByYear[2050] ?? null,
    });
    const issues = verifyTrajectories({
      potentialMw: base.potentialMw,
      cf: recovered.cf,
      ciGPerKwh: recovered.ciGPerKwh,
      ramp,
      generationByYear: traj.generationByYear,
      emissionsByYear: traj.emissionsByYear,
    });
    verificationIssueCounts.set(base.channelId, issues.length);
    if (issues.length > 0) {
      anomalies.push(
        `${base.channelId}: ${issues.length} trajectory value(s) failed §3.5 verification (>±0.0501 from the recovered model).`,
      );
    }
    return {
      ...base,
      cf: recovered.cf,
      ciGPerKwh: recovered.ciGPerKwh,
      paramsRecovered: recovered.cf !== null && issues.length === 0,
    };
  });

  // --- Assemble + validate ----------------------------------------------
  const datasetVersion = zip.sha256.slice(0, 16);
  const payload = workbookPayloadSchema.parse({
    datasetMeta: {
      datasetVersion,
      filename: path.basename(XLSX_PATH),
      sha256: zip.sha256,
      ingestedAt: new Date().toISOString(),
      rowCount: sheet.rows.size,
      columnCount: COLUMN_MAP.length,
    },
    channels,
    subScores,
    dimensionAverages,
    trajectories,
    channelText,
    roadmapItems,
    callouts: calloutExtraction.callouts,
    ramp: MILESTONE_YEARS.map((year) => ({ year, value: ramp[year] })),
    axisGroups: AXIS_GROUPS,
    rowLabels,
    colorScaleRules: colorScaleExtraction.rules,
    trilemmaColorScale: colorScaleExtraction.trilemmaColorScale,
    sparklineSpecs,
    phaseBands: PHASE_BANDS,
  });

  // --- Write outputs ------------------------------------------------------
  mkdirSync(DB_DIR, { recursive: true });
  writeFileSync(SNAPSHOT_PATH, JSON.stringify(payload, null, 2) + "\n");
  console.log(`ingest-workbook: wrote ${SNAPSHOT_PATH}`);

  const report = renderIngestReport({
    datasetVersion,
    filename: payload.datasetMeta.filename,
    sha256: payload.datasetMeta.sha256,
    ingestedAt: payload.datasetMeta.ingestedAt,
    rowCount: payload.datasetMeta.rowCount,
    columnCount: payload.datasetMeta.columnCount,
    anomalies,
    recoveredParameters: channels.map((c) => ({
      channelId: c.channelId,
      columnLetter: c.columnLetter,
      cf: c.cf,
      ciGPerKwh: c.ciGPerKwh,
      paramsRecovered: c.paramsRecovered,
      verificationIssueCount: verificationIssueCounts.get(c.channelId) ?? 0,
    })),
    ramp,
  });
  writeFileSync(REPORT_PATH, report);
  console.log(`ingest-workbook: wrote ${REPORT_PATH}`);

  rmSync(SQLITE_PATH, { force: true });
  rmSync(`${SQLITE_PATH}-wal`, { force: true });
  rmSync(`${SQLITE_PATH}-shm`, { force: true });
  const sqlite = new Database(SQLITE_PATH);
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  hydrateFromSnapshot(db, payload);
  sqlite.close();
  console.log(`ingest-workbook: wrote ${SQLITE_PATH}`);

  console.log(
    `ingest-workbook: done. dataset_version=${datasetVersion}, ${anomalies.length} anomalies reported.`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
