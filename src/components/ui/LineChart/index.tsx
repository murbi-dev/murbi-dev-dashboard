"use client";

/**
 * Gráfico de linhas em SVG, sem dependência externa.
 *
 * Regras de leitura que o componente garante:
 *
 * - **um eixo por gráfico**: todas as séries precisam compartilhar a mesma
 *   unidade. Séries de unidades diferentes vão em gráficos separados, nunca em
 *   dois eixos Y no mesmo desenho;
 * - bucket sem dado é `null` e **nunca vira zero**: a linha liga as duas
 *   medições vizinhas e um marcador mostra onde há medição de verdade. Quebrar
 *   o traço em cada lacuna picotava a linha em cacos ilegíveis, porque a maior
 *   parte dos dias não tem entrega alguma;
 * - a cor identifica a série, mas nunca sozinha: há legenda (no componente pai),
 *   rótulo no fim da linha e leitura por teclado;
 * - marcadores levam anel de 2px na cor da superfície para continuarem legíveis
 *   quando duas linhas se cruzam.
 */

import { useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { useElementWidth } from "@/hooks/use-element-width";

export type LineChartSeries = {
  id: string;
  label: string;
  /** Cor CSS da série, normalmente um token `var(--chart-N)`. */
  color: string;
  values: (number | null)[];
};

type LineChartProps = {
  /** Rótulo do eixo X de cada ponto, na mesma ordem dos `values`. */
  labels: string[];
  series: LineChartSeries[];
  /** Unidade compartilhada por todas as séries (ex.: `dias`, `cards`, `%`). */
  unit: string;
  formatNumber: (value: number) => string;
  /** Fixa o topo do eixo Y — usado por percentuais, que vão sempre até 100. */
  maxValue?: number;
  height?: number;
  ariaLabel: string;
};

const PADDING_TOP = 14;
const PADDING_BOTTOM = 26;
const PADDING_LEFT = 48;
const PADDING_RIGHT_WITH_LABELS = 64;
const PADDING_RIGHT_PLAIN = 16;

/** Acima disso os rótulos de fim de linha viram poluição e saem de cena. */
const MAX_SERIES_WITH_END_LABELS = 4;

/** Distância vertical mínima entre dois rótulos de fim de linha. */
const END_LABEL_MIN_GAP = 14;

/**
 * Acima disso os marcadores viram uma corrente de bolinhas e escondem a linha —
 * aí só a própria linha basta.
 */
const MAX_POINT_MARKERS = 40;

export function LineChart({
  labels,
  series,
  unit,
  formatNumber,
  maxValue,
  height = 240,
  ariaLabel
}: LineChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const width = useElementWidth(containerRef);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const hasData = series.some((item) => item.values.some((value) => value !== null));
  const showEndLabels = series.length <= MAX_SERIES_WITH_END_LABELS;
  const paddingRight = showEndLabels ? PADDING_RIGHT_WITH_LABELS : PADDING_RIGHT_PLAIN;

  const plotWidth = Math.max(0, width - PADDING_LEFT - paddingRight);
  const plotHeight = Math.max(0, height - PADDING_TOP - PADDING_BOTTOM);

  const ticks = useMemo(
    () => buildTicks(maxValue ?? findMaxValue(series)),
    [maxValue, series]
  );
  const domainMax = ticks[ticks.length - 1];

  function xFor(index: number): number {
    if (labels.length <= 1) return PADDING_LEFT + plotWidth / 2;

    return PADDING_LEFT + (index * plotWidth) / (labels.length - 1);
  }

  function yFor(value: number): number {
    return PADDING_TOP + plotHeight - (value / domainMax) * plotHeight;
  }

  function handlePointerMove(event: PointerEvent<SVGSVGElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const offsetX = event.clientX - bounds.left;

    setActiveIndex(findNearestIndex(offsetX, labels.length, PADDING_LEFT, plotWidth));
  }

  function handleKeyDown(event: KeyboardEvent<SVGSVGElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;

    event.preventDefault();

    const step = event.key === "ArrowLeft" ? -1 : 1;
    const current = activeIndex ?? labels.length - 1;

    setActiveIndex(Math.min(Math.max(current + step, 0), labels.length - 1));
  }

  const xLabelStep = buildXLabelStep(labels.length, plotWidth);
  const endLabels = showEndLabels ? buildEndLabels(series, xFor, yFor, labels.length) : [];

  return (
    <div ref={containerRef} className="relative w-full">
      {width > 0 && hasData ? (
        <>
          <svg
            width={width}
            height={height}
            role="img"
            aria-label={ariaLabel}
            tabIndex={0}
            className="touch-none outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onPointerMove={handlePointerMove}
            onPointerLeave={() => setActiveIndex(null)}
            onFocus={() => setActiveIndex(labels.length - 1)}
            onBlur={() => setActiveIndex(null)}
            onKeyDown={handleKeyDown}
          >
            {ticks.map((tick) => (
              <g key={tick}>
                <line
                  x1={PADDING_LEFT}
                  x2={PADDING_LEFT + plotWidth}
                  y1={yFor(tick)}
                  y2={yFor(tick)}
                  stroke="hsl(var(--border))"
                  strokeWidth={1}
                />
                <text
                  x={PADDING_LEFT - 8}
                  y={yFor(tick)}
                  textAnchor="end"
                  dominantBaseline="middle"
                  className="fill-muted-foreground text-[10px] tabular-nums"
                >
                  {formatNumber(tick)}
                </text>
              </g>
            ))}

            {labels.map((label, index) =>
              (labels.length - 1 - index) % xLabelStep === 0 ? (
                <text
                  key={`${label}-${index}`}
                  x={xFor(index)}
                  y={height - 8}
                  textAnchor="middle"
                  className="fill-muted-foreground text-[10px] tabular-nums"
                >
                  {label}
                </text>
              ) : null
            )}

            {activeIndex !== null ? (
              <line
                x1={xFor(activeIndex)}
                x2={xFor(activeIndex)}
                y1={PADDING_TOP}
                y2={PADDING_TOP + plotHeight}
                stroke="hsl(var(--muted-foreground))"
                strokeWidth={1}
              />
            ) : null}

            {series.map((item) => (
              <path
                key={item.id}
                d={buildPath(item.values, xFor, yFor)}
                fill="none"
                stroke={item.color}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}

            {series.map((item) => {
              const measured = findMeasuredIndexes(item.values);

              if (measured.length > MAX_POINT_MARKERS) return null;

              return measured.map((index) => (
                <circle
                  key={`${item.id}-point-${index}`}
                  cx={xFor(index)}
                  cy={yFor(item.values[index] as number)}
                  r={3}
                  fill={item.color}
                  stroke="hsl(var(--card))"
                  strokeWidth={2}
                />
              ));
            })}

            {activeIndex !== null
              ? series.map((item) =>
                  item.values[activeIndex] !== null ? (
                    <circle
                      key={`${item.id}-active`}
                      cx={xFor(activeIndex)}
                      cy={yFor(item.values[activeIndex] as number)}
                      r={4}
                      fill={item.color}
                      stroke="hsl(var(--card))"
                      strokeWidth={2}
                    />
                  ) : null
                )
              : null}

            {endLabels.map((endLabel) => (
              <g key={endLabel.id}>
                <circle
                  cx={endLabel.x}
                  cy={endLabel.y}
                  r={4}
                  fill={endLabel.color}
                  stroke="hsl(var(--card))"
                  strokeWidth={2}
                />
                <text
                  x={endLabel.x + 8}
                  y={endLabel.y}
                  dominantBaseline="middle"
                  className="fill-muted-foreground text-[10px] tabular-nums"
                >
                  {formatNumber(endLabel.value)}
                </text>
              </g>
            ))}
          </svg>

          {activeIndex !== null ? (
            <div
              role="status"
              className="pointer-events-none absolute top-2 z-10 min-w-[9rem] max-w-[14rem] rounded-md border bg-card p-2 shadow-md"
              style={{ left: clampTooltipLeft(xFor(activeIndex), width) }}
            >
              <p className="mb-1 text-[11px] font-medium text-muted-foreground">
                {labels[activeIndex]}
              </p>
              <ul className="flex flex-col gap-1">
                {series.map((item) => (
                  <li key={item.id} className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className="h-0.5 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-xs font-semibold tabular-nums text-foreground">
                      {item.values[activeIndex] === null
                        ? "—"
                        : `${formatNumber(item.values[activeIndex] as number)} ${unit}`}
                    </span>
                    <span className="truncate text-[11px] text-muted-foreground">{item.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      ) : (
        <div
          className="flex items-center justify-center text-sm text-muted-foreground"
          style={{ height }}
        >
          {width > 0 ? "Sem dados no período para os indicadores selecionados." : null}
        </div>
      )}
    </div>
  );
}

/**
 * Monta o `path` ligando as medições vizinhas e passando por cima dos buckets
 * sem dado. O bucket vazio não vira ponto no eixo — o traço apenas atravessa o
 * vão até a próxima medição.
 */
function buildPath(
  values: (number | null)[],
  xFor: (index: number) => number,
  yFor: (value: number) => number
): string {
  let path = "";

  values.forEach((value, index) => {
    if (value === null) return;

    path += `${path === "" ? "M" : "L"}${xFor(index)} ${yFor(value)} `;
  });

  return path.trim();
}

/**
 * Índices que têm medição de verdade. Marcá-los é o que separa "medimos e deu
 * isso" de "a linha só passou por aqui" — sem eles a interpolação viraria dado.
 */
function findMeasuredIndexes(values: (number | null)[]): number[] {
  const measured: number[] = [];

  values.forEach((value, index) => {
    if (value !== null) {
      measured.push(index);
    }
  });

  return measured;
}

/**
 * Rótulo do último valor de cada série. Rótulo que colidiria com outro é
 * descartado — empilhar rótulos os desgruda da linha e vira ruído.
 */
function buildEndLabels(
  series: LineChartSeries[],
  xFor: (index: number) => number,
  yFor: (value: number) => number,
  pointCount: number
): Array<{ id: string; color: string; value: number; x: number; y: number }> {
  const candidates = series
    .map((item) => {
      for (let index = pointCount - 1; index >= 0; index -= 1) {
        const value = item.values[index];

        if (value !== null && value !== undefined) {
          return { id: item.id, color: item.color, value, x: xFor(index), y: yFor(value) };
        }
      }

      return null;
    })
    .filter((candidate): candidate is NonNullable<typeof candidate> => candidate !== null)
    .sort((a, b) => a.y - b.y);

  const placed: typeof candidates = [];

  for (const candidate of candidates) {
    const previous = placed[placed.length - 1];

    if (previous && candidate.y - previous.y < END_LABEL_MIN_GAP) continue;

    placed.push(candidate);
  }

  return placed;
}

/**
 * Escadas "boas" de eixo (1, 2, 5 × potência de 10) para o topo do domínio.
 */
function buildTicks(maxValue: number, tickCount = 4): number[] {
  if (!Number.isFinite(maxValue) || maxValue <= 0) return [0, 1];

  const rawStep = maxValue / tickCount;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalized = rawStep / magnitude;
  const niceStep = (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) * magnitude;

  const ticks: number[] = [];

  for (let value = 0; value < maxValue + niceStep; value += niceStep) {
    ticks.push(Math.round(value * 100) / 100);
  }

  return ticks;
}

function findMaxValue(series: LineChartSeries[]): number {
  let max = 0;

  for (const item of series) {
    for (const value of item.values) {
      if (value !== null && value > max) {
        max = value;
      }
    }
  }

  return max;
}

/**
 * A mira busca o X mais próximo: o leitor mira numa data, nunca numa linha de
 * 2px.
 */
function findNearestIndex(
  offsetX: number,
  pointCount: number,
  paddingLeft: number,
  plotWidth: number
): number {
  if (pointCount <= 1) return 0;

  const ratio = (offsetX - paddingLeft) / plotWidth;

  return Math.min(Math.max(Math.round(ratio * (pointCount - 1)), 0), pointCount - 1);
}

/**
 * Quantos pontos pular entre rótulos do eixo X, mantendo o último sempre
 * visível.
 */
function buildXLabelStep(pointCount: number, plotWidth: number): number {
  const maxLabels = Math.max(2, Math.floor(plotWidth / 56));

  return Math.max(1, Math.ceil(pointCount / maxLabels));
}

function clampTooltipLeft(x: number, width: number): number {
  const tooltipWidth = 176;

  return Math.min(Math.max(x + 12, 8), Math.max(8, width - tooltipWidth - 8));
}
