# `db/`

Output of `npm run ingest` (`scripts/ingest-workbook.ts`, DEV-PLAN T5) and
`npm run parity:generate` (`scripts/generate-parity-fixtures.ts`, T6b):

| File                   | Committed?      | Contents                                                                                   |
| :--------------------- | :-------------- | :----------------------------------------------------------------------------------------- |
| `snapshot.json`        | ✅              | Diffable record of every ingested value and layout attribute                               |
| `ingest-report.md`     | ✅              | Findings, warnings, anomalies, recovered parameters                                        |
| `parity-fixtures.json` | ✅              | T6b golden fixtures: recomputed dimension averages + expected colour per cell              |
| `reference.sqlite`     | ❌ (gitignored) | The database the app reads at runtime — rebuilt from `snapshot.json` by `lib/db/client.ts` |

Both generator scripts run explicitly, never automatically (not in CI, not
on build) — re-run them and commit the diff whenever the source workbook or
`lib/db/schema.ts` changes.
