import type { AxisGroupId, Channel, Likelihood } from "@/lib/schemas/workbook";

const AXIS_PARAM = "axis";
const LIKELIHOOD_PARAM = "likelihood";
/** URL token for a blank likelihood cell (SPEC §5.10 rule 2: the workbook's own "-"). */
const LIKELIHOOD_NONE_TOKEN = "none";

export interface ColumnFilters {
  /** Empty set = no axis-group filter applied (every group visible). */
  axisGroups: ReadonlySet<AxisGroupId>;
  /** Empty set = no likelihood filter applied. `null` stands for a blank/"-" cell. */
  likelihoods: ReadonlySet<Likelihood>;
}

export const EMPTY_FILTERS: ColumnFilters = {
  axisGroups: new Set(),
  likelihoods: new Set(),
};

/** F-106 column filtering (DEV-PLAN T13): URL is the source of truth (SPEC §5.10's additive-toolbar deviation), so a reload restores the filter. */
export function parseColumnFilters(params: URLSearchParams): ColumnFilters {
  const axisRaw = params.get(AXIS_PARAM);
  const likelihoodRaw = params.get(LIKELIHOOD_PARAM);
  const axisGroups = new Set<AxisGroupId>(
    axisRaw ? (axisRaw.split(",").filter(Boolean) as AxisGroupId[]) : [],
  );
  const likelihoods = new Set<Likelihood>(
    likelihoodRaw
      ? likelihoodRaw
          .split(",")
          .filter(Boolean)
          .map((v) => (v === LIKELIHOOD_NONE_TOKEN ? null : (v as Likelihood)))
      : [],
  );
  return { axisGroups, likelihoods };
}

/** Inverse of `parseColumnFilters` -- an empty dimension is simply left out of the params. */
export function serializeColumnFilters(filters: ColumnFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.axisGroups.size > 0) {
    params.set(AXIS_PARAM, [...filters.axisGroups].join(","));
  }
  if (filters.likelihoods.size > 0) {
    params.set(
      LIKELIHOOD_PARAM,
      [...filters.likelihoods].map((v) => v ?? LIKELIHOOD_NONE_TOKEN).join(","),
    );
  }
  return params;
}

/** A channel is visible unless a filter dimension is active and excludes it. */
export function isChannelVisible(
  channel: Channel,
  likelihood: Likelihood,
  filters: ColumnFilters,
): boolean {
  if (filters.axisGroups.size > 0 && !filters.axisGroups.has(channel.axisGroupId)) {
    return false;
  }
  if (filters.likelihoods.size > 0 && !filters.likelihoods.has(likelihood)) {
    return false;
  }
  return true;
}

export function toggleSetMember<T>(set: ReadonlySet<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}
