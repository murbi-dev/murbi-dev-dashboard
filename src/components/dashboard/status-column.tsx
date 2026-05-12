import type { BusinessStatus, DashboardIssue } from "@/types/dashboard";
import { IssueCard } from "@/components/cards/issue-card";
import { cn } from "@/lib/utils";
import { getBusinessStatusLabel } from "@/lib/display";

const developmentStatusOrder = ["Em andamento", "In Progress", "Pull Request", "Pull request", "Pronto para QA"];

const statusAccent: Record<BusinessStatus, string> = {
  Waiting: "bg-slate-500",
  "In Development": "bg-blue-600",
  Validation: "bg-teal-600",
  Finalizing: "bg-amber-600",
  Done: "bg-emerald-600"
};

export function StatusColumn({
  status,
  issues,
  totalIssues,
  jiraStatusOptions,
  selectedJiraStatus,
  mode,
  onJiraStatusChange
}: {
  status: BusinessStatus;
  issues: DashboardIssue[];
  totalIssues: number;
  jiraStatusOptions: Array<[string, number]>;
  selectedJiraStatus: string;
  mode: "standard" | "tv";
  onJiraStatusChange: (jiraStatus: string) => void;
}) {
  const jiraStatusCounts = [...jiraStatusOptions].sort(([statusA], [statusB]) => {
    const orderA = developmentStatusOrder.indexOf(statusA);
    const orderB = developmentStatusOrder.indexOf(statusB);

    if (orderA !== -1 || orderB !== -1) {
      const normalizedOrderA = orderA === -1 ? Number.MAX_SAFE_INTEGER : orderA;
      const normalizedOrderB = orderB === -1 ? Number.MAX_SAFE_INTEGER : orderB;

      return normalizedOrderA - normalizedOrderB;
    }

    return statusA.localeCompare(statusB, "pt-BR");
  });
  const canFilterByJiraStatus = mode === "standard" && jiraStatusCounts.length > 1;
  const hasStatusFilter = selectedJiraStatus !== "all";

  return (
    <div className="min-w-0 rounded-lg border bg-white shadow-sm">
      <div className="border-b p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className={cn("h-2.5 w-2.5 rounded-full", statusAccent[status])} />
            <h2 className={cn("truncate font-semibold", mode === "tv" ? "text-xl" : "text-sm")}>
              {getBusinessStatusLabel(status)}
            </h2>
          </div>
          <span className={cn("rounded-md bg-muted px-2 py-1 font-semibold", mode === "tv" ? "text-lg" : "text-xs")}>
            {hasStatusFilter ? `${issues.length}/${totalIssues}` : issues.length}
          </span>
        </div>
        {jiraStatusCounts.length > 1 ? (
          canFilterByJiraStatus ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              <button
                type="button"
                className={cn(
                  "inline-flex h-7 max-w-full items-center gap-1 rounded-md border px-2 text-xs font-medium transition-colors",
                  selectedJiraStatus === "all"
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
                onClick={() => onJiraStatusChange("all")}
              >
                Todos
                <span className="font-semibold">{totalIssues}</span>
              </button>
              {jiraStatusCounts.map(([jiraStatus, count]) => (
                <button
                  type="button"
                  key={jiraStatus}
                  title={jiraStatus}
                  className={cn(
                    "inline-flex h-7 min-w-0 max-w-full items-center gap-1 rounded-md border px-2 text-xs font-medium transition-colors",
                    selectedJiraStatus === jiraStatus
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                  onClick={() => onJiraStatusChange(jiraStatus)}
                >
                  <span className="truncate">{jiraStatus}</span>
                  <span className="shrink-0 font-semibold">{count}</span>
                </button>
              ))}
            </div>
          ) : (
            <dl className={cn("mt-3 grid gap-1 text-muted-foreground", mode === "tv" ? "text-sm" : "text-xs")}>
              {jiraStatusCounts.map(([jiraStatus, count]) => (
                <div key={jiraStatus} className="flex min-w-0 items-center justify-between gap-2">
                  <dt className="truncate">{jiraStatus}</dt>
                  <dd className="shrink-0 font-semibold text-foreground">{count}</dd>
                </div>
              ))}
            </dl>
          )
        ) : null}
      </div>
      <div className={cn("flex flex-col gap-3 p-3", mode === "tv" ? "max-h-[64vh] overflow-hidden" : "min-h-40")}>
        {issues.length ? (
          issues.map((issue) => <IssueCard key={issue.id} issue={issue} mode={mode} />)
        ) : (
          <div
            className={cn(
              "rounded-md border border-dashed p-4 text-center text-muted-foreground",
              mode === "tv" ? "text-base" : "text-sm"
            )}
          >
            Sem cards
          </div>
        )}
      </div>
    </div>
  );
}
