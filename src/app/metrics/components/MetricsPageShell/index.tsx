"use client";

import { ArrowLeft, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { formatRelativeTime } from "@/lib/time";
import { useDashboard } from "@/hooks/use-dashboard";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { OverviewTab } from "@/app/metrics/tabs/OverviewTab";
import { DevsTab } from "@/app/metrics/tabs/DevsTab";
import { QualityTab } from "@/app/metrics/tabs/QualityTab";
import { FlowTab } from "@/app/metrics/tabs/FlowTab";
import { cn } from "@/lib/utils";

type Tab = "overview" | "devs" | "quality" | "flow";

const tabs: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "devs", label: "Devs" },
  { id: "quality", label: "Quality" },
  { id: "flow", label: "Flow" }
];

export function MetricsPageShell() {
  const { data, error, isFetching, refetch } = useDashboard();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const activeTab = (searchParams.get("tab") as Tab | null) ?? "overview";

  function handleTabChange(tab: Tab) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <main className="min-h-screen bg-background p-4 md:p-6">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-4">
        <header className="flex flex-col gap-3 border-b border-border pb-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/"
                className="inline-flex h-9 items-center gap-2 rounded-md border bg-background px-3 text-sm font-medium hover:bg-accent"
              >
                <ArrowLeft className="h-4 w-4" />
                Dashboard
              </Link>
              <h1 className="text-2xl font-semibold tracking-normal">Métricas do Kanban</h1>
              <Badge variant="secondary">Jira ao vivo</Badge>
              {isFetching ? <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {data?.scope.name ?? "---"} · atualizado {data ? formatRelativeTime(data.fetchedAt) : "---"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </Button>
          </div>
        </header>

        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-200">
            A API do painel está indisponível. A tela continuará tentando a cada 30 segundos.
          </div>
        ) : null}

        <div className="flex gap-1 border-b border-border" role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                "rounded-t-md px-4 py-2 text-sm font-medium transition-colors",
                activeTab === tab.id
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "overview" && <OverviewTab />}
        {activeTab === "devs" && <DevsTab />}
        {activeTab === "quality" && <QualityTab />}
        {activeTab === "flow" && <FlowTab />}
      </div>
    </main>
  );
}
