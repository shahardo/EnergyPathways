"use client";

import { useRef, type RefObject } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  MILESTONE_YEARS,
  SUB_SCORE_KEYS,
  type Channel,
  type Dimension,
  type TrajectoryMetric,
  type WorkbookPayload,
} from "@/lib/schemas/workbook";
import type { Locale } from "@/lib/i18n/locales";
import { useFormat } from "@/lib/i18n/useFormat";
import { resolveFreeText } from "@/lib/i18n/freeText";
import type { DimensionColorScales } from "./scoreRows";
import { DIMENSIONS } from "./scoreRows";
import { HebrewSourceMark } from "./HebrewSourceMark";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const DIMENSION_LABEL: Record<Dimension, Record<Locale, string>> = {
  security: { he: "ביטחון", en: "Security" },
  environment: { he: "סביבה", en: "Environment" },
  equity: { he: "שוויון", en: "Equity" },
};
const TRAJECTORY_LABEL: Record<TrajectoryMetric, Record<Locale, string>> = {
  generation: { he: "ייצור (TWh)", en: "Generation (TWh)" },
  emissions: { he: "פליטות (MtCO₂e)", en: "Emissions (MtCO₂e)" },
  price_impact: { he: "השפעת מחיר", en: "Price-impact index" },
};
const TRAJECTORY_DIMENSION: Record<TrajectoryMetric, Dimension> = {
  generation: "security",
  emissions: "environment",
  price_impact: "equity",
};
const PHASE_LABEL: Record<string, string> = {
  "2025-2030": "2025–2030",
  "2030-2040": "2030–2040",
  "2040-2050": "2040–2050",
};
const ROADMAP_KIND_LABEL: Record<string, Record<Locale, string>> = {
  target: { he: "יעד", en: "Target" },
  step: { he: "צעד", en: "Step" },
  impact: { he: "אימפקט", en: "Impact" },
};

/** A superscript cell-reference badge -- provenance for one figure (NFR-5/6): the cell ref plus, via `title`, the dataset version. */
function CellRef({
  cellRef,
  datasetVersion,
}: {
  cellRef: string;
  datasetVersion: string;
}) {
  return (
    <span
      dir="ltr"
      className="text-muted-foreground ms-1 align-super text-[0.6rem]"
      title={`${cellRef} · ${datasetVersion}`}
    >
      {cellRef}
    </span>
  );
}

function FreeText({
  locale,
  he,
  en,
}: {
  locale: Locale;
  he: string | null;
  en: string | null;
}) {
  const resolved = resolveFreeText(locale, he, en);
  if (!resolved) return null;
  return resolved.isHebrewSource ? (
    <HebrewSourceMark locale={locale}>{resolved.text}</HebrewSourceMark>
  ) : (
    <>{resolved.text}</>
  );
}

export interface ChannelDrawerProps {
  payload: WorkbookPayload;
  channel: Channel | null;
  locale: Locale;
  colorScales: DimensionColorScales;
  /** The grid cell that opened the drawer -- focus is restored to it on close (see the component doc comment). */
  triggerRef: RefObject<HTMLElement | null>;
  onOpenChange: (open: boolean) => void;
}

/**
 * F-105 channel detail drawer (DEV-PLAN T12): opened from a channel's name
 * cell (WorkbookMatrix.tsx wires the click/Enter handler). Built on the
 * shadcn `Sheet` (Radix `Dialog` underneath), which traps focus and
 * restores it to the trigger on close -- no custom focus-trap logic needed
 * here. `<Sheet>`/`<SheetContent>` must stay mounted continuously with
 * `open` toggling visibility, not be conditionally rendered/unmounted from
 * outside: Radix's focus-restore and close-animation timing are keyed to
 * its own mount lifecycle, so unmounting `SheetContent` the moment
 * `channel` goes back to `null` breaks focus restoration (verified with
 * Playwright: `document.activeElement` ended up on `<body>`, not the
 * trigger cell, until this was fixed). `displayedChannelRef` keeps
 * rendering the last-open channel's data during the close transition.
 */
