"use client";

import {
  MetricsTrendSection,
  type TrendSeriesDefinition
} from "@/app/metrics/components/MetricsTrendSection";
import type { QualityMetricsPayload, QualitySeriesPoint } from "@/types/quality";

/**
 * Indicadores de qualidade que fazem sentido no tempo.
 *
 * A cor acompanha o indicador, nunca a posição na legenda: tirar uma série do
 * gráfico não repinta as que ficaram. A ordem dos tokens foi validada para
 * daltonismo — trocar de slot exige revalidar (ver `globals.css`).
 */
const QUALITY_TREND_SERIES: TrendSeriesDefinition<QualitySeriesPoint>[] = [
  {
    id: "qualityRate",
    label: "Delivery Quality Rate",
    unit: "percent",
    color: "var(--chart-1)",
    getValue: (point) => point.qualityRate
  },
  {
    id: "totalDeliveries",
    label: "Entregas",
    unit: "cards",
    color: "var(--chart-2)",
    getValue: (point) => point.totalDeliveries
  },
  {
    id: "deliveriesWithRework",
    label: "Entregas com retrabalho",
    unit: "cards",
    color: "var(--chart-4)",
    getValue: (point) => point.deliveriesWithRework
  },
  {
    id: "deliveriesWithoutRework",
    label: "Entregas sem retrabalho",
    unit: "cards",
    color: "var(--chart-5)",
    getValue: (point) => point.deliveriesWithoutRework
  },
  {
    id: "totalQaRejections",
    label: "QA Rejections",
    unit: "cards",
    color: "var(--chart-6)",
    getValue: (point) => point.totalQaRejections
  }
];

export function QualityTrendSection({ series }: { series: QualityMetricsPayload["series"] }) {
  return (
    <MetricsTrendSection
      title="Evolução no período"
      description="Como cada indicador se comportou dentro do período filtrado. Período sem entrega não vira zero: a linha liga as medições vizinhas e o ponto marca onde houve entrega."
      series={series}
      definitions={QUALITY_TREND_SERIES}
      defaultSelectedIds={["qualityRate", "totalDeliveries"]}
    />
  );
}
