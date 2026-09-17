# `db/`

Output of `npm run ingest` (`scripts/ingest-workbook.ts`, DEV-PLAN T5):

| File               | Committed?      | Contents                                                                               |
| :----------------- | :-------------- | :------------------------------------------------------------------------------------- |
| `snapshot.json`    | ✅              | Diffable record of every ingested value and layout attribute                           |
| `ingest-report.md` | ✅              | Findings, warnings, anomalies, recovered parameters                                    |
| `reference.sqlite` | ❌ (gitignored) | The database the app reads at runtime — rebuilt from `snapshot.json` by the data layer |

Nothing here yet — ingestion is not implemented.
