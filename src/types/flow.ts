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
   * Time cards spent waiting in the "Aprovação" gate (PRD approval).
   * This gate is exclusive to the AI flow (`Dev IA`), so this metric is
   * inherently AI-only.
   */
  approvalWait: FlowStats;
};

export type AgingIssue = {
  key: string;
  summary: string;
  assignee: string;
  status: string;
  agingDays: number;
  isAiDev: boolean;
};
