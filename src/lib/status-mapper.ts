import type { BusinessStatus } from "@/types/dashboard";

export const BUSINESS_STATUSES: BusinessStatus[] = [
  "Waiting",
  "Planning",
  "In Development",
  "Validation",
  "Finalizing",
  "Done"
];

/**
 * Jira status **ids** — the only stable identity a status has.
 *
 * The display name is not: it is translated per the language of the account
 * that queries (a Portuguese account gets "Em andamento", an English one gets
 * "In Progress"), and it changes whenever someone renames the status in the
 * workflow. Both already broke this board once. Match by id; use the name only
 * for display.
 *
 * Confirmed against `/rest/api/3/project/MURBI/statuses`.
 */
export const JIRA_STATUS_ID = {
  BACKLOG: "10191",
  PENDING: "10011",
  PLANNING: "10224",
  IN_PROGRESS: "3",
  PULL_REQUEST: "10013",
  READY_FOR_QA: "10091",
  QA_TESTING: "10158",
  READY_FOR_PROD: "10125",
  DONE: "10012",
  REJECTED: "10014"
} as const;

export type JiraStatusId = (typeof JIRA_STATUS_ID)[keyof typeof JIRA_STATUS_ID];

export const STATUS_MAPPING: Record<BusinessStatus, string[]> = {
  Waiting: [JIRA_STATUS_ID.PENDING],
  Planning: [JIRA_STATUS_ID.PLANNING],
  "In Development": [JIRA_STATUS_ID.IN_PROGRESS, JIRA_STATUS_ID.PULL_REQUEST, JIRA_STATUS_ID.READY_FOR_QA],
  Validation: [JIRA_STATUS_ID.QA_TESTING],
  Finalizing: [JIRA_STATUS_ID.READY_FOR_PROD],
  Done: [JIRA_STATUS_ID.DONE]
};

/**
 * Order used inside the Planning and In Development columns, so the Jira status
 * dropdown follows the flow instead of the alphabet. By id, like everything else.
 */
export const COLUMN_STATUS_ID_ORDER: string[] = [
  JIRA_STATUS_ID.PLANNING,
  JIRA_STATUS_ID.IN_PROGRESS,
  JIRA_STATUS_ID.PULL_REQUEST,
  JIRA_STATUS_ID.READY_FOR_QA
];

const statusMappingById = Object.entries(STATUS_MAPPING).reduce(
  (acc, [businessStatus, statusIds]) => {
    for (const statusId of statusIds) {
      acc[statusId] = businessStatus as BusinessStatus;
    }

    return acc;
  },
  {} as Record<string, BusinessStatus>
);

export function mapJiraStatusToBusinessStatus(statusId: string): BusinessStatus {
  return statusMappingById[statusId.trim()] ?? "Waiting";
}

export function isMappedJiraStatus(statusId: string): boolean {
  return statusMappingById[statusId.trim()] !== undefined;
}
