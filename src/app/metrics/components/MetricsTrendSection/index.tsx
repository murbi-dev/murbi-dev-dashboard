"use client";

/**
 * Seção de evolução dos indicadores, compartilhada pelas abas Quality e Flow.
 *
 * Cada aba só declara seus indicadores; a seção cuida da granularidade, da
 * seleção, do agrupamento por unidade e da tabela equivalente.
 *
 * **Um gráfico por unidade.** Indicadores em `%`, em `dias` e em `cards` nunca
 * dividem o mesmo desenho: dois eixos Y no mesmo plot inventam uma correlação
 * que não existe nos dados. A seleção do leitor é distribuída entre um gráfico
 * por unidade presente.
 *
 * A granularidade é só do gráfico e não refaz a busca no Jira — a API já manda
 * as três (diária, semanal e mensal) na mesma resposta.
 *
 * Bucket sem dado continua `null` e nunca vira zero; quem decide como desenhar
 * o vão é o `LineChart`, que liga as medições vizinhas e marca cada medição.
 */

import { useMemo, useState } from "react";
import { Sparkles, Table2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { LineChart, type LineChartSeries } from "@/components/ui/LineChart";
import { cn } from "@/lib/utils";
import { SERIES_GRANULARITIES, type SeriesBucket, type SeriesByGranularity, type SeriesGranularity } from "@/types/metrics-series";

export type TrendUnit = "percent" | "days" | "cards";

export type TrendSeriesDefinition<TPoint> = {
  id: string;
  label: string;
  unit: TrendUnit;
  /** Token da paleta categórica (`var(--chart-N)`). A cor segue o indicador. */
  color: string;
  /** Indicador exclusivo do fluxo `Dev IA`, marcado com o ícone de sempre. */
  isAi?: boolean;
  getValue: (point: TPoint) => number | null;
};

type MetricsTrendSectionProps<TPoint extends SeriesBucket> = {
  title: string;
  description: string;
  series: SeriesByGranularity<TPoint>;
  definitions: TrendSeriesDefinition<TPoint>[];
  defaultSelectedIds: string[];
};

const GRANULARITY_LABELS: Record<SeriesGranularity, string> = {
  daily: "Diário",
  weekly: "Semanal",
  monthly: "Mensal"
};

const UNIT_CONFIG: Record<TrendUnit, { caption: string; suffix: string; maxValue?: number }> = {
  percent: { caption: "Percentual das entregas", suffix: "%", maxValue: 100 },
  days: { caption: "Dias", suffix: "dias" },
  cards: { caption: "Cards", suffix: "cards" }
};

export function MetricsTrendSection<TPoint extends SeriesBucket>({
  title,
  description,
  series,
  definitions,
  defaultSelectedIds
}: MetricsTrendSectionProps<TPoint>) {
  const [granularity, setGranularity] = useState<SeriesGranularity>(() =>
    pickDefaultGranularity(series.daily.length)
  );
  const [selectedIds, setSelectedIds] = useState<string[]>(defaultSelectedIds);
  const [isTableVisible, setIsTableVisible] = useState(false);

  const points = series[granularity];
  const labels = useMemo(() => points.map((point) => point.label), [points]);

  const selectedDefinitions = definitions.filter((definition) => selectedIds.includes(definition.id));
  const unitGroups = groupByUnit(selectedDefinitions);

  function toggleSeries(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  }

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-md border bg-background p-1" role="group" aria-label="Granularidade do gráfico">
            {SERIES_GRANULARITIES.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={granularity === option}
                onClick={() => setGranularity(option)}
                className={cn(
                  "rounded px-3 py-1 text-xs font-medium transition-colors",
                  granularity === option
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {GRANULARITY_LABELS[option]}
              </button>
            ))}
          </div>

          <button
            type="button"
            aria-pressed={isTableVisible}
            onClick={() => setIsTableVisible((current) => !current)}
            className={cn(
              "inline-flex h-9 items-center gap-2 rounded-md border px-3 text-xs font-medium transition-colors",
              isTableVisible ? "bg-primary text-primary-foreground" : "bg-background hover:bg-accent"
            )}
          >
            <Table2 className="h-4 w-4" />
            Tabela
          </button>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {definitions.map((definition) => {
          const isSelected = selectedIds.includes(definition.id);

          return (
            <button
              key={definition.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => toggleSeries(definition.id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                isSelected
                  ? "border-foreground/20 bg-accent text-accent-foreground"
                  : "bg-background text-muted-foreground hover:text-foreground"
              )}
            >
              <span
                aria-hidden
                className={cn("h-0.5 w-3 shrink-0 rounded-full", !isSelected && "opacity-40")}
                style={{ backgroundColor: definition.color }}
              />
              {definition.isAi ? <Sparkles className="h-3 w-3 text-violet-600 dark:text-violet-400" /> : null}
              {definition.label}
            </button>
          );
        })}
      </div>

      {selectedDefinitions.length === 0 ? (
        <Card className="shadow-operational">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Selecione ao menos um indicador para ver a evolução no período.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {unitGroups.map(({ unit, definitions: unitDefinitions }) => (
            <Card key={unit} className="shadow-operational">
              <CardContent className="p-4">
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  {UNIT_CONFIG[unit].caption}
                </p>
                <LineChart
                  labels={labels}
                  unit={UNIT_CONFIG[unit].suffix}
                  maxValue={UNIT_CONFIG[unit].maxValue}
                  formatNumber={formatMetricNumber}
                  ariaLabel={`${title} — ${UNIT_CONFIG[unit].caption.toLowerCase()}, granularidade ${GRANULARITY_LABELS[granularity].toLowerCase()}`}
                  series={unitDefinitions.map<LineChartSeries>((definition) => ({
                    id: definition.id,
                    label: definition.label,
                    color: definition.color,
                    values: points.map((point) => definition.getValue(point))
                  }))}
                />
              </CardContent>
            </Card>
          ))}

          {isTableVisible ? (
            <Card className="shadow-operational">
              <CardContent className="overflow-x-auto p-0">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">
                        Período
                      </th>
                      {selectedDefinitions.map((definition) => (
                        <th
                          key={definition.id}
                          className="px-4 py-2 text-right text-xs font-medium text-muted-foreground"
                        >
                          {definition.label} ({UNIT_CONFIG[definition.unit].suffix})
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {points.map((point) => (
                      <tr key={point.start} className="border-b last:border-0">
                        <td className="whitespace-nowrap px-4 py-2 text-xs text-muted-foreground">
                          {formatBucketRange(point)}
                        </td>
                        {selectedDefinitions.map((definition) => {
                          const value = definition.getValue(point);

                          return (
                            <td
                              key={definition.id}
                              className="px-4 py-2 text-right text-xs tabular-nums"
                            >
                              {value === null ? "—" : formatMetricNumber(value)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          ) : null}
        </div>
      )}
    </section>
  );
}

/**
 * Agrupa as séries selecionadas por unidade, preservando a ordem em que os
 * indicadores foram declarados.
 */
function groupByUnit<TPoint>(
  definitions: TrendSeriesDefinition<TPoint>[]
): Array<{ unit: TrendUnit; definitions: TrendSeriesDefinition<TPoint>[] }> {
  const groups: Array<{ unit: TrendUnit; definitions: TrendSeriesDefinition<TPoint>[] }> = [];

  for (const definition of definitions) {
    const group = groups.find((item) => item.unit === definition.unit);

    if (group) {
      group.definitions.push(definition);
    } else {
      groups.push({ unit: definition.unit, definitions: [definition] });
    }
  }

  return groups;
}

/**
 * Escolhe a granularidade inicial pelo tamanho do período: um gráfico diário de
 * um ano vira um borrão, e um mensal de duas semanas vira um ponto só.
 */
function pickDefaultGranularity(dayCount: number): SeriesGranularity {
  if (dayCount <= 45) return "daily";
  if (dayCount <= 180) return "weekly";

  return "monthly";
}

function formatMetricNumber(value: number): string {
  const fixed = value % 1 === 0 ? value.toString() : value.toFixed(1);

  return fixed.replace(".", ",");
}

function formatBucketRange(bucket: SeriesBucket): string {
  return bucket.start === bucket.end
    ? formatIsoDate(bucket.start)
    : `${formatIsoDate(bucket.start)} a ${formatIsoDate(bucket.end)}`;
}

function formatIsoDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");

  return `${day}/${month}/${year}`;
}
