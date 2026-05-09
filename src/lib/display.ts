import type { BusinessStatus, IssuePriority } from "@/types/dashboard";

export const businessStatusLabels: Record<BusinessStatus, string> = {
  Waiting: "Pendente",
  "In Development": "Em desenvolvimento",
  Validation: "Validação",
  Finalizing: "Finalizando",
  Done: "Concluído"
};

export const priorityLabels: Record<IssuePriority, string> = {
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
