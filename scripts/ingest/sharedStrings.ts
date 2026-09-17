import { parseXml, asArray, textOf } from "./xml";

/** Parses `xl/sharedStrings.xml`, flattening rich-text runs (`<r><t>...</t></r>`) into plain strings (T5.1). */
export function parseSharedStrings(xml: string): string[] {
  const doc = parseXml(xml) as { sst?: { si?: unknown[] } };
  const items = asArray(doc.sst?.si);
  return items.map((si) => {
    const node = si as { t?: unknown; r?: unknown[] };
    if (node.t !== undefined) return textOf(node.t);
    const runs = asArray(node.r);
    return runs.map((run) => textOf((run as { t?: unknown }).t)).join("");
  });
}
