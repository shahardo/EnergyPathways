import { NextResponse } from "next/server";

/** SPEC §7 error shape: `{ error: { code, message_en, message_he, details? } }`. */
export function errorResponse(
  status: number,
  code: string,
  messageEn: string,
  messageHe: string,
  details?: unknown,
) {
  return NextResponse.json(
    {
      error: {
        code,
        message_en: messageEn,
        message_he: messageHe,
        ...(details !== undefined ? { details } : {}),
      },
    },
    { status },
  );
}
