"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useId } from "react";
import { LOCALES, type Locale } from "@/lib/i18n/locales";

/**
 * Flags are inline SVG rather than emoji (🇮🇱 / 🇬🇧) on purpose: Chrome and Edge
 * on Windows have no regional-indicator glyphs, so emoji flags degrade to the
 * bare letter pairs "IL" / "GB" for a large share of users.
 */
function FlagIsrael({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 40" className={className} aria-hidden focusable="false">
      <rect width="60" height="40" fill="#fff" />
      <rect y="5" width="60" height="5" fill="#0038b8" />
      <rect y="30" width="60" height="5" fill="#0038b8" />
      <path
        d="M30 12 L36.9 24 H23.1 Z M30 28 L23.1 16 H36.9 Z"
        fill="none"
        stroke="#0038b8"
        strokeWidth="1.6"
      />
    </svg>
  );
}

function FlagUnitedKingdom({ className }: { className?: string }) {
  // The diagonals' red stripes are offset per quadrant, so they are clipped
  // rather than drawn centred on the white saltire.
  const clipId = useId();
  return (
    <svg viewBox="0 0 60 40" className={className} aria-hidden focusable="false">
      <clipPath id={clipId}>
        <path d="M30 20 L60 20 L60 40 Z M30 20 L30 40 L0 40 Z M30 20 L0 20 L0 0 Z M30 20 L30 0 L60 0 Z" />
      </clipPath>
      <rect width="60" height="40" fill="#012169" />
      <path d="M0 0 L60 40 M60 0 L0 40" stroke="#fff" strokeWidth="8" />
      <path
        d="M0 0 L60 40 M60 0 L0 40"
        stroke="#c8102e"
        strokeWidth="5"
        clipPath={`url(#${clipId})`}
      />
      <path d="M30 0 V40 M0 20 H60" stroke="#fff" strokeWidth="13" />
      <path d="M30 0 V40 M0 20 H60" stroke="#c8102e" strokeWidth="8" />
    </svg>
  );
}

const LOCALE_LABEL: Record<Locale, string> = { he: "עברית", en: "English" };

/**
 * Preserves the current path and query string, swapping only the locale segment.
 * Only the locales you can switch *to* are shown — the active locale's own flag
 * is omitted, so the flag on screen always means "go here", never "you are here".
 */
export function LanguageSwitcher({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();

  return (
    <nav aria-label="Language" className="flex gap-3 text-sm">
      {LOCALES.filter((candidate) => candidate !== locale).map((candidate) => {
        const segments = pathname.split("/");
        segments[1] = candidate;
        const href = `${segments.join("/")}${query ? `?${query}` : ""}`;
        const Flag = candidate === "he" ? FlagIsrael : FlagUnitedKingdom;
        return (
          <Link
            key={candidate}
            href={href}
            aria-label={LOCALE_LABEL[candidate]}
            className="flex items-center gap-2 rounded px-2 py-1 underline-offset-4 hover:underline"
          >
            <Flag className="h-3.5 w-[21px] shrink-0 rounded-[1px] shadow-[0_0_0_1px_rgba(0,0,0,0.15)]" />
          </Link>
        );
      })}
    </nav>
  );
}
