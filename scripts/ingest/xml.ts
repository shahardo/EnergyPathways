import { XMLParser } from "fast-xml-parser";

/**
 * One parser configuration shared by every OOXML part. Attributes are
 * prefixed `@_`; text runs stay under `#text`; arrays are never collapsed to
 * a single object (`isArray` below), because the C4:S8-shaped repetition in
 * this workbook's XML makes "did I get an array or an object" a real bug
 * magnet otherwise.
 */
const ALWAYS_ARRAY = new Set([
  "row",
  "c",
  "mergeCell",
  "conditionalFormatting",
  "cfRule",
  "cfvo",
  "color",
  "si",
  "r",
  "fill",
  "xf",
  "numFmt",
  "font",
  "twoCellAnchor",
  "oneCellAnchor",
  "sp",
  "graphicFrame",
  "p",
  "ser",
  "pt",
  "a:p",
  "a:r",
]);

export function parseXml(xml: string): unknown {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    textNodeName: "#text",
    parseAttributeValue: false,
    trimValues: false,
    isArray: (tagName) => ALWAYS_ARRAY.has(tagName),
  });
  return parser.parse(xml);
}

/** Narrow an unknown OOXML JSON value into an array, tolerating a single collapsed object or absence. */
export function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

/** Reads an attribute (`@_name`) off a parsed OOXML node. */
export function attr(node: unknown, name: string): string | undefined {
  if (typeof node !== "object" || node === null) return undefined;
  const value = (node as Record<string, unknown>)[`@_${name}`];
  return value === undefined ? undefined : String(value);
}

export function textOf(node: unknown): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (typeof node === "object" && node !== null) {
    const text = (node as Record<string, unknown>)["#text"];
    if (typeof text === "string") return text;
    if (typeof text === "number") return String(text);
  }
  return "";
}
