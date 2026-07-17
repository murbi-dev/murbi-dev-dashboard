import type { BusinessStatus } from "@/types/dashboard";

export const BUSINESS_STATUSES: BusinessStatus[] = [
  "Waiting",
  "In Development",
  "Validation",
  "Finalizing",
  "Done"
];

/**
 * Canonical Jira status display names. Use these constants instead of
 * hardcoding the raw strings so the mapping stays in a single place.
 */
export const JIRA_STATUS = {
  PENDING: "Tarefas pendentes",
  APPROVAL: "Aprovação",
  IN_PROGRESS: "Em andamento",
  PULL_REQUEST: "Pull request",
  READY_FOR_QA: "Pronto para QA",
  QA_TESTING: "Teste QA",
  READY_FOR_PROD: "Pronto para PROD",
  DONE: "Concluído"
} as const;

export type JiraStatus = (typeof JIRA_STATUS)[keyof typeof JIRA_STATUS];

export const STATUS_MAPPING: Record<BusinessStatus, string[]> = {
  Waiting: [JIRA_STATUS.PENDING],
  "In Development": [JIRA_STATUS.IN_PROGRESS, JIRA_STATUS.APPROVAL, JIRA_STATUS.PULL_REQUEST, JIRA_STATUS.READY_FOR_QA],
  Validation: [JIRA_STATUS.QA_TESTING],
  Finalizing: [JIRA_STATUS.READY_FOR_PROD],
  Done: [JIRA_STATUS.DONE]
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

export function isMappedJiraStatus(status: string): boolean {
  return normalizedStatusMapping[normalizeStatusName(status)] !== undefined;
}
