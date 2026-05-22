import type { DashboardIssue, IssueComplexity } from "@/types/dashboard";

const hourInMs = 60 * 60 * 1000;
const minuteInMs = 60 * 1000;

export type HotfixDeliveryEstimate = {
  estimateHours: number;
  dueAt: string;
};

export const hotfixDeliveryHoursByComplexity: Record<IssueComplexity, number> = {
  PP: 6,
  P: 12,
  M: 24,
  G: 48,
  GG: 72
};

const priorityOrder: Record<string, number> = {
  Highest: 0,
  High: 1,
  Medium: 2,
  Low: 3,
  Lowest: 4,
  Unknown: 5
};

type HotfixWithComplexity = DashboardIssue & { complexity: IssueComplexity };

function hasHotfixComplexity(issue: DashboardIssue): issue is HotfixWithComplexity {
  return issue.isHotfix && issue.businessStatus !== "Done" && Boolean(issue.complexity);
}

function sortHotfixQueue(a: DashboardIssue, b: DashboardIssue) {
  const priorityDiff = (priorityOrder[a.priority] ?? priorityOrder.Unknown) - (priorityOrder[b.priority] ?? priorityOrder.Unknown);

  if (priorityDiff !== 0) {
    return priorityDiff;
  }

  return new Date(a.statusChangedAt).getTime() - new Date(b.statusChangedAt).getTime();
}

export function getHotfixDeliveryHours(complexity: IssueComplexity): number {
  return hotfixDeliveryHoursByComplexity[complexity];
}

function formatCompactDuration(ms: number): string {
  const absoluteMs = Math.max(0, Math.abs(ms));

  if (absoluteMs < hourInMs) {
    return `${Math.max(1, Math.ceil(absoluteMs / minuteInMs))}m`;
  }

  return `${Math.max(1, Math.ceil(absoluteMs / hourInMs))}h`;
}

export function formatHotfixDeliveryEstimate(dueAtIso: string, now: Date = new Date()): string {
  const diff = new Date(dueAtIso).getTime() - now.getTime();
  const duration = formatCompactDuration(diff);

  return diff >= 0 ? `daqui ${duration}` : `${duration} atrasado`;
}

export function buildHotfixDeliveryEstimateByIssueId(
  issues: DashboardIssue[]
): Map<string, HotfixDeliveryEstimate> {
  const hotfixesByAssignee = issues.reduce((acc, issue) => {
    if (!hasHotfixComplexity(issue)) {
      return acc;
    }

    const assigneeHotfixes = acc.get(issue.assignee.name) ?? [];
    assigneeHotfixes.push(issue);
    acc.set(issue.assignee.name, assigneeHotfixes);

    return acc;
  }, new Map<string, HotfixWithComplexity[]>());
  const estimateByIssueId = new Map<string, HotfixDeliveryEstimate>();

  for (const assigneeHotfixes of hotfixesByAssignee.values()) {
    let cumulativeHours = 0;

    for (const issue of [...assigneeHotfixes].sort(sortHotfixQueue)) {
      cumulativeHours += getHotfixDeliveryHours(issue.complexity);
      estimateByIssueId.set(issue.id, {
        estimateHours: cumulativeHours,
        dueAt: new Date(new Date(issue.statusChangedAt).getTime() + cumulativeHours * hourInMs).toISOString()
      });
    }
  }

  return estimateByIssueId;
}
