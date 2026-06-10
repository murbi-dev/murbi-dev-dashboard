export type QualityReworkDelivery = {
  key: string;
  summary: string;
  assignee: string;
  rejectionCount: number;
  currentStatus: string;
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
};
