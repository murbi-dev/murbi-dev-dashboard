import type { SeriesBucket, SeriesByGranularity } from "@/types/metrics-series";

export type QualityReworkDelivery = {
  key: string;
  summary: string;
  assignee: string;
  rejectionCount: number;
  currentStatus: string;
};

/**
 * One time bucket of the Quality series. `qualityRate` is `null` when nothing
 * was delivered in the bucket — a gap in the line, not a 0% nor a 100%.
 */
export type QualitySeriesPoint = SeriesBucket & {
  totalDeliveries: number;
  deliveriesWithRework: number;
  deliveriesWithoutRework: number;
  totalQaRejections: number;
  qualityRate: number | null;
};

export type QualityMetricsPayload = {
  dateRange: {
    start: string;
    end: string;
  };
  totalDeliveries: number;
  deliveriesWithRework: number;
  deliveriesWithoutRework: number;
  totalQaRejections: number;
  qualityRate: number;
  reworkDeliveries: QualityReworkDelivery[];
  /** Evolution of the indicators inside the range, at every granularity. */
  series: SeriesByGranularity<QualitySeriesPoint>;
};
