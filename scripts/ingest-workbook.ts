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
 *
 * Not yet implemented — see docs/DEV-PLAN.md T5 for the sub-task breakdown.
 */

function main(): never {
  throw new Error(
    "ingest-workbook: not yet implemented (DEV-PLAN T5). See docs/DEV-PLAN.md.",
  );
}

main();
