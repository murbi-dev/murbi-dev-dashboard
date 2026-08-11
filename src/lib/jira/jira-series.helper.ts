/**
 * Metrics time series — turns the issues already fetched for the Quality and
 * Flow metrics into the evolution of each indicator over the selected range.
 *
 * ## Why it runs here and not in the browser
 *
 * The series are built from the very same issues that produce the headline
 * numbers, so they cost no extra Jira round-trip. All three granularities
 * (daily, weekly, monthly) are produced at once because a P50 cannot be
 * re-aggregated from daily P50s — the raw values are needed, and they only
 * exist server-side.
 *
 * ## Which date buckets each indicator
 *
 * | Indicator | Dated by |
 * |---|---|
 * | Entregas, retrabalho, QA rejections, Delivery Quality Rate | the Done transition |
 * | Lead Time (total, P50, IA, Humano) | the Done transition |
 * | Tempo de Planejamento (IA) | the **first** entry into the planning stage |
 * | Aging | the first entry into In Progress |
 *
 * Each indicator uses the same issue set as its headline card, so the chart
 * decomposes the number above it instead of telling a different story.
 *
 * ## Known limitations
 *
 * - An issue whose changelog was truncated by Jira has no dated transition and
 *   is therefore counted in the headline number but absent from the series.
 * - Aging is always measured against *now* (like the headline card), so a
 *   bucket shows "how old the cards started back then are today", not the WIP
 *   age as it was at the time.
 */

import { buildBuckets, findBucketIndex } from "@/lib/date-buckets";
import {
  calculateAging,
  calculatePlanningTime,
  calculateLeadTime,
  calculatePercentile,
  getFirstPlanningDate,
  getFirstInProgressDate,
  getStatusHistory,
  isAiDevIssue
} from "@/lib/jira/jira-flow.helper";
import { getQaRejectionCount } from "@/lib/jira/jira-metrics.helper";
import { JIRA_STATUS_ID } from "@/lib/status-mapper";
import { SERIES_GRANULARITIES, type SeriesByGranularity, type SeriesBucket } from "@/types/metrics-series";
import type { FlowSeriesPoint } from "@/types/flow";
import type { QualitySeriesPoint } from "@/types/quality";
import type { JiraIssue } from "@/types/jira";

/**
 * Returns the date this issue was delivered within the range.
 *
 * A card can be reopened and delivered again, so the first Done transition
 * inside the range is what dates the delivery. Falls back to the first Done
 * transition of all time, which keeps cards whose delivery happened at the very
 * edge of the range from disappearing.
 *
 * @returns ISO timestamp, or `null` when the changelog has no Done transition.
 */
export function getDeliveryDate(issue: JiraIssue, startDate: string, endDate: string): string | null {
  const history = getStatusHistory(issue);
  const rangeStart = new Date(`${startDate}T00:00:00.000Z`).getTime();
  const rangeEnd = new Date(`${endDate}T23:59:59.999Z`).getTime();
  let firstDone: string | null = null;

  for (const event of history) {
    if (event.toId !== JIRA_STATUS_ID.DONE) continue;

    firstDone ??= event.changedAt;

    const time = new Date(event.changedAt).getTime();

    if (time >= rangeStart && time <= rangeEnd) {
      return event.changedAt;
    }
  }

  return firstDone;
}

/**
 * Builds the Quality series (Delivery Quality Rate and its counters) for every
 * granularity.
 *
 * @param issues - The delivered issues already filtered by the service.
 * @param startDate - Range start, ISO date (YYYY-MM-DD).
 * @param endDate - Range end, ISO date (YYYY-MM-DD).
 */
export function buildQualitySeries(
  issues: JiraIssue[],
  startDate: string,
  endDate: string
): SeriesByGranularity<QualitySeriesPoint> {
  return buildForEveryGranularity(startDate, endDate, (buckets) => {
    const points = buckets.map<QualitySeriesPoint>((bucket) => ({
      ...bucket,
      totalDeliveries: 0,
      deliveriesWithRework: 0,
      deliveriesWithoutRework: 0,
      totalQaRejections: 0,
      qualityRate: null
    }));

    for (const issue of issues) {
      const index = findBucketIndex(buckets, getDeliveryDate(issue, startDate, endDate));

      if (index < 0) continue;

      const rejectionCount = getQaRejectionCount(issue);
      const point = points[index];

      point.totalDeliveries += 1;
      point.totalQaRejections += rejectionCount;

      if (rejectionCount > 0) {
        point.deliveriesWithRework += 1;
      } else {
        point.deliveriesWithoutRework += 1;
      }
    }

    for (const point of points) {
      point.qualityRate =
        point.totalDeliveries > 0
          ? Math.round((point.deliveriesWithoutRework / point.totalDeliveries) * 100)
          : null;
    }

    return points;
  });
}

