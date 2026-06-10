"use client";

import { useState } from "react";
import { HelpCircle } from "lucide-react";

export function TooltipContent() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        aria-label="Como essa métrica é calculada"
      >
        <HelpCircle className="h-3.5 w-3.5" />
        Como é calculado
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-2 w-72 rounded-lg border bg-card p-4 shadow-lg">
            <div className="space-y-3 text-sm">
              <div>
                <p className="font-semibold text-foreground">O que mede</p>
                <p className="text-muted-foreground">
                  Qualidade das entregas realizadas pelo time.
                </p>
              </div>
              <div>
                <p className="font-semibold text-foreground">Como é calculado</p>
                <p className="text-muted-foreground">
                  Percentual de tickets concluídos que não precisaram retornar para desenvolvimento após QA.
                </p>
              </div>
              <div>
                <p className="font-semibold text-foreground">Dados utilizados</p>
                <p className="text-muted-foreground">
                  Histórico completo de status do Jira.
                </p>
              </div>
              <div>
                <p className="font-semibold text-foreground">Como interpretar</p>
                <p className="text-muted-foreground">
                  Valores maiores indicam menos retrabalho e maior qualidade percebida no fluxo de entrega.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
