/**
 * F-104 trigger callout (DEV-PLAN T11, SPEC §5.8): a rounded warning note
 * anchored to one roadmap cell, overflowing toward the boundary of the
 * next phase rather than floating free of the grid. `role="note"`, and the
 * anchor cell references it via `aria-describedby` so the association
 * survives for assistive tech even though the box overlaps visually.
 */
import type { ReactNode } from "react";

export interface CalloutProps {
  id: string;
  text: ReactNode;
}

export function Callout({ id, text }: CalloutProps) {
  return (
    <div
      id={id}
      role="note"
      className="absolute inset-x-1 bottom-0 z-10 flex translate-y-1/2 items-start gap-1 rounded-md p-1.5 text-[0.65rem] text-white shadow-md"
      style={{ background: "#5B9BD5" }}
    >
      <span aria-hidden="true">⚠</span>
      <span>{text}</span>
    </div>
  );
}