/**
 * Builds the Flow series (Lead Time, Tempo de Planejamento and Aging) for every
 * granularity.
 *
 * @param input.doneIssues - Issues delivered within the range.
 * @param input.planningIssues - Every issue that may have passed through the
 *   planning stage (delivered plus active), matching the headline metric.
 * @param input.agingIssues - Active issues that started within the range,
 *   matching the headline Aging card.
 * @param input.devFlowFieldId - Dynamically resolved id of the `Fluxo Dev`
 *   field; without it no card is classified as AI.
 */
export function buildFlowSeries(input: {
  doneIssues: JiraIssue[];
  planningIssues: JiraIssue[];
  agingIssues: JiraIssue[];
  devFlowFieldId?: string;
  startDate: string;
  endDate: string;
}): SeriesByGranularity<FlowSeriesPoint> {
  const { doneIssues, planningIssues, agingIssues, devFlowFieldId, startDate, endDate } = input;

  return buildForEveryGranularity(startDate, endDate, (buckets) => {
    const leadTimes = buckets.map<number[]>(() => []);
    const aiLeadTimes = buckets.map<number[]>(() => []);
    const humanLeadTimes = buckets.map<number[]>(() => []);
    const planningTimes = buckets.map<number[]>(() => []);
    const agings = buckets.map<number[]>(() => []);
    const deliveries = buckets.map(() => 0);

    for (const issue of doneIssues) {
      const index = findBucketIndex(buckets, getDeliveryDate(issue, startDate, endDate));

      if (index < 0) continue;

      deliveries[index] += 1;

      const leadTime = calculateLeadTime(issue);

      if (leadTime === null) continue;

      leadTimes[index].push(leadTime);
      (isAiDevIssue(issue, devFlowFieldId) ? aiLeadTimes : humanLeadTimes)[index].push(leadTime);
    }

    for (const issue of planningIssues) {
      const index = findBucketIndex(buckets, getFirstPlanningDate(issue));

      if (index < 0) continue;

      const wait = calculatePlanningTime(issue);

      if (wait !== null) {
        planningTimes[index].push(wait);
      }
    }

    for (const issue of agingIssues) {
      const index = findBucketIndex(buckets, getFirstInProgressDate(issue));

      if (index < 0) continue;

      const aging = calculateAging(issue);

      if (aging !== null) {
        agings[index].push(aging);
      }
    }

    return buckets.map<FlowSeriesPoint>((bucket, index) => ({
      ...bucket,
      leadTimeAverage: average(leadTimes[index]),
      leadTimeP50: median(leadTimes[index]),
      leadTimeAiAverage: average(aiLeadTimes[index]),
      leadTimeHumanAverage: average(humanLeadTimes[index]),
      planningTimeAverage: average(planningTimes[index]),
      agingAverage: average(agings[index]),
      deliveries: deliveries[index]
    }));
  });
}

/**
 * Runs the same builder once per granularity.
 */
function buildForEveryGranularity<TPoint>(
  startDate: string,
  endDate: string,
  build: (buckets: SeriesBucket[]) => TPoint[]
): SeriesByGranularity<TPoint> {
  const series = {} as SeriesByGranularity<TPoint>;

  for (const granularity of SERIES_GRANULARITIES) {
    series[granularity] = build(buildBuckets(startDate, endDate, granularity));
  }

  return series;
}

/**
 * @returns The average rounded to 1 decimal, or `null` for an empty bucket —
 *   a bucket with no data is a gap in the line, never a zero.
 */
function average(values: number[]): number | null {
  if (values.length === 0) return null;

  return roundTo1(values.reduce((accumulator, value) => accumulator + value, 0) / values.length);
}

/**
 * @returns The P50 of the bucket, or `null` when the bucket is empty.
 */
function median(values: number[]): number | null {
  if (values.length === 0) return null;

  return calculatePercentile([...values].sort((a, b) => a - b), 50);
}

function roundTo1(value: number): number {
  return Math.round(value * 10) / 10;
}
