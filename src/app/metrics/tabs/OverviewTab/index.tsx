"use client";

import { useDashboard } from "@/hooks/use-dashboard";
import type { DashboardIssue } from "@/types/dashboard";
import { DashboardSummaryCards } from "../../components/DashboardSummaryCards";
import { FlowDistributionBar } from "../../components/FlowDistributionBar";
import { BottlenecksSection } from "../../components/BottlenecksSection";
import { TopAssigneesTable } from "../../components/TopAssigneesTable";
import { AlertsSection } from "../../components/AlertsSection";
import { HealthStatus } from "../../components/HealthStatus";
import { buildDeveloperMetrics, getOrderedJiraStatuses } from "../DevsTab/metrics";
import { Skeleton } from "@/components/ui/Skeleton";

function computeStatusDistribution(issues: DashboardIssue[], orderedStatuses: string[]) {
  const byJiraStatus: Record<string, number> = {};
  for (const issue of issues) {
    byJiraStatus[issue.jiraStatus] = (byJiraStatus[issue.jiraStatus] ?? 0) + 1;
  }
  return orderedStatuses.map((status) => ({
    status,
    count: byJiraStatus[status] ?? 0
  }));
}

function OverviewSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
      </div>
      <Skeleton className="h-32" />
      <div className="grid gap-3 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Skeleton className="h-64" />
        <Skeleton className="h-32" />
      </div>
      <Skeleton className="h-20" />
    </div>
  );
}

export function OverviewTab() {
  const { data, isLoading } = useDashboard();

  if (isLoading) return <OverviewSkeleton />;

  const issues = data?.issues ?? [];
  const developers = buildDeveloperMetrics(issues);
  const doneCards = issues.filter((issue) => issue.businessStatus === "Done").length;
  const activeCards = issues.length - doneCards;
  const hotfixes = issues.filter((issue) => issue.isHotfix).length;

  const orderedStatuses = getOrderedJiraStatuses(issues);
  const statusDistribution = computeStatusDistribution(issues, orderedStatuses);

  const statusWithMostItems = [...statusDistribution]
    .filter((s) => s.status !== "Concluído")
    .sort((a, b) => b.count - a.count)[0] ?? null;

  const assigneesByActive = [...developers].sort((a, b) => b.active - a.active);
  const topAssigneeByActive = assigneesByActive.length > 0 ? assigneesByActive[0] : null;
  const topAssigneeByInDevelopment = [...developers]
    .filter((d) => d.inDevelopment > 0)
    .sort((a, b) => b.inDevelopment - a.inDevelopment)[0] ?? null;
  const topAssigneeByHotfix = [...developers]
    .filter((d) => d.hotfixes > 0)
    .sort((a, b) => b.hotfixes - a.hotfixes)[0] ?? null;

  const prWaiting = statusDistribution.find((s) => s.status === "Pull request")?.count ?? 0;
  const qaWaitingStatuses = ["Pronto para QA", "Teste QA"];
  const qaWaiting = statusDistribution
    .filter((s) => qaWaitingStatuses.includes(s.status))
    .reduce((sum, s) => sum + s.count, 0);
  const prodWaiting = statusDistribution.find((s) => s.status === "Pronto para PROD")?.count ?? 0;

  const alerts: Array<{ type: "warning" | "info"; message: string }> = [];

  if (prWaiting > 0) {
    alerts.push({
      type: prWaiting > 10 ? "warning" : "info",
      message: `${prWaiting} ${prWaiting === 1 ? "item aguardando" : "itens aguardando"} Pull Request`
    });
  }

  if (hotfixes > 0) {
    alerts.push({
      type: hotfixes > 5 ? "warning" : "info",
      message: `${hotfixes} HOTFIX ${hotfixes === 1 ? "identificado" : "identificados"}`
    });
  }

  if (qaWaiting > 0) {
    alerts.push({
      type: qaWaiting > 8 ? "warning" : "info",
      message: `${qaWaiting} ${qaWaiting === 1 ? "item aguardando" : "itens aguardando"} QA`
    });
  }

  if (prodWaiting > 0) {
    alerts.push({
      type: prodWaiting > 5 ? "warning" : "info",
      message: `${prodWaiting} ${prodWaiting === 1 ? "item pronto para" : "itens prontos para"} produção`
    });
  }

  if (topAssigneeByActive && topAssigneeByActive.active > 10) {
    alerts.push({
      type: "warning",
      message: `${topAssigneeByActive.name} possui ${topAssigneeByActive.active} itens ativos`
    });
  }

  const topAssignees = assigneesByActive.slice(0, 10).map((d) => ({
    name: d.name,
    avatarUrl: d.avatarUrl,
    active: d.active,
    total: d.total,
    hotfixes: d.hotfixes,
    qaRejections: d.qaRejections
  }));

  return (
    <div className="flex flex-col gap-6">
      <DashboardSummaryCards
        activeCards={activeCards}
        doneCards={doneCards}
        developerCount={developers.length}
        hotfixes={hotfixes}
      />

      <FlowDistributionBar statusCounts={statusDistribution} total={issues.length} />

      <BottlenecksSection
        topStatus={statusWithMostItems ? { status: statusWithMostItems.status, count: statusWithMostItems.count } : null}
        topAssigneeByActive={topAssigneeByInDevelopment ? { name: topAssigneeByInDevelopment.name, count: topAssigneeByInDevelopment.inDevelopment } : null}
        topAssigneeByHotfix={topAssigneeByHotfix ? { name: topAssigneeByHotfix.name, count: topAssigneeByHotfix.hotfixes } : null}
      />

      <div className="grid gap-6 md:grid-cols-2">
        <TopAssigneesTable assignees={topAssignees} />
        <AlertsSection alerts={alerts} />
      </div>

      <HealthStatus hotfixes={hotfixes} qaWaiting={qaWaiting} />
    </div>
  );
}
