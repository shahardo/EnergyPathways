/**
 * F-104 trigger callout (DEV-PLAN T11, SPEC §5.8): a rounded warning note
 * anchored to one roadmap cell, overflowing toward the boundary of the
 * next phase rather than floating free of the grid. `role="note"`, and the
 * anchor cell references it via `aria-describedby` so the association
 * survives for assistive tech even though the box overlaps visually.
 */
import type { ReactNode } from "react";
import { contrastTextColor } from "@/lib/color";

export interface CalloutProps {
  id: string;
  text: ReactNode;
}

export const CALLOUT_FILL = "#5B9BD5";

export function Callout({ id, text }: CalloutProps) {
  return (
    <div
      id={id}
      role="note"
      // White text on this fill was 2.96:1, short of WCAG AA's 4.5:1 (the
      // axe accessibility gate caught it) -- contrastTextColor picks the
      // near-black alternative instead, 5.88:1, same as every other
      // fill-dependent text colour in the matrix (WorkbookMatrix.tsx).
      className="absolute inset-x-1 bottom-0 z-10 flex translate-y-1/2 items-start gap-1 rounded-md p-1.5 text-[0.65rem] shadow-md"
      style={{ background: CALLOUT_FILL, color: contrastTextColor(CALLOUT_FILL) }}
    >
      <span aria-hidden="true">⚠</span>
      <span>{text}</span>
    </div>
  );
}
