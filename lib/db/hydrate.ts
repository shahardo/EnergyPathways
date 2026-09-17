import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import type { WorkbookPayload } from "@/lib/schemas/workbook";
import * as schema from "./schema";

/** Loads a validated snapshot into (already-migrated) tables, replacing whatever was there. */
export function hydrateFromSnapshot(
  db: BetterSQLite3Database<typeof schema>,
  snapshot: WorkbookPayload,
): void {
  db.transaction((tx) => {
    for (const table of [
      schema.subScores,
      schema.dimensionAverages,
      schema.trajectories,
      schema.channelText,
      schema.roadmapItems,
      schema.callouts,
      schema.ramp,
      schema.axisGroups,
      schema.rowLabels,
      schema.colorScaleRules,
      schema.sparklineSpecs,
      schema.phaseBands,
      schema.channels,
      schema.datasetMeta,
    ]) {
      tx.delete(table).run();
    }

    tx.insert(schema.datasetMeta).values(snapshot.datasetMeta).run();
    if (snapshot.channels.length > 0)
      tx.insert(schema.channels).values(snapshot.channels).run();
    if (snapshot.subScores.length > 0)
      tx.insert(schema.subScores).values(snapshot.subScores).run();
    if (snapshot.dimensionAverages.length > 0) {
      tx.insert(schema.dimensionAverages).values(snapshot.dimensionAverages).run();
    }
    if (snapshot.trajectories.length > 0) {
      tx.insert(schema.trajectories).values(snapshot.trajectories).run();
    }
    if (snapshot.channelText.length > 0) {
      tx.insert(schema.channelText).values(snapshot.channelText).run();
    }
    if (snapshot.roadmapItems.length > 0) {
      tx.insert(schema.roadmapItems).values(snapshot.roadmapItems).run();
    }
    if (snapshot.callouts.length > 0)
      tx.insert(schema.callouts).values(snapshot.callouts).run();
    if (snapshot.ramp.length > 0) tx.insert(schema.ramp).values(snapshot.ramp).run();
    if (snapshot.axisGroups.length > 0) {
      tx.insert(schema.axisGroups).values(snapshot.axisGroups).run();
    }
    if (snapshot.rowLabels.length > 0)
      tx.insert(schema.rowLabels).values(snapshot.rowLabels).run();
    if (snapshot.colorScaleRules.length > 0) {
      tx.insert(schema.colorScaleRules).values(snapshot.colorScaleRules).run();
    }
    if (snapshot.sparklineSpecs.length > 0) {
      tx.insert(schema.sparklineSpecs).values(snapshot.sparklineSpecs).run();
    }
    if (snapshot.phaseBands.length > 0) {
      tx.insert(schema.phaseBands).values(snapshot.phaseBands).run();
    }
  });
}
