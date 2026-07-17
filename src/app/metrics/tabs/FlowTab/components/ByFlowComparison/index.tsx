import { Sparkles, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import type { FlowByDevType, FlowStats } from "@/types/flow";

function formatNumber(value: number): string {
  const fixed = value % 1 === 0 ? value.toString() : value.toFixed(1);
  return fixed.replace(".", ",");
}

function formatDays(value: number): string {
  return `${formatNumber(value)} dias`;
}

function SegmentCard({ tipo, stats }: { tipo: "ia" | "humano"; stats: FlowStats }) {
  const ehIa = tipo === "ia";

  return (
    <Card className="shadow-operational">
      <CardContent className="p-4">
        <div className="mb-1 flex items-center gap-1.5">
          {ehIa ? (
            <Sparkles className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" aria-hidden />
          ) : (
            <User className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
          )}
          <p className="text-xs font-medium text-muted-foreground">{ehIa ? "Fluxo IA" : "Fluxo Humano"}</p>
        </div>
        {stats ? (
          <>
            <p className="text-2xl font-semibold">{formatDays(stats.average)}</p>
            <p className="text-xs text-muted-foreground">
              P50 {formatDays(stats.p50)} · {stats.totalIssues} {stats.totalIssues === 1 ? "item" : "itens"}
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Sem dados no período</p>
        )}
      </CardContent>
    </Card>
  );
}

export function ByFlowComparison({ label, data }: { label: string; data: FlowByDevType }) {
  if (!data.ai && !data.human) return null;

  return (
    <div className="mt-3">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{label} · IA × Humano</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <SegmentCard tipo="ia" stats={data.ai} />
        <SegmentCard tipo="humano" stats={data.human} />
      </div>
    </div>
  );
}
