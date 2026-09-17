import { parseXml, attr } from "./xml";

/**
 * `theme1.xml`'s `<a:clrScheme>` in OOXML's fixed slot order, indexed the
 * way a cell fill's `theme="n"` attribute indexes it (verified against this
 * workbook, T5.2): 0 lt1, 1 dk1, 2 lt2, 3 dk2, 4 accent1 … 9 accent6,
 * 10 hlink, 11 folHlink. Note dk1/lt1 are swapped relative to XML document
 * order — that swap is the well-known OOXML theme-index quirk.
 */
const THEME_SLOTS = [
  "lt1",
  "dk1",
  "lt2",
  "dk2",
  "accent1",
  "accent2",
  "accent3",
  "accent4",
  "accent5",
  "accent6",
  "hlink",
  "folHlink",
] as const;

export type ThemePalette = string[]; // hex (no '#'), indexed 0..11 per THEME_SLOTS

export function parseTheme(xml: string): ThemePalette {
  const doc = parseXml(xml) as {
    "a:theme"?: { "a:themeElements"?: { "a:clrScheme"?: Record<string, unknown> } };
  };
  const scheme = doc["a:theme"]?.["a:themeElements"]?.["a:clrScheme"];
  if (!scheme) throw new Error("ingest-workbook: theme1.xml has no <a:clrScheme>");

  const slotKey: Record<(typeof THEME_SLOTS)[number], string> = {
    lt1: "a:lt1",
    dk1: "a:dk1",
    lt2: "a:lt2",
    dk2: "a:dk2",
    accent1: "a:accent1",
    accent2: "a:accent2",
    accent3: "a:accent3",
    accent4: "a:accent4",
    accent5: "a:accent5",
    accent6: "a:accent6",
    hlink: "a:hlink",
    folHlink: "a:folHlink",
  };

  return THEME_SLOTS.map((slot) => {
    const node = scheme[slotKey[slot]];
    const srgb = (node as { "a:srgbClr"?: unknown })?.["a:srgbClr"];
    if (srgb !== undefined) {
      const val = attr(srgb, "val");
      if (val) return val.toUpperCase();
    }
    const sysClr = (node as { "a:sysClr"?: unknown })?.["a:sysClr"];
    if (sysClr !== undefined) {
      const last = attr(sysClr, "lastClr");
      if (last) return last.toUpperCase();
    }
    throw new Error(
      `ingest-workbook: theme colour "${slot}" has neither srgbClr nor sysClr`,
    );
  });
}

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

function hexToRgb01(hex: string): [number, number, number] {
  const clean = hex.replace(/^#/, "");
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  return [r, g, b];
}

function rgb01ToHex([r, g, b]: [number, number, number]): string {
  const toHex = (c: number) =>
    Math.round(clamp01(c) * 255)
      .toString(16)
      .toUpperCase()
      .padStart(2, "0");
  return `${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** RGB (0..1) -> HSL (h in [0,1), s,l in [0,1]) — same convention as Python's colorsys.rgb_to_hls (l, then s). */
function rgbToHsl([r, g, b]: [number, number, number]): [number, number, number] {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  switch (max) {
    case r:
      h = (g - b) / d + (g < b ? 6 : 0);
      break;
    case g:
      h = (b - r) / d + 2;
      break;
    default:
      h = (r - g) / d + 4;
  }
  h /= 6;
  return [h, s, l];
}

function hueToRgb(p: number, q: number, t: number): number {
  let tt = t;
  if (tt < 0) tt += 1;
  if (tt > 1) tt -= 1;
  if (tt < 1 / 6) return p + (q - p) * 6 * tt;
  if (tt < 1 / 2) return q;
  if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
  return p;
}

function hslToRgb([h, s, l]: [number, number, number]): [number, number, number] {
  if (s === 0) return [l, l, l];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [hueToRgb(p, q, h + 1 / 3), hueToRgb(p, q, h), hueToRgb(p, q, h - 1 / 3)];
}

/**
 * ECMA-376 fill tint: lighten (tint > 0) or darken (tint < 0) a theme colour
 * by adjusting HSL lightness. Verified against this workbook's fills in
 * T5.2 — e.g. accent1 (`5B9BD5`) at tint `0.6` reproduces SPEC §5.3's
 * `#BDD7EE`, and the workbook's `#A6A6A6`/`#BFBFBF`/`#D9D9D9` neutral fills
 * fall out of negative tints on `lt1` (white).
 */
export function applyTint(hex: string, tint: number): string {
  if (tint === 0) return hex.toUpperCase();
  const [h, s, l] = rgbToHsl(hexToRgb01(hex));
  const newL = tint < 0 ? l * (1 + tint) : l * (1 - tint) + tint;
  return rgb01ToHex(hslToRgb([h, s, clamp01(newL)]));
}

/** Resolves a fill's effective hex colour, `#RRGGBB`, from either an explicit rgb or a theme index + tint. */
export function resolveThemeOrRgbColor(
  palette: ThemePalette,
  opts: { theme?: number; rgb?: string; tint?: number },
): string {
  if (opts.rgb) {
    // Excel ARGB, e.g. FF7030A0 — strip the alpha byte.
    const rgb = opts.rgb.length === 8 ? opts.rgb.slice(2) : opts.rgb;
    return `#${rgb.toUpperCase()}`;
  }
  if (opts.theme !== undefined) {
    const base = palette[opts.theme];
    if (!base) throw new Error(`ingest-workbook: theme index ${opts.theme} out of range`);
    const resolved = opts.tint ? applyTint(base, opts.tint) : base;
    return `#${resolved}`;
  }
  throw new Error("ingest-workbook: colour has neither rgb nor theme");
}
