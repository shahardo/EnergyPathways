"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { LOCALES, type Locale } from "@/lib/i18n/locales";

/** Preserves the current path and query string, swapping only the locale segment. */
export function LanguageSwitcher({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();

  return (
    <nav aria-label="Language" className="flex gap-3 text-sm">
      {LOCALES.map((candidate) => {
        const segments = pathname.split("/");
        segments[1] = candidate;
        const href = `${segments.join("/")}${query ? `?${query}` : ""}`;
        const current = candidate === locale;
        return (
          <Link
            key={candidate}
            href={href}
            aria-current={current ? "true" : undefined}
            className="rounded px-2 py-1 underline-offset-4 hover:underline aria-[current]:font-semibold aria-[current]:underline"
          >
            {candidate === "he" ? "עברית" : "English"}
          </Link>
        );
      })}
    </nav>
  );
}
