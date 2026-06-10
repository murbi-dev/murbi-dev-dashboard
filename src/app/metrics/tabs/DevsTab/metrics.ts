import { STATUS_MAPPING } from "@/lib/status-mapper";
import type { DashboardIssue } from "@/types/dashboard";

export type DeveloperMetrics = {
  name: string;
  avatarUrl?: string;
  total: number;
  active: number;
  done: number;
  hotfixes: number;
  qaRejections: number;
  byJiraStatus: Record<string, number>;
};

const technicalStatusOrder = [
  ...STATUS_MAPPING.Waiting,
  ...STATUS_MAPPING["In Development"],
  ...STATUS_MAPPING.Validation,
  ...STATUS_MAPPING.Finalizing,
  ...STATUS_MAPPING.Done
];

export function getOrderedJiraStatuses(issues: DashboardIssue[]): string[] {
  const statuses = new Set(issues.map((issue) => issue.jiraStatus));
  const orderedStatuses = technicalStatusOrder.filter((status) => statuses.has(status));
  const extraStatuses = Array.from(statuses)
    .filter((status) => !technicalStatusOrder.includes(status))
    .sort((a, b) => a.localeCompare(b, "pt-BR"));

  return [...orderedStatuses, ...extraStatuses];
}

export function buildDeveloperMetrics(issues: DashboardIssue[]): DeveloperMetrics[] {
  const metrics = new Map<string, DeveloperMetrics>();

  for (const issue of issues) {
    const name = issue.assignee.name || "Sem responsável";
    const current =
      metrics.get(name) ??
      ({
        name,
        avatarUrl: issue.assignee.avatarUrl,
        total: 0,
        active: 0,
        done: 0,
        hotfixes: 0,
        qaRejections: 0,
        byJiraStatus: {}
      } satisfies DeveloperMetrics);

    const isDone = issue.businessStatus === "Done";

    current.avatarUrl = current.avatarUrl ?? issue.assignee.avatarUrl;
    current.total += 1;
    current.active += isDone ? 0 : 1;
    current.done += isDone ? 1 : 0;
    current.hotfixes += issue.isHotfix ? 1 : 0;
    current.qaRejections += !isDone && issue.qaRejectionCount > 0 ? 1 : 0;
    current.byJiraStatus[issue.jiraStatus] = (current.byJiraStatus[issue.jiraStatus] ?? 0) + 1;

    metrics.set(name, current);
  }

  return Array.from(metrics.values()).sort((a, b) => {
    if (a.active !== b.active) {
      return b.active - a.active;
    }

    if (a.total !== b.total) {
      return b.total - a.total;
    }

    return a.name.localeCompare(b.name, "pt-BR");
  });
}
