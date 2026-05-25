"use client";

import { Activity, AlertTriangle, BarChart3, CheckCircle2, Clock, Flame, RefreshCw, Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { BUSINESS_STATUSES } from "@/lib/status-mapper";
import { formatRelativeTime } from "@/lib/time";
import { getPriorityLabel } from "@/lib/display";
import { useDashboard } from "@/hooks/use-dashboard";
import type { BusinessStatus, DashboardFilters, DashboardIssue } from "@/types/dashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SummaryCard } from "@/components/dashboard/summary-card";
import { StatusColumn } from "@/components/dashboard/status-column";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { GlobalIssueSearch } from "@/components/dashboard/global-issue-search";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { cn } from "@/lib/utils";

type DashboardMode = "standard" | "tv";
const emptyIssues: DashboardIssue[] = [];

const defaultFilters: DashboardFilters = {
  query: "",
  hotfixOnly: false,
  assignee: "all",
  priority: "all"
};

const defaultStatusFilters = BUSINESS_STATUSES.reduce(
  (acc, status) => {
    acc[status] = "all";
    return acc;
  },
  {} as Record<BusinessStatus, string>
);

const priorityOrder: Record<string, number> = {
  Highest: 0,
  High: 1,
  Medium: 2,
  Low: 3,
  Lowest: 4,
  Unknown: 5
};

function sortIssues(issues: DashboardIssue[]) {
  return [...issues].sort((a, b) => {
    if (a.isHotfix !== b.isHotfix) {
      return a.isHotfix ? -1 : 1;
    }

    const priorityDiff = (priorityOrder[a.priority] ?? priorityOrder.Unknown) - (priorityOrder[b.priority] ?? priorityOrder.Unknown);

    if (priorityDiff !== 0) {
      return priorityDiff;
    }

    return new Date(a.statusChangedAt).getTime() - new Date(b.statusChangedAt).getTime();
  });
}

export function DashboardShell({ mode }: { mode: DashboardMode }) {
  const { data, error, isLoading, isFetching, refetch } = useDashboard();
  const [filters, setFilters] = useState(defaultFilters);
  const [statusFilters, setStatusFilters] = useState(defaultStatusFilters);

  const issues = data?.issues ?? emptyIssues;
  const assignees = useMemo(
    () => Array.from(new Set(issues.map((issue) => issue.assignee.name))).sort(),
    [issues]
  );
  const priorities = useMemo(
    () => Array.from(new Set(issues.map((issue) => issue.priority))).sort(),
    [issues]
  );

  const filteredIssues = useMemo(() => {
    const query = filters.query.trim().toLowerCase();

    return sortIssues(
      issues.filter((issue) => {
        const matchesQuery =
          !query ||
          issue.key.toLowerCase().includes(query) ||
          issue.title.toLowerCase().includes(query) ||
          issue.assignee.name.toLowerCase().includes(query) ||
          issue.jiraStatus.toLowerCase().includes(query);
        const matchesHotfix = !filters.hotfixOnly || issue.isHotfix;
        const matchesAssignee = filters.assignee === "all" || issue.assignee.name === filters.assignee;
        const matchesPriority = filters.priority === "all" || issue.priority === filters.priority;

        return matchesQuery && matchesHotfix && matchesAssignee && matchesPriority;
      })
    );
  }, [filters, issues]);

  const groupedBeforeStatusFilter = useMemo(
    () =>
      BUSINESS_STATUSES.reduce(
        (acc, status) => {
          acc[status] = filteredIssues.filter((issue) => issue.businessStatus === status);
          return acc;
        },
        {} as Record<BusinessStatus, DashboardIssue[]>
      ),
    [filteredIssues]
  );

  const statusOptionsByColumn = useMemo(
    () =>
      BUSINESS_STATUSES.reduce(
        (acc, status) => {
          acc[status] = Array.from(
            groupedBeforeStatusFilter[status].reduce((counts, issue) => {
              counts.set(issue.jiraStatus, (counts.get(issue.jiraStatus) ?? 0) + 1);
              return counts;
            }, new Map<string, number>())
          ).sort(([statusA], [statusB]) => statusA.localeCompare(statusB, "pt-BR"));

          return acc;
        },
        {} as Record<BusinessStatus, Array<[string, number]>>
      ),
    [groupedBeforeStatusFilter]
  );

  const grouped = useMemo(
    () =>
      BUSINESS_STATUSES.reduce(
        (acc, status) => {
          const selectedJiraStatus = statusFilters[status];
          acc[status] =
            selectedJiraStatus === "all"
              ? groupedBeforeStatusFilter[status]
              : groupedBeforeStatusFilter[status].filter((issue) => issue.jiraStatus === selectedJiraStatus);
          return acc;
        },
        {} as Record<BusinessStatus, DashboardIssue[]>
      ),
    [groupedBeforeStatusFilter, statusFilters]
  );
  const stats = {
    total: issues.length,
    hotfixes: issues.filter((issue) => issue.isHotfix).length,
    pendingHotfixes: issues.filter((issue) => issue.isHotfix && issue.businessStatus !== "Done").length,
    development: issues.filter((issue) => issue.businessStatus === "In Development").length,
    validation: issues.filter((issue) => issue.businessStatus === "Validation").length,
    done: issues.filter((issue) => issue.businessStatus === "Done").length
  };

  if (isLoading) {
    return <DashboardSkeleton mode={mode} />;
  }

  return (
    <main className={cn("min-h-screen bg-background", mode === "tv" ? "p-5 xl:p-7" : "p-4 md:p-6")}>
      <div className="mx-auto flex max-w-[1920px] flex-col gap-4">
        <header className="flex flex-col gap-3 border-b border-border pb-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Image
                src="/logo.png"
                alt="Murbi"
                width={mode === "tv" ? 44 : 32}
                height={mode === "tv" ? 44 : 32}
                priority
                className="shrink-0 rounded-md"
              />
              <h1 className={cn("font-semibold tracking-normal", mode === "tv" ? "text-4xl" : "text-2xl")}>
                Murbi Dev Dashboard
              </h1>
              <Badge variant={data?.source === "jira" ? "secondary" : "warning"}>
                {data?.source === "jira" ? "Jira ao vivo" : "Modo simulado"}
              </Badge>
              {isFetching ? <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
            </div>
            <p className={cn("mt-1 text-muted-foreground", mode === "tv" ? "text-lg" : "text-sm")}>
              {data?.scope.name} · atualizado {data ? formatRelativeTime(data.fetchedAt) : "agora"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {data?.warning ? (
              <Badge variant="warning" className="max-w-[560px] justify-start whitespace-normal text-left">
                <AlertTriangle className="mr-1 h-3.5 w-3.5" />
                {data.warning}
              </Badge>
            ) : null}
            <Link
              href="/metrics"
              className={cn(
                "inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium transition-colors hover:bg-accent",
                mode === "tv" ? "h-10 px-4 py-2" : "h-9"
              )}
            >
              <BarChart3 className="h-4 w-4" />
              Métricas
            </Link>
            <GlobalIssueSearch mode={mode} />
            <ThemeToggle />
            <Button variant="outline" size={mode === "tv" ? "default" : "sm"} onClick={() => refetch()}>
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

        <section className={cn("grid gap-3", mode === "tv" ? "grid-cols-5" : "grid-cols-2 lg:grid-cols-5")}>
          <SummaryCard icon={Activity} label="Cards no fluxo" value={stats.total} mode={mode} />
          <SummaryCard icon={Flame} label="Hotfixes" value={`${stats.pendingHotfixes}/${stats.hotfixes}`} tone="hotfix" mode={mode} />
          <SummaryCard icon={Clock} label="Em Desenvolvimento" value={stats.development} mode={mode} />
          <SummaryCard icon={Search} label="Em Teste" value={stats.validation} mode={mode} />
          <SummaryCard icon={CheckCircle2} label="Em Produção" value={stats.done} tone="done" mode={mode} />
        </section>

        {mode === "standard" ? (
          <section className="flex flex-col gap-2 rounded-lg border bg-card p-3 shadow-sm lg:flex-row">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar por chave, título ou responsável"
                value={filters.query}
                onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
              />
            </div>
            <Button
              variant={filters.hotfixOnly ? "default" : "outline"}
              onClick={() => setFilters((current) => ({ ...current, hotfixOnly: !current.hotfixOnly }))}
            >
              <Flame className="h-4 w-4" />
              HOTFIX
            </Button>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={filters.assignee}
              onChange={(event) => setFilters((current) => ({ ...current, assignee: event.target.value }))}
            >
              <option value="all">Todos os responsáveis</option>
              {assignees.map((assignee) => (
                <option value={assignee} key={assignee}>
                  {assignee}
                </option>
              ))}
            </select>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={filters.priority}
              onChange={(event) => setFilters((current) => ({ ...current, priority: event.target.value }))}
            >
              <option value="all">Todas as prioridades</option>
              {priorities.map((priority) => (
                <option value={priority} key={priority}>
                  {getPriorityLabel(priority)}
                </option>
              ))}
            </select>
          </section>
        ) : null}

        <section
          className={cn(
            "grid gap-3",
            mode === "tv"
              ? "grid-cols-5"
              : "grid-flow-col auto-cols-[minmax(280px,82vw)] overflow-x-auto pb-2 xl:grid-flow-row xl:grid-cols-5 xl:overflow-visible xl:pb-0"
          )}
        >
          {BUSINESS_STATUSES.map((status) => (
            <StatusColumn
              key={status}
              status={status}
              issues={grouped[status]}
              totalIssues={groupedBeforeStatusFilter[status].length}
              jiraStatusOptions={statusOptionsByColumn[status]}
              selectedJiraStatus={statusFilters[status]}
              mode={mode}
              onJiraStatusChange={(jiraStatus) =>
                setStatusFilters((current) => ({
                  ...current,
                  [status]: jiraStatus
                }))
              }
            />
          ))}
        </section>
      </div>
    </main>
  );
}
