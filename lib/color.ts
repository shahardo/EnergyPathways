/**
 * WCAG contrast-based text colour choice (SPEC §5.10 recorded deviation:
 * "Header text colour chosen per fill for WCAG AA contrast — the
 * workbook's white text on `#FFC000` and on light tints fails contrast").
 * Not part of `lib/engine` — this is a rendering concern, not workbook
 * domain math.
 */

function hexToRgb01(hex: string): [number, number, number] {
  const clean = hex.replace(/^#/, "");
  return [
    parseInt(clean.slice(0, 2), 16) / 255,
    parseInt(clean.slice(2, 4), 16) / 255,
    parseInt(clean.slice(4, 6), 16) / 255,
  ];
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb01(hex).map((c) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4),
  );
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function contrastRatio(luminanceA: number, luminanceB: number): number {
  const lighter = Math.max(luminanceA, luminanceB);
  const darker = Math.min(luminanceA, luminanceB);
  return (lighter + 0.05) / (darker + 0.05);
}

const WHITE = "#FFFFFF";
const DARK = "#1A1A1A";

/** Picks white or near-black text, whichever contrasts better against `backgroundHex`. */
export function contrastTextColor(backgroundHex: string): string {
  const backgroundLuminance = relativeLuminance(backgroundHex);
  const whiteContrast = contrastRatio(backgroundLuminance, relativeLuminance(WHITE));
  const darkContrast = contrastRatio(backgroundLuminance, relativeLuminance(DARK));
  return whiteContrast >= darkContrast ? WHITE : DARK;
}
