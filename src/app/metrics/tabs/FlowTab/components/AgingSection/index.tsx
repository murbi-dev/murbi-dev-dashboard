import { Clock, Hourglass, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { TooltipContent } from "@/app/metrics/tabs/FlowTab/components/TooltipContent";
import { CriticalIssuesSection } from "@/app/metrics/tabs/FlowTab/components/CriticalIssuesSection";
import type { FlowMetricsPayload } from "@/types/flow";

function formatNumber(value: number): string {
  const fixed = value % 1 === 0 ? value.toString() : value.toFixed(1);
  return fixed.replace(".", ",");
}

function formatDays(value: number): string {
  return `${formatNumber(value)} dias`;
}

export function AgingSection({ data }: { data: NonNullable<FlowMetricsPayload["aging"]> }) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <Hourglass className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-base font-semibold">Aging</h2>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-operational">
          <CardHeader className="flex flex-row items-start justify-between p-4 pb-2">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Aging Médio</h3>
              <p className="text-xs text-muted-foreground">{data.totalActiveIssues} tickets ativos</p>
            </div>
            <Clock className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-3xl font-bold">{formatDays(data.average)}</p>
            <TooltipContent metric="aging" />
          </CardContent>
        </Card>

        <Card className="shadow-operational">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground">{"> 7 dias"}</p>
              <p className="text-2xl font-semibold">{data.over7Days}</p>
            </div>
            <TrendingDown className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </CardContent>
        </Card>

        <Card className="shadow-operational">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground">{"> 14 dias"}</p>
              <p className="text-2xl font-semibold">{data.over14Days}</p>
            </div>
            <TrendingDown className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          </CardContent>
        </Card>

        <Card className="shadow-operational">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground">{"> 30 dias"}</p>
              <p className="text-2xl font-semibold">{data.over30Days}</p>
            </div>
            <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
          </CardContent>
        </Card>
      </div>

      <CriticalIssuesSection issues={data.criticalIssues} />
    </section>
  );
}
