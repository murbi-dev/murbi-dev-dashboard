import type { BusinessStatus, IssuePriority } from "@/types/dashboard";

export const businessStatusLabels: Record<BusinessStatus, string> = {
  Waiting: "Pendente",
  "In Development": "Em Desenvolvimento",
  Validation: "Em Teste",
  Finalizing: "Aguardando Deploy",
  Done: "Em Produção"
};

export const priorityLabels: Record<IssuePriority, string> = {
  HOTFIX: "Hotfix",
  Highest: "Crítica",
  High: "Alta",
  Medium: "Média",
  Low: "Baixa",
  Lowest: "Muito baixa",
  Unknown: "Não informada"
};

export function getBusinessStatusLabel(status: BusinessStatus): string {
  return businessStatusLabels[status];
}

export function getPriorityLabel(priority: IssuePriority): string {
  return priorityLabels[priority];
}
