import type { BusinessStatus } from "@/types/dashboard";

export const BUSINESS_STATUSES: BusinessStatus[] = [
  "Waiting",
  "In Development",
  "Validation",
  "Finalizing",
  "Done"
];

export const STATUS_MAPPING: Record<BusinessStatus, string[]> = {
  Waiting: ["To Do", "Tarefas pendentes"],
  "In Development": ["In Progress", "Em andamento", "Pull Request", "Pull request", "Pronto para QA"],
  Validation: ["QA", "GQ"],
  Finalizing: ["PRONTO PARA PROD"],
  Done: ["Done", "Concluído", "Concluido", "Rejeitado"]
};

const normalizedStatusMapping = Object.entries(STATUS_MAPPING).reduce(
  (acc, [businessStatus, jiraStatuses]) => {
    for (const jiraStatus of jiraStatuses) {
      acc[normalizeStatusName(jiraStatus)] = businessStatus as BusinessStatus;
    }

    return acc;
  },
  {} as Record<string, BusinessStatus>
);

function normalizeStatusName(status: string): string {
  return status.trim().toLowerCase();
}

export function mapJiraStatusToBusinessStatus(status: string): BusinessStatus {
  return normalizedStatusMapping[normalizeStatusName(status)] ?? "Waiting";
}
