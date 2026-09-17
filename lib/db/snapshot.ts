import path from "node:path";
import { readFileSync } from "node:fs";
import { workbookPayloadSchema, type WorkbookPayload } from "@/lib/schemas/workbook";

const SNAPSHOT_PATH = path.join(process.cwd(), "db", "snapshot.json");

let cached: WorkbookPayload | null = null;

/** Reads and validates the committed `db/snapshot.json` (DEV-PLAN T5.11) — the diffable record `reference.sqlite` is rebuilt from. */
export function loadSnapshot(): WorkbookPayload {
  if (cached) return cached;
  const raw = readFileSync(SNAPSHOT_PATH, "utf-8");
  cached = workbookPayloadSchema.parse(JSON.parse(raw));
  return cached;
}
