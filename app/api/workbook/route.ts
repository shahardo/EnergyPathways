import { NextResponse } from "next/server";
import { getWorkbookPayload } from "@/lib/db/queries";
import { errorResponse } from "@/lib/api/errors";

/**
 * SPEC §7: complete values + layout metadata + `dataset_version`. The
 * matrix renders from this single payload. Immutable-cached per version —
 * a re-ingestion changes `dataset_version`, which changes the URL nothing
 * else does, so this response can be cached forever.
 */
export function GET() {
  try {
    const payload = getWorkbookPayload();
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "public, max-age=31536000, immutable" },
    });
  } catch (error) {
    return errorResponse(
      500,
      "workbook_unavailable",
      "The workbook payload could not be loaded.",
      "לא ניתן היה לטעון את נתוני לוח המסלולים.",
      error instanceof Error ? error.message : undefined,
    );
  }
}
