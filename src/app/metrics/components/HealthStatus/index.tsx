"use client";

import { Card, CardContent } from "@/components/ui/Card";

type HealthLevel = "healthy" | "attention" | "critical";

const healthConfig: Record<HealthLevel, { label: string; description: string; bar: string; dot: string }> = {
  healthy: {
    label: "Saudável",
    description: "O fluxo está operando dentro do esperado.",
    bar: "bg-emerald-500",
    dot: "bg-emerald-500"
  },
  attention: {
    label: "Atenção",
    description: "Alguns indicadores merecem acompanhamento.",
    bar: "bg-amber-500",
    dot: "bg-amber-500"
  },
  critical: {
    label: "Crítico",
    description: "Há indicadores que exigem ação imediata.",
    bar: "bg-red-500",
    dot: "bg-red-500"
  }
};

function getHealthLevel(hotfixes: number, qaWaiting: number): HealthLevel {
  if (hotfixes > 20 || qaWaiting > 25) return "critical";
  if (hotfixes > 10 || qaWaiting > 15) return "attention";
  return "healthy";
}

type HealthStatusProps = {
  hotfixes: number;
  qaWaiting: number;
};

export function HealthStatus({ hotfixes, qaWaiting }: HealthStatusProps) {
  const level = getHealthLevel(hotfixes, qaWaiting);
  const config = healthConfig[level];

  return (
    <section>
      <h2 className="mb-3 text-base font-semibold">Saúde Geral do Fluxo</h2>
      <Card className="shadow-operational">
        <CardContent className="flex items-center gap-4 p-4">
          <span className={`flex h-4 w-4 shrink-0 rounded-full ${config.dot}`} />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <p className="text-base font-semibold">{config.label}</p>
              <div className={`h-2 w-32 overflow-hidden rounded-full bg-muted`}>
                <div
                  className={`h-full rounded-full ${config.bar}`}
                  style={{
                    width: level === "healthy" ? "25%" : level === "attention" ? "60%" : "90%"
                  }}
                />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">{config.description}</p>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
