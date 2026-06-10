"use client";

import { Flame, RotateCcw, UserCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

type AssigneeRow = {
  name: string;
  avatarUrl?: string;
  active: number;
  total: number;
  hotfixes: number;
  qaRejections: number;
};

export function TopAssigneesTable({ assignees }: { assignees: AssigneeRow[] }) {
  if (assignees.length === 0) return null;

  return (
    <section>
      <h2 className="mb-3 text-base font-semibold">Responsáveis</h2>
      <div className="overflow-hidden rounded-lg border">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Responsável</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">Ativos</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">Total</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Flame className="h-3 w-3" />
                </span>
              </th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <RotateCcw className="h-3 w-3" />
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {assignees.map((row) => (
              <tr key={row.name} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    {row.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={row.avatarUrl} alt="" className="h-6 w-6 rounded-full" />
                    ) : (
                      <UserCircle2 className="h-6 w-6 text-muted-foreground" />
                    )}
                    <span className="font-medium">{row.name}</span>
                  </div>
                </td>
                <td className="px-3 py-2 text-right font-semibold">{row.active}</td>
                <td className="px-3 py-2 text-right text-muted-foreground">{row.total}</td>
                <td className="px-3 py-2 text-right">
                  {row.hotfixes > 0 ? (
                    <span className="font-semibold text-red-600 dark:text-red-400">{row.hotfixes}</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  {row.qaRejections > 0 ? (
                    <span className={cn("font-semibold", row.qaRejections > 2 ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400")}>
                      {row.qaRejections}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
