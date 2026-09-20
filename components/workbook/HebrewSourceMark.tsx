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
        // Solid white background, not a transparent one over the
        // `text-muted-foreground` token: this badge sits on whichever
        // ambient fill surrounds it -- a roadmap phase-band body, a
        // drawer background, or T11's #5B9BD5 callout -- and no single
        // text colour clears 4.5:1 against all of those (the axe
        // accessibility gate caught #404040 failing on the callout's
        // blue, 3.5:1, right after it had fixed the same badge's contrast
        // on the lightest phase-band fill). Owning its own opaque
        // background makes the badge's contrast self-contained instead of
        // dependent on whatever it happens to be layered over.
        className="shrink-0 rounded border border-current bg-white px-1 text-[0.625rem] leading-normal text-[#404040]"
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
