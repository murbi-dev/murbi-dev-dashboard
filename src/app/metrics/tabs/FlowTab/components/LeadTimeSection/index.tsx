import { Gauge, TrendingUp } from "lucide-react";
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

export function LeadTimeSection({ data }: { data: NonNullable<FlowMetricsPayload["leadTime"]> }) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <Gauge className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-base font-semibold">Lead Time</h2>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-operational">
          <CardHeader className="flex flex-row items-start justify-between p-4 pb-2">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Lead Time Médio</h3>
              <p className="text-xs text-muted-foreground">{data.totalIssues} entregas</p>
            </div>
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-3xl font-bold">{formatDays(data.average)}</p>
            <TooltipContent metric="leadTime" />
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
