"use client";

import {
  Flame,
  RotateCcw,
  UserCircle2
} from "lucide-react";
import { buildDeveloperMetrics, getOrderedJiraStatuses, type DeveloperMetrics } from "./metrics";
import { useDashboard } from "@/hooks/use-dashboard";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

const jiraStatusColorClass: Record<string, { bar: string; text: string }> = {
  "Tarefas pendentes": {
    bar: "bg-slate-500",
    text: "text-slate-700 dark:text-slate-300"
  },
  "Em andamento": {
    bar: "bg-blue-600",
    text: "text-blue-700 dark:text-blue-300"
  },
  "Pull request": {
    bar: "bg-violet-600",
    text: "text-violet-700 dark:text-violet-300"
  },
  "Pronto para QA": {
    bar: "bg-cyan-600",
    text: "text-cyan-700 dark:text-cyan-300"
  },
  "Teste QA": {
    bar: "bg-teal-600",
    text: "text-teal-700 dark:text-teal-300"
  },
  "Pronto para PROD": {
    bar: "bg-amber-600",
    text: "text-amber-700 dark:text-amber-300"
  },
  "Concluído": {
    bar: "bg-emerald-600",
    text: "text-emerald-700 dark:text-emerald-300"
  }
};

const fallbackStatusColor = {
  bar: "bg-zinc-500",
  text: "text-zinc-700 dark:text-zinc-300"
};

function getStatusColor(status: string) {
  return jiraStatusColorClass[status] ?? fallbackStatusColor;
}

function DevsSkeleton() {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {Array.from({ length: 6 }).map((_, index) => (
        <Skeleton key={index} className="h-56" />
      ))}
    </div>
  );
}

function StatusSegmentBar({ metrics, jiraStatuses }: { metrics: DeveloperMetrics; jiraStatuses: string[] }) {
  return (
    <div className="flex h-2 overflow-hidden rounded-full bg-muted">
      {jiraStatuses.map((status) => {
        const count = metrics.byJiraStatus[status] ?? 0;

        if (!count) {
          return null;
        }

        return (
          <div
            key={status}
            className={getStatusColor(status).bar}
            style={{ width: `${(count / metrics.total) * 100}%` }}
            title={`${status}: ${count}`}
          />
        );
      })}
    </div>
  );
}

function DeveloperMetricCard({
  metrics,
  jiraStatuses
}: {
  metrics: DeveloperMetrics;
  jiraStatuses: string[];
}) {
  return (
    <Card className="shadow-operational">
      <CardHeader className="flex flex-row items-start justify-between gap-3 p-4">
        <div className="flex min-w-0 items-center gap-3">
          {metrics.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={metrics.avatarUrl} alt="" className="h-10 w-10 rounded-full" />
          ) : (
            <UserCircle2 className="h-10 w-10 text-muted-foreground" />
          )}
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold">{metrics.name}</h2>
            <p className="text-xs text-muted-foreground">
              {metrics.active} ativos · {metrics.total} no total
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-2">
          {metrics.hotfixes ? (
            <Badge variant="hotfix">
              <Flame className="mr-1 h-3 w-3" />
              {metrics.hotfixes}
            </Badge>
          ) : null}
          {metrics.qaRejections ? (
            <Badge variant="warning" title="Cards ativos que retornaram de QA">
              <RotateCcw className="mr-1 h-3 w-3" />
              QA {metrics.qaRejections}
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 p-4 pt-0">
        <StatusSegmentBar metrics={metrics} jiraStatuses={jiraStatuses} />

        <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3 xl:grid-cols-4">
          {jiraStatuses.map((status) => (
            <div key={status} className="rounded-md border bg-background px-3 py-2">
              <div className={cn("text-lg font-semibold", getStatusColor(status).text)}>
                {metrics.byJiraStatus[status] ?? 0}
              </div>
              <div className="truncate text-xs text-muted-foreground" title={status}>
                {status}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function DevsTab() {
  const { data, isLoading } = useDashboard();

  if (isLoading) {
    return <DevsSkeleton />;
  }

  const issues = data?.issues ?? [];
  const developers = buildDeveloperMetrics(issues);
  const jiraStatuses = getOrderedJiraStatuses(issues);

  return (
    <section className="grid gap-3 lg:grid-cols-2">
        {developers.map((developer) => (
          <DeveloperMetricCard key={developer.name} metrics={developer} jiraStatuses={jiraStatuses} />
        ))}
    </section>
  );
}
