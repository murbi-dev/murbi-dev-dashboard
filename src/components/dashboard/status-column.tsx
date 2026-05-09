import type { BusinessStatus, DashboardIssue } from "@/types/dashboard";
import { IssueCard } from "@/components/cards/issue-card";
import { cn } from "@/lib/utils";
import { getBusinessStatusLabel } from "@/lib/display";

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
  mode
}: {
  status: BusinessStatus;
  issues: DashboardIssue[];
  mode: "standard" | "tv";
}) {
  return (
    <div className="min-w-0 rounded-lg border bg-white shadow-sm">
      <div className="flex items-center justify-between border-b p-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className={cn("h-2.5 w-2.5 rounded-full", statusAccent[status])} />
          <h2 className={cn("truncate font-semibold", mode === "tv" ? "text-xl" : "text-sm")}>
            {getBusinessStatusLabel(status)}
          </h2>
        </div>
        <span className={cn("rounded-md bg-muted px-2 py-1 font-semibold", mode === "tv" ? "text-lg" : "text-xs")}>
          {issues.length}
        </span>
      </div>
      <div className={cn("flex flex-col gap-3 p-3", mode === "tv" ? "max-h-[64vh] overflow-hidden" : "min-h-40")}>
        {issues.length ? (
          issues.map((issue) => <IssueCard key={issue.id} issue={issue} mode={mode} />)
        ) : (
          <div className={cn("rounded-md border border-dashed p-4 text-center text-muted-foreground", mode === "tv" ? "text-base" : "text-sm")}>
            Sem cards
          </div>
        )}
      </div>
    </div>
  );
}
