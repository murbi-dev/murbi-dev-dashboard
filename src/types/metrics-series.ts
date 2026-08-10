/**
 * Time-series shapes shared by the Quality and Flow metrics.
 *
 * The chart granularity is resolved **server-side for all three options at
 * once**: percentiles and averages cannot be re-aggregated from daily buckets
 * without the raw values, and the Jira round-trip is expensive, so switching
 * granularity in the UI must not trigger a refetch.
 */

export type SeriesGranularity = "daily" | "weekly" | "monthly";

export const SERIES_GRANULARITIES: SeriesGranularity[] = ["daily", "weekly", "monthly"];

/** One time bucket of the selected date range. */
export type SeriesBucket = {
  /** Bucket start, ISO date (YYYY-MM-DD), inclusive. */
  start: string;
  /** Bucket end, ISO date (YYYY-MM-DD), inclusive. */
  end: string;
  /** Short pt-BR label ready for the chart axis (e.g. `10/08`, `ago/26`). */
  label: string;
};

/** The same series computed at every granularity the UI offers. */
export type SeriesByGranularity<TPoint> = Record<SeriesGranularity, TPoint[]>;
