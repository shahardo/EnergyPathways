import {
  workbookPayloadSchema,
  type ChannelId,
  type WorkbookPayload,
} from "@/lib/schemas/workbook";
import { getDb } from "./client";
import * as schema from "./schema";

/**
 * Assembles the full `/api/workbook` payload in one read (SPEC §7, T4).
 * Table rows are typed loosely by Drizzle (`dimension`/`likelihood`/etc.
 * are plain `text` columns); `workbookPayloadSchema.parse` is what turns
 * them back into the narrow domain types, and is the actual round-trip
 * guarantee T4 asks for — a mismatch here is a thrown ZodError, not a
 * silently wrong payload.
 */
export function getWorkbookPayload(): WorkbookPayload {
  const db = getDb();

  const [datasetMetaRow] = db.select().from(schema.datasetMeta).all();
  if (!datasetMetaRow) {
    throw new Error(
      "getWorkbookPayload: dataset_meta is empty — has the workbook been ingested?",
    );
  }

  const payload = {
    datasetMeta: datasetMetaRow,
    channels: db.select().from(schema.channels).all(),
    subScores: db.select().from(schema.subScores).all(),
    dimensionAverages: db.select().from(schema.dimensionAverages).all(),
    trajectories: db.select().from(schema.trajectories).all(),
    channelText: db.select().from(schema.channelText).all(),
    roadmapItems: db.select().from(schema.roadmapItems).all(),
    callouts: db.select().from(schema.callouts).all(),
    ramp: db.select().from(schema.ramp).all(),
    axisGroups: db.select().from(schema.axisGroups).all(),
    rowLabels: db.select().from(schema.rowLabels).all(),
    colorScaleRules: db.select().from(schema.colorScaleRules).all(),
    trilemmaColorScale: db.select().from(schema.trilemmaColorScale).all()[0] ?? null,
    sparklineSpecs: db.select().from(schema.sparklineSpecs).all(),
    phaseBands: db.select().from(schema.phaseBands).all(),
  };

  return workbookPayloadSchema.parse(payload);
}

/** One column in full, with cell references (F-105, SPEC §7 `/api/channels/:id`). */
export function getChannel(channelId: ChannelId): WorkbookPayload["channels"][number] & {
  subScores: WorkbookPayload["subScores"];
  dimensionAverages: WorkbookPayload["dimensionAverages"];
  trajectories: WorkbookPayload["trajectories"];
  channelText: WorkbookPayload["channelText"][number] | undefined;
  roadmapItems: WorkbookPayload["roadmapItems"];
  callouts: WorkbookPayload["callouts"];
} {
  const payload = getWorkbookPayload();
  const channel = payload.channels.find((c) => c.channelId === channelId);
  if (!channel) throw new Error(`getChannel: unknown channel "${channelId}"`);

  return {
    ...channel,
    subScores: payload.subScores.filter((s) => s.channelId === channelId),
    dimensionAverages: payload.dimensionAverages.filter((d) => d.channelId === channelId),
    trajectories: payload.trajectories.filter((t) => t.channelId === channelId),
    channelText: payload.channelText.find((t) => t.channelId === channelId),
    roadmapItems: payload.roadmapItems.filter((r) => r.channelId === channelId),
    callouts: payload.callouts.filter((c) => c.channelId === channelId),
  };
}