export function ChannelDrawer({
  payload,
  channel: selectedChannel,
  locale,
  colorScales,
  triggerRef,
  onOpenChange,
}: ChannelDrawerProps) {
  const format = useFormat(locale);
  const datasetVersion = payload.datasetMeta.datasetVersion;

  const displayedChannelRef = useRef<Channel | null>(null);
  if (selectedChannel) displayedChannelRef.current = selectedChannel;
  const displayedChannel = displayedChannelRef.current;

  if (!displayedChannel) {
    return <Sheet open={false} onOpenChange={onOpenChange} />;
  }
  // Named `channel` for the JSX below: the last-open channel, which may
  // briefly outlive `selectedChannel` going back to `null` while the close
  // animation plays (see the doc comment above).
  const channel = displayedChannel;

  const name = locale === "he" ? channel.nameHe : channel.nameEn;

  const averages = DIMENSIONS.map((dimension) => {
    const avg = payload.dimensionAverages.find(
      (d) => d.channelId === channel.channelId && d.dimension === dimension,
    );
    return {
      dimension,
      label: DIMENSION_LABEL[dimension][locale],
      value: avg?.value ?? null,
      cellRef: avg?.cellRef,
    };
  });
  const radarData = averages.map((a) => ({ label: a.label, value: a.value ?? 0 }));

  const subScoreRows = DIMENSIONS.flatMap((dimension) =>
    SUB_SCORE_KEYS.filter((key) =>
      payload.subScores.some(
        (s) =>
          s.channelId === channel.channelId && s.dimension === dimension && s.key === key,
      ),
    ).map((key) => {
      const sub = payload.subScores.find(
        (s) =>
          s.channelId === channel.channelId && s.dimension === dimension && s.key === key,
      )!;
      const rowLabel = payload.rowLabels.find((r) => r.key === `${dimension}.${key}`);
      const background =
        sub.value !== null
          ? (colorScales.colorForCell(dimension, channel.columnLetter, sub.cellRef) ??
            "#A6A6A6")
          : "#A6A6A6";
      return { dimension, key, sub, rowLabel, background };
    }),
  );

  const trajectoryMetrics: TrajectoryMetric[] = [
    "generation",
    "emissions",
    "price_impact",
  ];

  const channelRoadmapItems = payload.roadmapItems
    .filter((i) => i.channelId === channel.channelId)
    .sort((a, b) => {
      if (a.phase !== b.phase) return a.phase.localeCompare(b.phase);
      if (a.kind !== b.kind) return a.kind.localeCompare(b.kind);
      return a.slot - b.slot;
    });
  const channelCallouts = payload.callouts.filter(
    (c) => c.channelId === channel.channelId,
  );

  return (
    <Sheet open={Boolean(selectedChannel)} onOpenChange={onOpenChange}>
      <SheetContent
        aria-describedby={undefined}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          triggerRef.current?.focus();
        }}
      >
        <SheetHeader>
          <SheetTitle className="text-xl">{name}</SheetTitle>
          <SheetDescription>
            <span dir="ltr">{channel.columnLetter}</span> ·{" "}
            {channel.potentialRaw !== null ? (
              <span dir="ltr">{channel.potentialRaw}</span>
            ) : locale === "he" ? (
              "אין פוטנציאל"
            ) : (
              "no potential"
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-6 px-4 pb-4">
          {/* Trilemma radar (SPEC's three dimension averages) + accessible table */}
          <section aria-labelledby="drawer-radar-heading">
            <h3 id="drawer-radar-heading" className="mb-2 text-sm font-bold">
              {locale === "he" ? "טרילמה" : "Trilemma"}
            </h3>
            <div style={{ width: "100%", height: 220 }}>
              <ResponsiveContainer>
                <RadarChart data={radarData} outerRadius="75%">
                  <PolarGrid />
                  <PolarAngleAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <Radar
                    dataKey="value"
                    stroke="#5B9BD5"
                    fill="#5B9BD5"
                    fillOpacity={0.4}
                    isAnimationActive={false}
                  />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{locale === "he" ? "ממד" : "Dimension"}</TableHead>
                  <TableHead>{locale === "he" ? "ציון" : "Score"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {averages.map((a) => (
                  <TableRow key={a.dimension}>
                    <TableCell>{a.label}</TableCell>
                    <TableCell>
                      <span dir="ltr">{format.score(a.value) ?? "—"}</span>
                      {a.cellRef && (
                        <CellRef cellRef={a.cellRef} datasetVersion={datasetVersion} />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>

          {/* All 15 sub-scores, coloured per the same scale as the matrix */}
          <section aria-labelledby="drawer-subscores-heading">
            <h3 id="drawer-subscores-heading" className="mb-2 text-sm font-bold">
              {locale === "he" ? "תת-ציונים" : "Sub-scores"}
            </h3>
            <Table>
              <TableBody>
                {subScoreRows.map(({ dimension, key, sub, rowLabel, background }) => (
                  <TableRow key={`${dimension}-${key}`}>
                    <TableCell>
                      {rowLabel
                        ? locale === "he"
                          ? rowLabel.labelHe
                          : rowLabel.labelEn
                        : key}
                    </TableCell>
                    <TableCell>
                      <span
                        className="inline-block rounded px-2 py-0.5 text-center text-xs font-medium"
                        style={{ background, minWidth: "2.5rem" }}
                      >
                        <span dir="ltr">{format.score(sub.value) ?? "—"}</span>
                      </span>
                      <CellRef cellRef={sub.cellRef} datasetVersion={datasetVersion} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>

          {/* Three full-size trajectory charts on a true time axis (SPEC §5.5's drawer note) */}
          <section aria-labelledby="drawer-trajectories-heading">
            <h3 id="drawer-trajectories-heading" className="mb-2 text-sm font-bold">
              {locale === "he"
                ? "מסלולי מגמה (ציר זמן אמיתי)"
                : "Trajectories (true time axis)"}
            </h3>
            <div className="flex flex-col gap-4">
              {trajectoryMetrics.map((metric) => {
                const points = payload.trajectories.filter(
                  (t) => t.channelId === channel.channelId && t.metric === metric,
                );
                const chartData = MILESTONE_YEARS.map((year) => {
                  const point = points.find((p) => p.year === year);
                  return { year, value: point?.value ?? null };
                });
                return (
                  <div key={metric}>
                    <div className="mb-1 text-xs font-semibold">
                      {TRAJECTORY_LABEL[metric][locale]}
                    </div>
                    <div style={{ width: "100%", height: 140 }}>
                      <ResponsiveContainer>
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="year"
                            type="number"
                            domain={[2025, 2050]}
                            ticks={[...MILESTONE_YEARS]}
                          />
                          <YAxis width={40} tick={{ fontSize: 10 }} />
                          <Tooltip />
                          <Line
                            type="monotone"
                            dataKey="value"
                            stroke={
                              TRAJECTORY_DIMENSION[metric] === "security"
                                ? "#5B9BD5"
                                : TRAJECTORY_DIMENSION[metric] === "environment"
                                  ? "#70AD47"
                                  : "#ED7D31"
                            }
                            connectNulls
                            isAnimationActive={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {MILESTONE_YEARS.map((year) => (
                            <TableHead key={year}>
                              <span dir="ltr">{year}</span>
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          {chartData.map((d, i) => (
                            <TableCell key={d.year}>
                              <span dir="ltr">
                                {format.trajectoryValue(d.value) ?? "—"}
                              </span>
                              {points[i] && (
                                <CellRef
                                  cellRef={points[i]!.cellRef}
                                  datasetVersion={datasetVersion}
                                />
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Complete roadmap for this channel */}
          <section aria-labelledby="drawer-roadmap-heading">
            <h3 id="drawer-roadmap-heading" className="mb-2 text-sm font-bold">
              {locale === "he" ? "מפת דרכים" : "Roadmap"}
            </h3>
            {channelRoadmapItems.length === 0 ? (
              <p className="text-muted-foreground text-xs">
                {locale === "he" ? "אין נתוני מפת דרכים" : "No roadmap data"}
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {channelRoadmapItems.map((item) => (
                  <li
                    key={`${item.phase}-${item.kind}-${item.slot}`}
                    className="rounded border p-2 text-xs"
                  >
                    <div className="text-muted-foreground mb-1 flex gap-2 font-semibold">
                      <span dir="ltr">{PHASE_LABEL[item.phase]}</span>
                      <span>{ROADMAP_KIND_LABEL[item.kind]?.[locale]}</span>
                    </div>
                    {item.titleHe && (
                      <div className="font-bold">
                        <FreeText locale={locale} he={item.titleHe} en={item.titleEn} />
                      </div>
                    )}
                    {item.detailHe && (
                      <div>
                        <FreeText locale={locale} he={item.detailHe} en={item.detailEn} />
                      </div>
                    )}
                    {item.challengesHe && (
                      <div>
                        <strong>אתגרים:</strong>{" "}
                        <FreeText
                          locale={locale}
                          he={item.challengesHe}
                          en={item.challengesEn}
                        />
                      </div>
                    )}
                    <div className="text-muted-foreground mt-1">
                      {item.cellRefs.map((ref) => (
                        <CellRef
                          key={ref}
                          cellRef={ref}
                          datasetVersion={datasetVersion}
                        />
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Callouts for this channel */}
          {channelCallouts.length > 0 && (
            <section aria-labelledby="drawer-callouts-heading">
              <h3 id="drawer-callouts-heading" className="mb-2 text-sm font-bold">
                {locale === "he" ? "התראות" : "Callouts"}
              </h3>
              <ul className="flex flex-col gap-2">
                {channelCallouts.map((c) => (
                  <li
                    key={c.calloutId}
                    className="flex items-start gap-1 rounded-md p-2 text-xs text-white"
                    style={{ background: "#5B9BD5" }}
                  >
                    <span aria-hidden="true">⚠</span>
                    <span>
                      <FreeText locale={locale} he={c.textHe} en={c.textEn} />
                      <CellRef cellRef={c.anchorCell} datasetVersion={datasetVersion} />
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Recovered parameters (SPEC §3.5), explicitly marked derived */}
          <section aria-labelledby="drawer-recovered-heading">
            <h3 id="drawer-recovered-heading" className="mb-2 text-sm font-bold">
              {locale === "he" ? "פרמטרים משוחזרים" : "Recovered parameters"}
            </h3>
            <p className="text-muted-foreground mb-2 text-xs">
              {locale === "he"
                ? "משוחזר מהמגמות השמורות, אינו ערך גולמי בחוברת."
                : "Derived from the stored trajectories, not a raw workbook value."}
            </p>
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell>CF</TableCell>
                  <TableCell>
                    {/* format.score rounds to 1 decimal (SPEC §3.5's "snapped to
                        the nearest 0.1"), which also papers over IEEE754
                        representation error in the stored value (e.g. 0.6
                        stored as 0.6000000000000001). */}
                    <span dir="ltr">{format.score(channel.cf) ?? "—"}</span>
                    {!channel.paramsRecovered && (
                      <span className="text-destructive ms-2 text-xs">
                        {locale === "he" ? "לא אומת" : "unverified"}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>CI (gCO₂e/kWh)</TableCell>
                  <TableCell>
                    <span dir="ltr">{channel.ciGPerKwh ?? "—"}</span>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </section>

          <p className="text-muted-foreground text-[0.65rem]">
            {locale === "he" ? "גרסת נתונים" : "Dataset version"}:{" "}
            <span dir="ltr">{datasetVersion}</span>
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
