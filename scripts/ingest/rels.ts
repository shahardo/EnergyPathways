import { parseXml, asArray, attr } from "./xml";

/** Parses a `.rels` part into `rId -> target path` (e.g. `../charts/chart1.xml`). */
export function parseRels(xml: string): Map<string, string> {
  const doc = parseXml(xml) as { Relationships?: { Relationship?: unknown[] } };
  const map = new Map<string, string>();
  for (const rel of asArray(doc.Relationships?.Relationship)) {
    const id = attr(rel, "Id");
    const target = attr(rel, "Target");
    if (id && target) map.set(id, target);
  }
  return map;
}
