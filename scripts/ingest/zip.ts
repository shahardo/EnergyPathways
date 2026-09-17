import { readFile } from "node:fs/promises";
import JSZip from "jszip";

export interface WorkbookZip {
  filename: string;
  bytes: Buffer;
  sha256: string;
  /** Reads and parses a part (e.g. `xl/worksheets/sheet1.xml`) as UTF-8 text. Throws if the part is missing. */
  readText(path: string): Promise<string>;
  /** Lists part paths matching a prefix, e.g. `xl/charts/` — used to enumerate chartN.xml without assuming a count. */
  listParts(prefix: string): string[];
  hasPart(path: string): boolean;
}

export async function openWorkbookZip(filename: string): Promise<WorkbookZip> {
  const bytes = await readFile(filename);
  const { createHash } = await import("node:crypto");
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const zip = await JSZip.loadAsync(bytes);

  return {
    filename,
    bytes,
    sha256,
    async readText(path: string) {
      const entry = zip.file(path);
      if (!entry) {
        throw new Error(
          `ingest-workbook: missing required part "${path}" in ${filename}`,
        );
      }
      return entry.async("text");
    },
    listParts(prefix: string) {
      return Object.keys(zip.files)
        .filter((path) => path.startsWith(prefix) && !zip.files[path]?.dir)
        .sort();
    },
    hasPart(path: string) {
      return zip.file(path) !== null;
    },
  };
}
