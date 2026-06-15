"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Flame,
  RotateCcw,
  TrendingUp,
  XCircle
} from "lucide-react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { QualitySkeleton } from "./components/QualitySkeleton";
import { TooltipContent } from "./components/TooltipContent";
import { ReworkDeliveriesTable } from "./components/ReworkDeliveriesTable";
import type { QualityMetricsPayload } from "@/types/quality";

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

function daysAgoISO(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split("T")[0];
}

function QualityDistributionBar({
  withRework,
  withoutRework,
  total
}: {
  withRework: number;
  withoutRework: number;
  total: number;
}) {
  if (total === 0) return null;

  const withPct = Math.round((withRework / total) * 100);
  const withoutPct = 100 - withPct;

  return (
    <section>
      <h2 className="mb-3 text-base font-semibold">Distribuição da Qualidade</h2>
      <Card className="shadow-operational">
        <CardContent className="p-4">
          <div className="flex h-4 overflow-hidden rounded-full bg-muted">
            <div
              className="bg-emerald-500 transition-all"
              style={{ width: `${withoutPct}%` }}
              title={`Sem retrabalho: ${withoutRework} (${withoutPct}%)`}
            />
            <div
              className="bg-amber-500 transition-all"
              style={{ width: `${withPct}%` }}
              title={`Com retrabalho: ${withRework} (${withPct}%)`}
            />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="flex items-center gap-3 rounded-md border bg-background px-3 py-2">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <div>
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                  {withoutRework} ({withoutPct}%)
                </p>
                <p className="text-xs text-muted-foreground">Sem retrabalho</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-md border bg-background px-3 py-2">
              <XCircle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
              <div>
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                  {withRework} ({withPct}%)
                </p>
                <p className="text-xs text-muted-foreground">Com retrabalho</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

export function QualityTab() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [startDate, setStartDate] = useState(daysAgoISO(30));
  const [endDate, setEndDate] = useState(todayISO());
  const [hotfixOnly, setHotfixOnly] = useState(false);
  const [data, setData] = useState<QualityMetricsPayload | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQuality = useCallback(async (start: string, end: string, onlyHotfix: boolean) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/metrics/quality?startDate=${encodeURIComponent(start)}&endDate=${encodeURIComponent(end)}&hotfixOnly=${onlyHotfix}`,
        { cache: "no-store" }
      );

      if (!response.ok) {
        throw new Error("Falha ao carregar métricas de qualidade.");
      }

      const payload = (await response.json()) as QualityMetricsPayload;
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const urlStart = searchParams.get("startDate");
    const urlEnd = searchParams.get("endDate");
    const urlHotfix = searchParams.get("hotfixOnly") === "true";
    const s = urlStart ?? daysAgoISO(30);
    const e = urlEnd ?? todayISO();
    setStartDate(s);
    setEndDate(e);
    setHotfixOnly(urlHotfix);
    fetchQuality(s, e, urlHotfix);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyFilters(onlyHotfix: boolean) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("startDate", startDate);
    params.set("endDate", endDate);
    params.set("hotfixOnly", String(onlyHotfix));
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    fetchQuality(startDate, endDate, onlyHotfix);
  }

  function handleApply() {
    applyFilters(hotfixOnly);
  }

  function handleToggleHotfix() {
    const next = !hotfixOnly;
    setHotfixOnly(next);
    applyFilters(next);
  }

  const qualityRate = data?.qualityRate ?? null;
  const qualityColorClass =
    qualityRate !== null
      ? qualityRate >= 80
        ? "text-emerald-600 dark:text-emerald-400"
        : qualityRate >= 50
          ? "text-amber-600 dark:text-amber-400"
          : "text-red-600 dark:text-red-400"
      : "";

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="quality-start-date" className="mb-1 block text-xs font-medium text-muted-foreground">
            Data Inicial
          </label>
          <Input
            id="quality-start-date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-9 w-44"
          />
        </div>
        <div>
          <label htmlFor="quality-end-date" className="mb-1 block text-xs font-medium text-muted-foreground">
            Data Final
          </label>
          <Input
            id="quality-end-date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-9 w-44"
          />
        </div>
        <Button variant="default" size="sm" onClick={handleApply} disabled={isLoading}>
          Aplicar
        </Button>
        <Button
          variant={hotfixOnly ? "default" : "outline"}
          size="sm"
          onClick={handleToggleHotfix}
          disabled={isLoading}
        >
          <Flame className="h-4 w-4" />
          Apenas HOTFIX
        </Button>
      </section>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <QualitySkeleton />
      ) : data ? (
        <>
          <section className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <Card className="shadow-operational md:col-span-2 lg:col-span-2">
              <CardHeader className="flex flex-row items-start justify-between p-4 pb-2">
                <div>
                  <h2 className="text-base font-semibold">Delivery Quality Rate</h2>
                  <p className="text-xs text-muted-foreground">
                    Percentual de entregas que passaram pelo fluxo sem retrabalho.
                  </p>
                </div>
                <TrendingUp className="h-6 w-6 text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="flex flex-col gap-1">
                  <span className={cn("text-4xl font-bold", qualityColorClass)}>
                    {qualityRate}%
                  </span>
                  <TooltipContent />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-operational">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Total de entregas</p>
                  <p className="text-2xl font-semibold">{data.totalDeliveries}</p>
                </div>
                <CheckCircle2 className="h-6 w-6 text-muted-foreground" />
              </CardContent>
            </Card>

            <Card className="shadow-operational">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Entregas com retrabalho</p>
                  <p className="text-2xl font-semibold">{data.deliveriesWithRework}</p>
                </div>
                <RotateCcw className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <Card className="shadow-operational">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Entregas sem retrabalho</p>
                  <p className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
                    {data.deliveriesWithoutRework}
                  </p>
                </div>
                <CheckCircle2 className="h-6 w-6 text-emerald-700 dark:text-emerald-300" />
              </CardContent>
            </Card>

            <Card className="shadow-operational">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">QA Rejections</p>
                  <p className="text-2xl font-semibold text-amber-600 dark:text-amber-400">
                    {data.totalQaRejections}
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    Total de rejeições ocorridas
                  </p>
                </div>
                <XCircle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </CardContent>
            </Card>

            <Card className="shadow-operational md:col-span-2 lg:col-span-2">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-6">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Período</p>
                    <p className="text-sm text-foreground">
                      {data.dateRange.start} a {data.dateRange.end}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <QualityDistributionBar
            withRework={data.deliveriesWithRework}
            withoutRework={data.deliveriesWithoutRework}
            total={data.totalDeliveries}
          />

          <ReworkDeliveriesTable deliveries={data.reworkDeliveries} />
        </>
      ) : null}
    </div>
  );
}
