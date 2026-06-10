"use client";

import { HelpCircle } from "lucide-react";
import { useState } from "react";
import type { QualityReworkDelivery } from "@/types/quality";
import { cn } from "@/lib/utils";

function TableTooltip() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        aria-label="Explicação da tabela"
      >
        <HelpCircle className="h-3.5 w-3.5" />
        O que é esta lista?
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-2 w-72 rounded-lg border bg-card p-4 shadow-lg">
            <p className="text-sm text-muted-foreground">
              Esta lista apresenta os tickets que retornaram do fluxo de QA para desenvolvimento ao menos uma vez
              durante o período selecionado.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

function getRejectionColorClass(count: number): string {
  if (count >= 5) return "text-red-600 dark:text-red-400";
  if (count >= 3) return "text-amber-600 dark:text-amber-400";
  return "text-muted-foreground";
}

export function ReworkDeliveriesTable({
  deliveries
}: {
  deliveries: QualityReworkDelivery[];
}) {
  if (deliveries.length === 0) return null;

  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-base font-semibold">Entregas com Retrabalho</h2>
        <TableTooltip />
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Ticket</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Resumo</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Responsável</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">Rejeições QA</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Status Atual</th>
            </tr>
          </thead>
          <tbody>
            {deliveries.map((delivery) => (
              <tr key={delivery.key} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-3 py-2 font-mono text-xs font-medium">{delivery.key}</td>
                <td className="max-w-xs truncate px-3 py-2" title={delivery.summary}>
                  {delivery.summary}
                </td>
                <td className="px-3 py-2 text-muted-foreground">{delivery.assignee}</td>
                <td className={cn("px-3 py-2 text-right font-semibold", getRejectionColorClass(delivery.rejectionCount))}>
                  {delivery.rejectionCount}
                </td>
                <td className="px-3 py-2">{delivery.currentStatus}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
