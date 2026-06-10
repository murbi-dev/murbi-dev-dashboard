"use client";

import { Card, CardContent } from "@/components/ui/Card";

type BottleneckItem = {
  label: string;
  value: string;
  detail: string;
};

function BottleneckCard({ label, value, detail }: BottleneckItem) {
  return (
    <Card className="shadow-operational">
      <CardContent className="p-4">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-lg font-semibold">{value}</p>
        <p className="text-xs text-muted-foreground/70">{detail}</p>
      </CardContent>
    </Card>
  );
}

export function BottlenecksSection({
  topStatus,
  topAssigneeByActive,
  topAssigneeByHotfix
}: {
  topStatus: { status: string; count: number } | null;
  topAssigneeByActive: { name: string; count: number } | null;
  topAssigneeByHotfix: { name: string; count: number } | null;
}) {
  return (
    <section>
      <h2 className="mb-3 text-base font-semibold">Gargalos</h2>
      <div className="grid gap-3 md:grid-cols-3">
        <BottleneckCard
          label="Status com mais itens"
          value={topStatus ? `${topStatus.status}` : "—"}
          detail={topStatus ? `${topStatus.count} ${topStatus.count === 1 ? "item" : "itens"}` : "Nenhum item"}
        />
        <BottleneckCard
          label="Responsável com mais itens ativos"
          value={topAssigneeByActive ? topAssigneeByActive.name : "—"}
          detail={topAssigneeByActive ? `${topAssigneeByActive.count} ${topAssigneeByActive.count === 1 ? "item ativo" : "itens ativos"}` : "Nenhum item"}
        />
        <BottleneckCard
          label="Responsável com mais HOTFIX"
          value={topAssigneeByHotfix && topAssigneeByHotfix.count > 0 ? topAssigneeByHotfix.name : "Nenhum"}
          detail={topAssigneeByHotfix && topAssigneeByHotfix.count > 0 ? `${topAssigneeByHotfix.count} HOTFIX` : "Sem HOTFIX"}
        />
      </div>
    </section>
  );
}
