"use client";

import { AlertTriangle, ExternalLink, Flame, Loader2, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useIssueSearch } from "@/hooks/use-issue-search";
import { formatRelativeTime } from "@/lib/time";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function useDebouncedValue(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedValue(value), delay);

    return () => window.clearTimeout(timeout);
  }, [delay, value]);

  return debouncedValue;
}

export function GlobalIssueSearch({ mode }: { mode: "standard" | "tv" }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebouncedValue(query.trim(), 300);
  const { data, error, isFetching } = useIssueSearch(debouncedQuery);
  const results = data?.results ?? [];
  const shouldSearch = debouncedQuery.length >= 2;

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsOpen(true);
      }

      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const timeout = window.setTimeout(() => inputRef.current?.focus(), 0);

    return () => window.clearTimeout(timeout);
  }, [isOpen]);

  return (
    <>
      <Button variant="outline" size={mode === "tv" ? "default" : "sm"} onClick={() => setIsOpen(true)}>
        <Search className="h-4 w-4" />
        Buscar issue
        <span className="hidden rounded border bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground sm:inline-flex">
          Ctrl/Cmd K
        </span>
      </Button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 bg-slate-950/45 p-3 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="mx-auto mt-[8vh] flex max-h-[82vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border bg-card text-card-foreground shadow-2xl">
            <div className="flex items-center gap-3 border-b p-3">
              <Search className="h-5 w-5 text-muted-foreground" />
              <Input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por chave, título ou termo"
                className="h-11 border-0 px-0 text-base shadow-none focus-visible:ring-0"
              />
              {isFetching ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} aria-label="Fechar busca">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="min-h-64 overflow-y-auto p-2">
              {data?.warning ? (
                <div className="mb-2 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-200">
                  <AlertTriangle className="h-4 w-4" />
                  {data.warning}
                </div>
              ) : null}

              {!query.trim() ? (
                <div className="px-4 py-14 text-center text-sm text-muted-foreground">
                  Busque issues por chave, título ou termo do card.
                </div>
              ) : null}

              {query.trim() && !shouldSearch ? (
                <div className="px-4 py-14 text-center text-sm text-muted-foreground">
                  Digite pelo menos 2 caracteres.
                </div>
              ) : null}

              {error ? (
                <div className="px-4 py-14 text-center text-sm text-red-700 dark:text-red-300">
                  Não foi possível buscar issues agora.
                </div>
              ) : null}

              {shouldSearch && !isFetching && !error && results.length === 0 ? (
                <div className="px-4 py-14 text-center text-sm text-muted-foreground">
                  Nenhuma issue encontrada.
                </div>
              ) : null}

              <div className="grid gap-1">
                {results.map((issue) => (
                  <a
                    key={issue.id}
                    href={issue.url}
                    target="_blank"
                    rel="noreferrer"
                    className="group rounded-md border border-transparent px-3 py-2 transition-colors hover:border-border hover:bg-muted/70"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-primary">{issue.key}</span>
                          <Badge variant="secondary" className="max-w-44 truncate">
                            {issue.jiraStatus}
                          </Badge>
                          {issue.isHotfix ? (
                            <Badge variant="hotfix">
                              <Flame className="mr-1 h-3 w-3" />
                              HOTFIX
                            </Badge>
                          ) : null}
                        </div>
                        <div className="mt-1 line-clamp-2 text-sm font-medium text-foreground">
                          {issue.title.replace("[HOTFIX]", "").trim()}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <span>{issue.assignee.name}</span>
                          <span>Atualizado {formatRelativeTime(issue.updatedAt)}</span>
                        </div>
                      </div>
                      <ExternalLink className={cn("mt-1 h-4 w-4 shrink-0 text-muted-foreground", "opacity-60 group-hover:opacity-100")} />
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
