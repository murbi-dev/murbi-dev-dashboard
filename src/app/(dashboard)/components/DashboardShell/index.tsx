"use client";

import { Activity, BarChart3, CheckCircle2, ChevronDown, Clock, FileSpreadsheet, Flame, RefreshCw, Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { BUSINESS_STATUSES } from "@/lib/status-mapper";
import { formatRelativeTime } from "@/lib/time";
import { getPriorityLabel } from "@/lib/display";
import { buildDashboardExportXls } from "@/lib/dashboard-export";
import { useDashboard } from "@/hooks/use-dashboard";
import type { BusinessStatus, DashboardFilters, DashboardIssue } from "@/types/dashboard";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { DashboardSkeleton } from "./components/DashboardSkeleton";
import { GlobalIssueSearch } from "./components/GlobalIssueSearch";
import { StatusColumn } from "./components/StatusColumn";
import { SummaryCard } from "./components/SummaryCard";
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
  HOTFIX: 0,
  Highest: 1,
  High: 2,
  Medium: 3,
  Low: 4,
  Lowest: 5,
  Unknown: 6
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
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

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
  const visibleIssues = useMemo(
    () => BUSINESS_STATUSES.flatMap((status) => grouped[status]),
    [grouped]
  );
  const stats = {
    total: issues.length,
    hotfixes: issues.filter((issue) => issue.isHotfix).length,
    pendingHotfixes: issues.filter((issue) => issue.isHotfix && issue.businessStatus !== "Done").length,
    development: issues.filter((issue) => issue.businessStatus === "In Development").length,
    validation: issues.filter((issue) => issue.businessStatus === "Validation").length,
    done: issues.filter((issue) => issue.businessStatus === "Done").length
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!exportMenuRef.current?.contains(event.target as Node)) {
        setIsExportMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function exportVisibleIssuesToExcel() {
    const xls = buildDashboardExportXls(visibleIssues);
    const blob = new Blob([xls], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const exportedAt = new Date().toISOString().slice(0, 10);

    link.href = url;
    link.download = `murbi-dashboard-${exportedAt}.xls`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setIsExportMenuOpen(false);
  }

  if (isLoading) {
    return <DashboardSkeleton mode={mode} />;
  }

  return (
    <main className={cn("min-h-screen bg-background", mode === "tv" ? "p-2 xl:p-3" : "p-3")}>
      <div className={cn("flex w-full flex-col", mode === "tv" ? "gap-1.5" : "gap-2")}>
        <header className="flex flex-col gap-1.5 border-b border-border pb-1.5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <Image
                src="/logo.png"
                alt="Murbi"
                width={mode === "tv" ? 28 : 26}
                height={mode === "tv" ? 28 : 26}
                priority
                className="shrink-0 rounded-md"
              />
              <h1 className={cn("shrink-0 font-semibold tracking-normal", mode === "tv" ? "text-xl" : "text-lg")}>
                Murbi Dev Dashboard
              </h1>
              <Badge variant="secondary">Jira ao vivo</Badge>
              <span className={cn("min-w-0 truncate text-muted-foreground", mode === "tv" ? "text-sm" : "text-xs")}>
                {data?.scope.name} · atualizado {data ? formatRelativeTime(data.fetchedAt) : "agora"}
              </span>
              {isFetching ? <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/metrics"
              className={cn(
                "inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-2.5 text-sm font-medium transition-colors hover:bg-accent",
                "h-8"
              )}
            >
              <BarChart3 className="h-4 w-4" />
              Métricas
            </Link>
            <GlobalIssueSearch mode={mode} />
            <ThemeToggle />
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </Button>
          </div>
        </header>

        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-200">
            A API do painel está indisponível. A tela continuará tentando a cada 30 segundos.
          </div>
        ) : null}

        <section className={cn("grid gap-1.5", mode === "tv" ? "grid-cols-5" : "grid-cols-2 lg:grid-cols-5")}>
          <SummaryCard icon={Activity} label="Cards no fluxo" value={stats.total} mode={mode} />
          <SummaryCard icon={Flame} label="Hotfixes" value={`${stats.pendingHotfixes}/${stats.hotfixes}`} tone="hotfix" mode={mode} />
          <SummaryCard icon={Clock} label="Em Desenvolvimento" value={stats.development} mode={mode} />
          <SummaryCard icon={Search} label="Em Teste" value={stats.validation} mode={mode} />
          <SummaryCard icon={CheckCircle2} label="Em Produção" value={stats.done} tone="done" mode={mode} />
        </section>

        {mode === "standard" ? (
          <section className="flex flex-col gap-1.5 rounded-md border bg-card p-1.5 shadow-sm lg:flex-row">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="h-9 pl-8"
                placeholder="Buscar por chave, título ou responsável"
                value={filters.query}
                onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
              />
            </div>
            <Button
              variant={filters.hotfixOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setFilters((current) => ({ ...current, hotfixOnly: !current.hotfixOnly }))}
            >
              <Flame className="h-4 w-4" />
              HOTFIX
            </Button>
            <select
              className="h-9 rounded-md border border-input bg-background px-2.5 text-sm"
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
              className="h-9 rounded-md border border-input bg-background px-2.5 text-sm"
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
            <div className="relative" ref={exportMenuRef}>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full justify-between lg:w-auto"
                aria-haspopup="menu"
                aria-expanded={isExportMenuOpen}
                onClick={() => setIsExportMenuOpen((current) => !current)}
              >
                <FileSpreadsheet className="h-4 w-4" />
                Exportar
                <ChevronDown className="h-4 w-4" />
              </Button>
              {isExportMenuOpen ? (
                <div
                  className="absolute right-0 z-20 mt-1 w-56 rounded-md border bg-card p-1 text-card-foreground shadow-lg"
                  role="menu"
                >
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-sm px-2.5 py-2 text-left text-sm hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                    role="menuitem"
                    disabled={visibleIssues.length === 0}
                    onClick={exportVisibleIssuesToExcel}
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    Exportar para Excel
                  </button>
                </div>
              ) : null}
            </div>
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
