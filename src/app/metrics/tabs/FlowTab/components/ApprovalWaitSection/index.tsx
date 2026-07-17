import { Sparkles, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { TooltipContent } from "@/app/metrics/tabs/FlowTab/components/TooltipContent";
import type { FlowMetricsPayload } from "@/types/flow";

function formatNumber(value: number): string {
  const fixed = value % 1 === 0 ? value.toString() : value.toFixed(1);
  return fixed.replace(".", ",");
}

function formatDays(value: number): string {
  return `${formatNumber(value)} dias`;
}

export function ApprovalWaitSection({ data }: { data: NonNullable<FlowMetricsPayload["approvalWait"]> }) {
  return (
    <section>
      <div className="mb-1 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-violet-600 dark:text-violet-400" aria-hidden />
        <h2 className="text-base font-semibold">Tempo de Aprovação (IA)</h2>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        Espera no gate de PRD — exclusivo do fluxo de IA (Dev IA).
      </p>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-violet-200 shadow-operational dark:border-violet-900/60">
          <CardHeader className="flex flex-row items-start justify-between p-4 pb-2">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Espera Média</h3>
              <p className="text-xs text-muted-foreground">{data.totalIssues} cards no gate</p>
            </div>
            <Sparkles className="h-5 w-5 text-violet-600 dark:text-violet-400" aria-hidden />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-3xl font-bold">{formatDays(data.average)}</p>
            <TooltipContent metric="approvalWait" />
          </CardContent>
        </Card>

        <Card className="shadow-operational">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground">P50</p>
              <p className="text-2xl font-semibold">{formatDays(data.p50)}</p>
              <TooltipContent metric="p50" />
            </div>
            <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </CardContent>
        </Card>

        <Card className="shadow-operational">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground">P75</p>
              <p className="text-2xl font-semibold">{formatDays(data.p75)}</p>
              <TooltipContent metric="p75" />
            </div>
            <TrendingUp className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </CardContent>
        </Card>

        <Card className="shadow-operational">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground">P90</p>
              <p className="text-2xl font-semibold">{formatDays(data.p90)}</p>
              <TooltipContent metric="p90" />
            </div>
            <TrendingUp className="h-5 w-5 text-red-600 dark:text-red-400" />
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
