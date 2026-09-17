import path from "node:path";
import { existsSync, mkdirSync } from "node:fs";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema";
import { loadSnapshot } from "./snapshot";
import { hydrateFromSnapshot } from "./hydrate";

const DB_PATH = path.join(process.cwd(), "db", "reference.sqlite");
const MIGRATIONS_FOLDER = path.join(process.cwd(), "drizzle");

let cached: BetterSQLite3Database<typeof schema> | null = null;

/**
 * Opens (creating if needed) `db/reference.sqlite`, runs pending Drizzle
 * migrations, and — since the sqlite file itself is gitignored (SPEC
 * §6.1) — hydrates it from the committed `db/snapshot.json` whenever it's
 * empty or stale against the snapshot's `dataset_version`. A fresh clone
 * therefore needs no OOXML re-ingestion to serve the workbook; that's
 * needed only when the source `.xlsx` itself changes (`npm run ingest`).
 */
export function getDb(): BetterSQLite3Database<typeof schema> {
  if (cached) return cached;

  mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  const db = drizzle(sqlite, { schema });

  migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });

  const snapshot = loadSnapshot();
  const current = db.select().from(schema.datasetMeta).all();
  const isStale =
    current.length === 0 ||
    current[0]?.datasetVersion !== snapshot.datasetMeta.datasetVersion;
  if (isStale) {
    hydrateFromSnapshot(db, snapshot);
  }

  cached = db;
  return db;
}

export function databaseFileExists(): boolean {
  return existsSync(DB_PATH);
}
