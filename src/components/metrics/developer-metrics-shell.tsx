"use client";

import { ArrowLeft, BarChart3, CheckCircle2, Flame, RefreshCw, UserCircle2 } from "lucide-react";
import Link from "next/link";
import { BUSINESS_STATUSES } from "@/lib/status-mapper";
import { formatRelativeTime } from "@/lib/time";
import { getBusinessStatusLabel } from "@/lib/display";
import { useDashboard } from "@/hooks/use-dashboard";
import type { BusinessStatus, DashboardIssue } from "@/types/dashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { cn } from "@/lib/utils";

type DeveloperMetrics = {
  name: string;
  avatarUrl?: string;
  total: number;
  hotfixes: number;
  byStatus: Record<BusinessStatus, number>;
};

const statusBarClass: Record<BusinessStatus, string> = {
  Waiting: "bg-slate-500",
  "In Development": "bg-blue-600",
  Validation: "bg-teal-600",
  Finalizing: "bg-amber-600",
  Done: "bg-emerald-600"
};

const statusTextClass: Record<BusinessStatus, string> = {
  Waiting: "text-slate-700 dark:text-slate-300",
  "In Development": "text-blue-700 dark:text-blue-300",
  Validation: "text-teal-700 dark:text-teal-300",
  Finalizing: "text-amber-700 dark:text-amber-300",
  Done: "text-emerald-700 dark:text-emerald-300"
};

function emptyStatusCounts(): Record<BusinessStatus, number> {
  return BUSINESS_STATUSES.reduce(
    (acc, status) => {
      acc[status] = 0;
      return acc;
    },
    {} as Record<BusinessStatus, number>
  );
}

function buildDeveloperMetrics(issues: DashboardIssue[]): DeveloperMetrics[] {
  const metrics = new Map<string, DeveloperMetrics>();

  for (const issue of issues) {
    const name = issue.assignee.name || "Sem responsável";
    const current =
      metrics.get(name) ??
      ({
        name,
        avatarUrl: issue.assignee.avatarUrl,
        total: 0,
        hotfixes: 0,
        byStatus: emptyStatusCounts()
      } satisfies DeveloperMetrics);

    current.avatarUrl = current.avatarUrl ?? issue.assignee.avatarUrl;
    current.total += 1;
    current.hotfixes += issue.isHotfix ? 1 : 0;
    current.byStatus[issue.businessStatus] += 1;

    metrics.set(name, current);
  }

  return Array.from(metrics.values()).sort((a, b) => {
    const activeA = a.total - a.byStatus.Done;
    const activeB = b.total - b.byStatus.Done;

    if (activeA !== activeB) {
      return activeB - activeA;
    }

    if (a.total !== b.total) {
      return b.total - a.total;
    }

    return a.name.localeCompare(b.name, "pt-BR");
  });
}

function sumByStatus(issues: DashboardIssue[]): Record<BusinessStatus, number> {
  return issues.reduce((acc, issue) => {
    acc[issue.businessStatus] += 1;
    return acc;
  }, emptyStatusCounts());
}

function MetricsSkeleton() {
  return (
    <main className="min-h-screen bg-background p-4 md:p-6">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-4">
        <Skeleton className="h-16 w-full" />
        <div className="grid gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-24" />
          ))}
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-56" />
          ))}
        </div>
      </div>
    </main>
  );
}

function StatusSegmentBar({ metrics }: { metrics: DeveloperMetrics }) {
  return (
    <div className="flex h-2 overflow-hidden rounded-full bg-muted">
      {BUSINESS_STATUSES.map((status) => {
        const count = metrics.byStatus[status];

        if (!count) {
          return null;
        }

        return (
          <div
            key={status}
            className={statusBarClass[status]}
            style={{ width: `${(count / metrics.total) * 100}%` }}
            title={`${getBusinessStatusLabel(status)}: ${count}`}
          />
        );
      })}
    </div>
  );
}

function DeveloperMetricCard({ metrics }: { metrics: DeveloperMetrics }) {
  const activeCards = metrics.total - metrics.byStatus.Done;

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
              {activeCards} ativos · {metrics.total} no total
            </p>
          </div>
        </div>
        {metrics.hotfixes ? (
          <Badge variant="hotfix" className="shrink-0">
            <Flame className="mr-1 h-3 w-3" />
            {metrics.hotfixes}
          </Badge>
        ) : null}
      </CardHeader>
      <CardContent className="grid gap-4 p-4 pt-0">
        <StatusSegmentBar metrics={metrics} />

        <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
          {BUSINESS_STATUSES.map((status) => (
            <div key={status} className="rounded-md border bg-background px-3 py-2">
              <div className={cn("text-lg font-semibold", statusTextClass[status])}>{metrics.byStatus[status]}</div>
              <div className="truncate text-xs text-muted-foreground">{getBusinessStatusLabel(status)}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function DeveloperMetricsShell() {
  const { data, error, isLoading, isFetching, refetch } = useDashboard();

  if (isLoading) {
    return <MetricsSkeleton />;
  }

  const issues = data?.issues ?? [];
  const developers = buildDeveloperMetrics(issues);
  const totals = sumByStatus(issues);
  const activeCards = issues.length - totals.Done;
  const hotfixes = issues.filter((issue) => issue.isHotfix).length;

  return (
    <main className="min-h-screen bg-background p-4 md:p-6">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-4">
        <header className="flex flex-col gap-3 border-b border-border pb-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/"
                className="inline-flex h-9 items-center gap-2 rounded-md border bg-background px-3 text-sm font-medium hover:bg-accent"
              >
                <ArrowLeft className="h-4 w-4" />
                Dashboard
              </Link>
              <h1 className="text-2xl font-semibold tracking-normal">Métricas do Kanban</h1>
              <Badge variant={data?.source === "jira" ? "secondary" : "warning"}>
                {data?.source === "jira" ? "Jira ao vivo" : "Modo simulado"}
              </Badge>
              {isFetching ? <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {data?.scope.name} · atualizado {data ? formatRelativeTime(data.fetchedAt) : "agora"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </Button>
          </div>
        </header>

        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-200">
            A API do painel está indisponível. A tela continuará tentando a cada 30 segundos.
          </div>
        ) : null}

        <section className="grid gap-3 md:grid-cols-4">
          <Card className="shadow-operational">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Cards ativos</p>
                <p className="text-2xl font-semibold">{activeCards}</p>
              </div>
              <BarChart3 className="h-6 w-6 text-muted-foreground" />
            </CardContent>
          </Card>
          <Card className="shadow-operational">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Concluídos</p>
                <p className="text-2xl font-semibold">{totals.Done}</p>
              </div>
              <CheckCircle2 className="h-6 w-6 text-emerald-700 dark:text-emerald-300" />
            </CardContent>
          </Card>
          <Card className="shadow-operational">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Responsáveis</p>
                <p className="text-2xl font-semibold">{developers.length}</p>
              </div>
              <UserCircle2 className="h-6 w-6 text-muted-foreground" />
            </CardContent>
          </Card>
          <Card className="border-red-200 bg-red-50 shadow-operational dark:border-red-900/70 dark:bg-red-950/40">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs font-medium text-red-800 dark:text-red-200">HOTFIX</p>
                <p className="text-2xl font-semibold text-red-800 dark:text-red-200">{hotfixes}</p>
              </div>
              <Flame className="h-6 w-6 text-red-600 dark:text-red-300" />
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-3 lg:grid-cols-2">
          {developers.map((developer) => (
            <DeveloperMetricCard key={developer.name} metrics={developer} />
          ))}
        </section>
      </div>
    </main>
  );
}
