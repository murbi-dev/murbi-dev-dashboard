"use client";

import { useQuery } from "@tanstack/react-query";
import type { IssueSearchPayload } from "@/types/issue-search";

async function fetchIssueSearch(query: string): Promise<IssueSearchPayload> {
  const response = await fetch(`/api/issues/search?q=${encodeURIComponent(query)}`, { cache: "no-store" });

  if (!response.ok) {
    throw new Error("Falha ao buscar issues");
  }

  return response.json() as Promise<IssueSearchPayload>;
}

export function useIssueSearch(query: string) {
  return useQuery({
    queryKey: ["issue-search", query],
    queryFn: () => fetchIssueSearch(query),
    enabled: query.trim().length >= 2,
    staleTime: 30_000
  });
}
