export type FlowMetricsPayload = {
  dateRange: {
    start: string;
    end: string;
  };
  leadTime: {
    average: number;
    p50: number;
    p75: number;
    p90: number;
    totalIssues: number;
  } | null;
  aging: {
    average: number;
    over7Days: number;
    over14Days: number;
    over30Days: number;
    totalActiveIssues: number;
    criticalIssues: AgingIssue[];
  } | null;
};

export type AgingIssue = {
  key: string;
  summary: string;
  assignee: string;
  status: string;
  agingDays: number;
};
