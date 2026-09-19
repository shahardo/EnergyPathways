import type { ReactNode } from "react";
import type { Locale } from "@/lib/i18n/locales";

/**
 * Marks free text (barriers, roadmap steps, callouts) shown in Hebrew while
 * viewing in English, because no approved translation exists yet (SPEC
 * §5.10 rule 5, OQ-11). The wrapped text keeps its own Hebrew bidi run
 * inside the surrounding English (LTR) flow, mirroring how a Latin numeric
 * run is isolated inside Hebrew flow elsewhere in this component.
 */
export function HebrewSourceMark({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  return (
    <span className="inline-flex items-start gap-1">
      <span dir="rtl" lang="he">
        {children}
      </span>
      <span
        className="border-border text-muted-foreground shrink-0 rounded border px-1 text-[0.625rem] leading-normal"
        title={
          locale === "he"
            ? "אין תרגום מאושר לאנגלית עדיין"
            : "No approved English translation yet"
        }
      >
        HE
      </span>
    </span>
  );
}
