"use client";

import { useQuery } from "@tanstack/react-query";
import type { DashboardPayload } from "@/types/dashboard";

async function fetchDashboard(): Promise<DashboardPayload> {
  const response = await fetch("/api/dashboard", { cache: "no-store" });

  if (!response.ok) {
    throw new Error("Falha ao carregar o painel");
  }

  return response.json() as Promise<DashboardPayload>;
}

export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: fetchDashboard,
    refetchInterval: 30_000
  });
}
