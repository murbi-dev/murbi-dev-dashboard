"use client";

import { cn } from "@/lib/utils";

const jiraStatusColorClass: Record<string, { bar: string; text: string }> = {
  "Tarefas pendentes": { bar: "bg-slate-500", text: "text-slate-700 dark:text-slate-300" },
  "Em andamento":     { bar: "bg-blue-600",  text: "text-blue-700 dark:text-blue-300" },
  "Pull request":     { bar: "bg-violet-600", text: "text-violet-700 dark:text-violet-300" },
  "Pronto para QA":   { bar: "bg-cyan-600",  text: "text-cyan-700 dark:text-cyan-300" },
  "Teste QA":         { bar: "bg-teal-600",  text: "text-teal-700 dark:text-teal-300" },
  "Pronto para PROD": { bar: "bg-amber-600", text: "text-amber-700 dark:text-amber-300" },
  "Concluído":        { bar: "bg-emerald-600", text: "text-emerald-700 dark:text-emerald-300" }
};

const fallbackColor = { bar: "bg-zinc-500", text: "text-zinc-700 dark:text-zinc-300" };

function getStatusColor(status: string) {
  return jiraStatusColorClass[status] ?? fallbackColor;
}

type StatusCount = {
  status: string;
  count: number;
};

export function FlowDistributionBar({
  statusCounts,
  total
}: {
  statusCounts: StatusCount[];
  total: number;
}) {
  const nonEmpty = statusCounts.filter((s) => s.count > 0);

  return (
    <section className="shadow-operational rounded-lg border bg-card p-4">
      <h2 className="mb-3 text-base font-semibold">Distribuição do Fluxo</h2>

      <div className="flex h-3 overflow-hidden rounded-full bg-muted">
        {nonEmpty.map(({ status, count }) => (
          <div
            key={status}
            className={cn("transition-all", getStatusColor(status).bar)}
            style={{ width: `${(count / total) * 100}%` }}
            title={`${status}: ${count}`}
          />
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
        {nonEmpty.map(({ status, count }) => (
          <div key={status} className="flex items-center gap-2 rounded-md border bg-background px-3 py-2">
            <span className={cn("h-2.5 w-2.5 rounded-sm shrink-0", getStatusColor(status).bar)} />
            <div className="min-w-0">
              <div className={cn("text-sm font-semibold leading-none", getStatusColor(status).text)}>
                {count}
              </div>
              <div className="truncate text-xs text-muted-foreground" title={status}>
                {status}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
