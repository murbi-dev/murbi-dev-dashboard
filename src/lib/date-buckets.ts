/**
 * Date bucketing for the metrics time series.
 *
 * Splits a `[startDate, endDate]` range (both ISO `YYYY-MM-DD`, both inclusive)
 * into daily, weekly or monthly buckets.
 *
 * ## Rules
 *
 * - Everything is computed in **UTC**. Jira changelog timestamps carry a
 *   timezone, so anchoring the buckets to the server's local timezone would
 *   move a delivery to the neighbouring bucket depending on where the app runs.
 * - Weekly buckets start on **Monday** (ISO week) and are clipped to the
 *   selected range: the first and the last week may be partial.
 * - Monthly buckets are calendar months, also clipped to the range.
 * - An inverted range (`end` before `start`) produces no buckets.
 */

import type { SeriesBucket, SeriesGranularity } from "@/types/metrics-series";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const MONTH_ABBREVIATIONS = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez"
];

/**
 * Builds the buckets that cover the given range at the given granularity.
 *
 * @param startDate - Range start, ISO date (YYYY-MM-DD), inclusive.
 * @param endDate - Range end, ISO date (YYYY-MM-DD), inclusive.
 * @param granularity - Bucket size.
 * @returns Buckets ordered from oldest to newest.
 */
export function buildBuckets(
  startDate: string,
  endDate: string,
  granularity: SeriesGranularity
): SeriesBucket[] {
  const rangeStart = parseIsoDate(startDate);
  const rangeEnd = parseIsoDate(endDate);

  if (rangeStart === null || rangeEnd === null || rangeStart > rangeEnd) {
    return [];
  }

  const buckets: SeriesBucket[] = [];
  let cursor = rangeStart;

  while (cursor <= rangeEnd) {
    const bucketEnd = Math.min(getBucketEnd(cursor, granularity), rangeEnd);

    buckets.push({
      start: toIsoDate(cursor),
      end: toIsoDate(bucketEnd),
      label: buildLabel(cursor, granularity)
    });

    cursor = bucketEnd + MS_PER_DAY;
  }

  return buckets;
}

/**
 * Finds the bucket that contains the given instant.
 *
 * @param buckets - Buckets ordered from oldest to newest.
 * @param timestamp - Any date parseable by `Date`, usually an ISO timestamp
 *   coming from the Jira changelog.
 * @returns The bucket index, or `-1` when the instant falls outside the range.
 */
export function findBucketIndex(buckets: SeriesBucket[], timestamp: string | null): number {
  if (!timestamp) return -1;

  const time = new Date(timestamp).getTime();

  if (Number.isNaN(time)) return -1;

  /** Buckets are contiguous and ordered, so a binary search is enough. */
  let low = 0;
  let high = buckets.length - 1;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const bucketStart = parseIsoDate(buckets[middle].start);
    const bucketEnd = parseIsoDate(buckets[middle].end);

    if (bucketStart === null || bucketEnd === null) return -1;

    if (time < bucketStart) {
      high = middle - 1;
    } else if (time >= bucketEnd + MS_PER_DAY) {
      low = middle + 1;
    } else {
      return middle;
    }
  }

  return -1;
}

/**
 * Parses an ISO date (YYYY-MM-DD) as UTC midnight.
 *
 * @returns The epoch milliseconds, or `null` when the input is not a valid date.
 */
function parseIsoDate(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);

  if (!match) return null;

  const time = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));

  return Number.isNaN(time) ? null : time;
}

function toIsoDate(time: number): string {
  return new Date(time).toISOString().split("T")[0];
}

/**
 * Returns the last day (UTC midnight) of the bucket that starts at `start`.
 */
function getBucketEnd(start: number, granularity: SeriesGranularity): number {
  const date = new Date(start);

  if (granularity === "daily") {
    return start;
  }

  if (granularity === "weekly") {
    /** `getUTCDay()` is 0 for Sunday, so Monday-based weeks need the shift. */
    const weekDay = (date.getUTCDay() + 6) % 7;

    return start + (6 - weekDay) * MS_PER_DAY;
  }

  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0);
}

function buildLabel(start: number, granularity: SeriesGranularity): string {
  const date = new Date(start);
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");

  if (granularity === "monthly") {
    const year = String(date.getUTCFullYear()).slice(-2);

    return `${MONTH_ABBREVIATIONS[date.getUTCMonth()]}/${year}`;
  }

  return `${day}/${month}`;
}
