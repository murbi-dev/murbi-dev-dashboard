"use client";

import {
  MetricsTrendSection,
  type TrendSeriesDefinition
} from "@/app/metrics/components/MetricsTrendSection";
import type { FlowMetricsPayload, FlowSeriesPoint } from "@/types/flow";

/**
 * Indicadores de fluxo que fazem sentido no tempo.
 *
 * Cada um é datado pelo evento que o produz: Lead Time e entregas pela conclusão,
 * Tempo de Aprovação pela primeira entrada no gate, Aging pela entrada em
 * andamento. Assim o gráfico decompõe o número do card acima dele.
 *
 * A ordem dos tokens de cor foi validada para daltonismo (ver `globals.css`);
 * trocar de slot exige revalidar.
 */
const FLOW_TREND_SERIES: TrendSeriesDefinition<FlowSeriesPoint>[] = [
  {
    id: "leadTimeAverage",
    label: "Lead Time médio",
    unit: "days",
    color: "var(--chart-1)",
    getValue: (point) => point.leadTimeAverage
  },
  {
    id: "leadTimeP50",
    label: "Lead Time P50",
    unit: "days",
    color: "var(--chart-2)",
    getValue: (point) => point.leadTimeP50
  },
  {
    id: "leadTimeAiAverage",
    label: "Lead Time (IA)",
    unit: "days",
    color: "var(--chart-3)",
    isAi: true,
    getValue: (point) => point.leadTimeAiAverage
  },
  {
    id: "leadTimeHumanAverage",
    label: "Lead Time (Humano)",
    unit: "days",
    color: "var(--chart-4)",
    getValue: (point) => point.leadTimeHumanAverage
  },
  {
    id: "agingAverage",
    label: "Aging médio",
    unit: "days",
    color: "var(--chart-5)",
    getValue: (point) => point.agingAverage
  },
  {
    id: "approvalWaitAverage",
    label: "Tempo de Aprovação (IA)",
    unit: "days",
    color: "var(--chart-6)",
    isAi: true,
    getValue: (point) => point.approvalWaitAverage
  },
  {
    id: "deliveries",
    label: "Entregas concluídas",
    unit: "cards",
    color: "var(--chart-7)",
    getValue: (point) => point.deliveries
  }
];

export function FlowTrendSection({ series }: { series: FlowMetricsPayload["series"] }) {
  return (
    <MetricsTrendSection
      title="Evolução no período"
      description="Como cada indicador se comportou dentro do período filtrado. Período sem card alimentando o indicador não vira zero: a linha liga as medições vizinhas e o ponto marca onde houve medição."
      series={series}
      definitions={FLOW_TREND_SERIES}
      defaultSelectedIds={["leadTimeAverage", "leadTimeP50"]}
    />
  );
}
