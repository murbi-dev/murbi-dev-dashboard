"use client";

import { BarChart3, CheckCircle2, Flame, UserCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import type { ReactNode } from "react";

type SummaryCardItem = {
  label: string;
  value: number;
  description: string;
  icon: ReactNode;
  variant?: "default" | "hotfix";
};

function SummaryCard({ label, value, description, icon, variant = "default" }: SummaryCardItem) {
  const isHotfix = variant === "hotfix";
  return (
    <Card
      className={
        isHotfix
          ? "border-red-200 bg-red-50 shadow-operational dark:border-red-900/70 dark:bg-red-950/40"
          : "shadow-operational"
      }
    >
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex flex-col gap-0.5">
          <p
            className={`text-xs font-medium ${isHotfix ? "text-red-800 dark:text-red-200" : "text-muted-foreground"}`}
          >
            {label}
          </p>
          <p
            className={`text-2xl font-semibold leading-none ${isHotfix ? "text-red-800 dark:text-red-200" : ""}`}
          >
            {value}
          </p>
          <p className="text-xs text-muted-foreground/70">
            {description}
          </p>
        </div>
        {icon}
      </CardContent>
    </Card>
  );
}

function SummaryCardsSkeleton() {
  return (
    <div className="grid gap-3 md:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton key={index} className="h-24" />
      ))}
    </div>
  );
}

export type DashboardSummaryCardsData = {
  activeCards: number;
  doneCards: number;
  developerCount: number;
  hotfixes: number;
};

export function DashboardSummaryCards(
  props: DashboardSummaryCardsData & { isLoading?: boolean }
) {
  if (props.isLoading) return <SummaryCardsSkeleton />;

  return (
    <section className="grid gap-3 md:grid-cols-4">
      <SummaryCard
        label="Cards ativos"
        value={props.activeCards}
        description="Itens atualmente em andamento no fluxo"
        icon={<BarChart3 className="h-6 w-6 text-muted-foreground" />}
      />
      <SummaryCard
        label="Concluídos"
        value={props.doneCards}
        description="Itens concluídos atualmente"
        icon={<CheckCircle2 className="h-6 w-6 text-emerald-700 dark:text-emerald-300" />}
      />
      <SummaryCard
        label="Responsáveis"
        value={props.developerCount}
        description="Pessoas com atividades no quadro"
        icon={<UserCircle2 className="h-6 w-6 text-muted-foreground" />}
      />
      <SummaryCard
        label="HOTFIX"
        value={props.hotfixes}
        description="Itens classificados como correção urgente"
        variant="hotfix"
        icon={<Flame className="h-6 w-6 text-red-600 dark:text-red-300" />}
      />
    </section>
  );
}
