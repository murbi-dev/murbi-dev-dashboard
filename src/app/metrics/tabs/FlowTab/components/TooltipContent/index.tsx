"use client";

import { useState } from "react";
import { HelpCircle } from "lucide-react";

type Metric = "leadTime" | "aging" | "p50" | "p75" | "p90";

const content: Record<Metric, { title: string; sections: Array<{ label: string; text: string }> }> = {
  leadTime: {
    title: "Lead Time",
    sections: [
      {
        label: "O que mede",
        text: "Tempo necessário para transformar trabalho em entrega."
      },
      {
        label: "Como é calculado",
        text: "Tempo entre a primeira entrada em In Progress e a primeira entrada em Done."
      },
      {
        label: "Dados utilizados",
        text: "Histórico de mudanças de status do Jira."
      },
      {
        label: "Como interpretar",
        text: "Valores menores indicam maior velocidade de entrega. Valores altos normalmente indicam gargalos, filas ou excesso de trabalho em andamento."
      }
    ]
  },
  aging: {
    title: "Aging",
    sections: [
      {
        label: "O que mede",
        text: "Tempo que itens atualmente em andamento permanecem dentro do fluxo."
      },
      {
        label: "Como é calculado",
        text: "Tempo entre a primeira entrada em In Progress e o momento atual."
      },
      {
        label: "Dados utilizados",
        text: "Histórico de status e status atual do Jira."
      },
      {
        label: "Como interpretar",
        text: "Itens com Aging elevado costumam indicar gargalos, dependências ou bloqueios."
      }
    ]
  },
  p50: {
    title: "Percentil 50 (P50)",
    sections: [
      {
        label: "O que mede",
        text: "Metade das entregas concluídas no período teve lead time menor ou igual a este valor."
      },
      {
        label: "Como é calculado",
        text: "Os lead times de todas as entregas são ordenados do menor para o maior. O P50 é o valor que divide a lista ao meio."
      },
      {
        label: "Dados utilizados",
        text: "Lead time individual de cada entrega concluída no período."
      },
      {
        label: "Como interpretar",
        text: "Se o P50 é 3 dias, metade das entregas ficou pronta em até 3 dias. Ajuda a entender o comportamento típico do time."
      }
    ]
  },
  p75: {
    title: "Percentil 75 (P75)",
    sections: [
      {
        label: "O que mede",
        text: "75% das entregas concluídas no período teve lead time menor ou igual a este valor."
      },
      {
        label: "Como é calculado",
        text: "Os lead times de todas as entregas são ordenados do menor para o maior. O P75 é o valor que separa os 75% mais rápidos dos 25% mais lentos."
      },
      {
        label: "Dados utilizados",
        text: "Lead time individual de cada entrega concluída no período."
      },
      {
        label: "Como interpretar",
        text: "Ajuda a identificar o limite superior da maioria das entregas. Valores muito acima do P50 indicam variação no fluxo."
      }
    ]
  },
  p90: {
    title: "Percentil 90 (P90)",
    sections: [
      {
        label: "O que mede",
        text: "90% das entregas concluídas no período teve lead time menor ou igual a este valor."
      },
      {
        label: "Como é calculado",
        text: "Os lead times de todas as entregas são ordenados do menor para o maior. O P90 é o valor que separa os 90% mais rápidos dos 10% mais lentos."
      },
      {
        label: "Dados utilizados",
        text: "Lead time individual de cada entrega concluída no período."
      },
      {
        label: "Como interpretar",
        text: "Revela as entregas mais demoradas. Um P90 muito alto sugere gargalos recorrentes ou problemas com tickets complexos."
      }
    ]
  }
};

export function TooltipContent({ metric }: { metric: Metric }) {
  const [isOpen, setIsOpen] = useState(false);
  const { title, sections } = content[metric];

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        aria-label={`Como ${title} é calculado`}
      >
        <HelpCircle className="h-3.5 w-3.5" />
        Como é calculado
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-2 w-72 rounded-lg border bg-card p-4 shadow-lg">
            <div className="space-y-3 text-sm">
              {sections.map((section) => (
                <div key={section.label}>
                  <p className="font-semibold text-foreground">{section.label}</p>
                  <p className="text-muted-foreground">{section.text}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
