import { ListOrdered } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgingIssue } from "@/types/flow";

function formatNumber(value: number): string {
  const fixed = value % 1 === 0 ? value.toString() : value.toFixed(1);
  return fixed.replace(".", ",");
}

function formatDays(value: number): string {
  return `${formatNumber(value)} dias`;
}

export function CriticalIssuesSection({ issues }: { issues: AgingIssue[] }) {
  if (issues.length === 0) return null;

  return (
    <section className="mt-4">
      <div className="mb-3 flex items-center gap-2">
        <ListOrdered className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-medium">Itens Críticos</h3>
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Ticket</th>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Resumo</th>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Responsável</th>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Status Atual</th>
              <th className="px-4 py-2 text-right font-medium text-muted-foreground">Aging</th>
            </tr>
          </thead>
          <tbody>
            {issues.map((issue) => (
              <tr key={issue.key} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-4 py-2 font-mono text-xs font-medium">{issue.key}</td>
                <td className="max-w-xs truncate px-4 py-2">{issue.summary}</td>
                <td className="px-4 py-2 text-muted-foreground">{issue.assignee}</td>
                <td className="px-4 py-2">{issue.status}</td>
                <td className={cn(
                  "px-4 py-2 text-right font-semibold",
                  issue.agingDays > 30
                    ? "text-red-600 dark:text-red-400"
                    : issue.agingDays > 14
                      ? "text-orange-600 dark:text-orange-400"
                      : issue.agingDays > 7
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-muted-foreground"
                )}>
                  {formatDays(issue.agingDays)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
