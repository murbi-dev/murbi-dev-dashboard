"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Flame } from "lucide-react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { FlowSkeleton } from "./components/FlowSkeleton";
import { LeadTimeSection } from "./components/LeadTimeSection";
import { ApprovalWaitSection } from "./components/ApprovalWaitSection";
import { AgingSection } from "./components/AgingSection";
import type { FlowMetricsPayload } from "@/types/flow";

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

function daysAgoISO(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split("T")[0];
}

export function FlowTab() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [startDate, setStartDate] = useState(daysAgoISO(30));
  const [endDate, setEndDate] = useState(todayISO());
  const [hotfixOnly, setHotfixOnly] = useState(false);
  const [data, setData] = useState<FlowMetricsPayload | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFlow = useCallback(async (start: string, end: string, onlyHotfix: boolean) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/metrics/flow?startDate=${encodeURIComponent(start)}&endDate=${encodeURIComponent(end)}&hotfixOnly=${onlyHotfix}`,
        { cache: "no-store" }
      );

      if (!response.ok) {
        throw new Error("Falha ao carregar métricas de fluxo.");
      }

      const payload = (await response.json()) as FlowMetricsPayload;
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
    fetchFlow(s, e, urlHotfix);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyFilters(onlyHotfix: boolean) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("startDate", startDate);
    params.set("endDate", endDate);
    params.set("hotfixOnly", String(onlyHotfix));
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    fetchFlow(startDate, endDate, onlyHotfix);
  }

  function handleApply() {
    applyFilters(hotfixOnly);
  }

  function handleToggleHotfix() {
    const next = !hotfixOnly;
    setHotfixOnly(next);
    applyFilters(next);
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="flow-start-date" className="mb-1 block text-xs font-medium text-muted-foreground">
            Data Inicial
          </label>
          <Input
            id="flow-start-date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-9 w-44"
          />
        </div>
        <div>
          <label htmlFor="flow-end-date" className="mb-1 block text-xs font-medium text-muted-foreground">
            Data Final
          </label>
          <Input
            id="flow-end-date"
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
        <FlowSkeleton />
      ) : data ? (
        <>
          {data.leadTime ? (
            <LeadTimeSection data={data.leadTime} byFlow={data.leadTimeByFlow} />
          ) : (
            <Card className="shadow-operational">
              <CardContent className="p-8 text-center text-sm text-muted-foreground">
                Nenhuma entrega concluída no período selecionado.
              </CardContent>
            </Card>
          )}

          {data.approvalWait ? (
            <ApprovalWaitSection data={data.approvalWait} />
          ) : (
            <Card className="shadow-operational">
              <CardContent className="p-8 text-center text-sm text-muted-foreground">
                Nenhum card passou pelo gate de aprovação de IA no período selecionado.
              </CardContent>
            </Card>
          )}

          {data.aging ? (
            <AgingSection data={data.aging} byFlow={data.agingByFlow} />
          ) : (
            <Card className="shadow-operational">
              <CardContent className="p-8 text-center text-sm text-muted-foreground">
                Nenhum ticket ativo no período selecionado.
              </CardContent>
            </Card>
          )}
        </>
      ) : null}
    </div>
  );
}
