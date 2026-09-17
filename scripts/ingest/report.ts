export interface IngestReportData {
  datasetVersion: string;
  filename: string;
  sha256: string;
  ingestedAt: string;
  rowCount: number;
  columnCount: number;
  anomalies: string[];
  recoveredParameters: {
    channelId: string;
    columnLetter: string;
    cf: number | null;
    ciGPerKwh: number | null;
    paramsRecovered: boolean;
    verificationIssueCount: number;
  }[];
  ramp: Record<number, number>;
}

function formatOrDash(value: number | null): string {
  // Display rounding only — snapshot.json and reference.sqlite keep full precision.
  return value === null ? "—" : String(Math.round(value * 1000) / 1000);
}

/** Renders `db/ingest-report.md` (T5.11): findings, warnings, recovered parameters (SPEC §6.3). */
export function renderIngestReport(data: IngestReportData): string {
  const lines: string[] = [];
  lines.push("# Workbook Ingestion Report");
  lines.push("");
  lines.push(`- **Dataset version:** \`${data.datasetVersion}\``);
  lines.push(`- **Source file:** \`${data.filename}\``);
  lines.push(`- **SHA-256:** \`${data.sha256}\``);
  lines.push(`- **Ingested at:** ${data.ingestedAt}`);
  lines.push(`- **Rows × columns read:** ${data.rowCount} × ${data.columnCount}`);
  lines.push("");

  lines.push("## Anomalies and warnings");
  lines.push("");
  if (data.anomalies.length === 0) {
    lines.push("None.");
  } else {
    for (const anomaly of data.anomalies) lines.push(`- ${anomaly}`);
  }
  lines.push("");

  lines.push("## Recovered parameters (SPEC §3.5)");
  lines.push("");
  lines.push(
    `Ramp: ${Object.entries(data.ramp)
      .map(([y, v]) => `${y}=${Math.round(v * 1000) / 1000}`)
      .join(", ")}`,
  );
  lines.push("");
  lines.push("| Col | Channel | CF | CI (g/kWh) | Recovered | Verification issues |");
  lines.push("| :-- | :--- | --: | --: | :-: | --: |");
  for (const row of data.recoveredParameters) {
    lines.push(
      `| ${row.columnLetter} | ${row.channelId} | ${formatOrDash(row.cf)} | ${formatOrDash(row.ciGPerKwh)} | ${row.paramsRecovered ? "✅" : "❌"} | ${row.verificationIssueCount} |`,
    );
  }
  lines.push("");

  return lines.join("\n");
}
