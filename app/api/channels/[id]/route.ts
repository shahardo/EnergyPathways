import { NextResponse } from "next/server";
import { getChannel } from "@/lib/db/queries";
import { channelIdSchema } from "@/lib/schemas/workbook";
import { errorResponse } from "@/lib/api/errors";

/** SPEC §7: one column in full, with cell references (F-105). */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const parsedId = channelIdSchema.safeParse(id);
  if (!parsedId.success) {
    return errorResponse(
      422,
      "invalid_channel_id",
      `"${id}" is not a known channel id.`,
      `"${id}" אינו מזהה תעלה מוכר.`,
      parsedId.error.issues,
    );
  }

  try {
    const channel = getChannel(parsedId.data);
    return NextResponse.json(channel, {
      headers: { "Cache-Control": "public, max-age=31536000, immutable" },
    });
  } catch (error) {
    return errorResponse(
      404,
      "channel_not_found",
      `Channel "${id}" was not found.`,
      `התעלה "${id}" לא נמצאה.`,
      error instanceof Error ? error.message : undefined,
    );
  }
}
