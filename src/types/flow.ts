import type { SeriesBucket, SeriesByGranularity } from "@/types/metrics-series";

export type FlowStats = {
  average: number;
  p50: number;
  p75: number;
  p90: number;
  totalIssues: number;
} | null;

/**
 * A metric split by dev flow: `ai` = cards with `Fluxo Dev = Dev IA`,
 * `human` = everyone else.
 */
export type FlowByDevType = {
  ai: FlowStats;
  human: FlowStats;
};

export type FlowMetricsPayload = {
  dateRange: {
    start: string;
    end: string;
  };
  leadTime: FlowStats;
  leadTimeByFlow: FlowByDevType;
  aging: {
    average: number;
    over7Days: number;
    over14Days: number;
    over30Days: number;
    totalActiveIssues: number;
    criticalIssues: AgingIssue[];
  } | null;
  agingByFlow: FlowByDevType;
  /**
   * Time cards spent waiting on a person in the "Aprovação PRD/Spec" gate.
   * This gate is exclusive to the AI flow (`Dev IA`), so this metric is
   * inherently AI-only.
   */
  approvalWait: FlowStats;
  /** Evolution of the indicators inside the range, at every granularity. */
  series: SeriesByGranularity<FlowSeriesPoint>;
};

/**
 * One time bucket of the Flow series. Every value is `null` when the bucket has
 * no card feeding that indicator — a gap in the line, never a zero.
 */
export type FlowSeriesPoint = SeriesBucket & {
  leadTimeAverage: number | null;
  leadTimeP50: number | null;
  leadTimeAiAverage: number | null;
  leadTimeHumanAverage: number | null;
  approvalWaitAverage: number | null;
  agingAverage: number | null;
  deliveries: number;
};

export type AgingIssue = {
  key: string;
  summary: string;
  assignee: string;
  status: string;
  agingDays: number;
  isAiDev: boolean;
};
