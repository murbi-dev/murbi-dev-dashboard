import { mapJiraStatusToBusinessStatus } from "@/lib/status-mapper";
import type { DashboardIssue, IssueComplexity, IssuePriority } from "@/types/dashboard";
import type { JiraDashboardFieldMetadata } from "./field-metadata";
import type { JiraBoard, JiraIssue } from "./types";

const validPriorities = new Set(["Highest", "High", "Medium", "Low", "Lowest"]);
const validComplexities = new Set(["PP", "P", "M", "G", "GG"]);

export type JiraEpicDetailsByKey = Record<string, { name?: string; color?: string }>;

function getLatestStatusEntryDate(issue: JiraIssue, currentStatus: string): string | undefined {
  return issue.changelog?.histories
    .filter((history) =>
      history.items.some(
        (item) => item.field.toLowerCase() === "status" && item.toString === currentStatus
      )
    )
    .map((history) => history.created)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
}

function maxIsoDate(...dates: Array<string | undefined>): string {
  return dates
    .filter((date): date is string => Boolean(date))
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] as string;
}

function getComplexityField(issue: JiraIssue, fieldId?: string): IssueComplexity | undefined {
  if (!fieldId) {
    return undefined;
  }

  const value = issue.fields[fieldId];
  const rawValue =
    typeof value === "string"
      ? value
      : value &&
          typeof value === "object" &&
          "value" in value &&
          typeof value.value === "string"
        ? value.value
        : undefined;

  if (!rawValue) {
    return undefined;
  }

  const normalizedValue = rawValue.trim().toUpperCase();

  return validComplexities.has(normalizedValue) ? (normalizedValue as IssueComplexity) : undefined;
}

function getStringField(issue: JiraIssue, fieldId?: string): string | undefined {
  if (!fieldId) {
    return undefined;
  }

  const value = issue.fields[fieldId];

  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function getEpic(
  issue: JiraIssue,
  fieldMetadata: JiraDashboardFieldMetadata,
  epicDetailsByKey: JiraEpicDetailsByKey
): DashboardIssue["epic"] {
  const parent = issue.fields.parent;
  const parentIssueType = parent?.fields?.issuetype;

  if (parent?.key && (parentIssueType?.hierarchyLevel === 1 || parentIssueType?.name === "Epic")) {
    const epicDetails = epicDetailsByKey[parent.key];

    return {
      key: parent.key,
      name: epicDetails?.name ?? parent.fields?.summary,
      color: epicDetails?.color
    };
  }

  const epicKey = getStringField(issue, fieldMetadata.epicLinkFieldId);
  const epicName = getStringField(issue, fieldMetadata.epicNameFieldId);
  const epicDetails = epicKey ? epicDetailsByKey[epicKey] : undefined;

  if (!epicKey && !epicName) {
    return undefined;
  }

  return {
    key: epicKey,
    name: epicDetails?.name ?? epicName,
    color: epicDetails?.color
  };
}

export function normalizeJiraIssue(
  issue: JiraIssue,
  baseUrl: string,
  fieldMetadata: JiraDashboardFieldMetadata = {},
  epicDetailsByKey: JiraEpicDetailsByKey = {}
): DashboardIssue {
  const jiraStatus = issue.fields.status.name;
  const priority = issue.fields.priority?.name ?? "Unknown";
  const title = issue.fields.summary;
  const statusEntryDate = getLatestStatusEntryDate(issue, jiraStatus);
  const complexity = getComplexityField(issue, fieldMetadata.complexityFieldId);
  const epic = getEpic(issue, fieldMetadata, epicDetailsByKey);

  return {
    id: issue.id,
    key: issue.key,
    title,
    issueType: {
      name: issue.fields.issuetype.name,
      iconUrl: issue.fields.issuetype.iconUrl
    },
    complexity,
    epic,
    assignee: {
      name: issue.fields.assignee?.displayName ?? "Sem responsável",
      avatarUrl: issue.fields.assignee?.avatarUrls?.["48x48"]
    },
    priority: validPriorities.has(priority) ? (priority as IssuePriority) : "Unknown",
    jiraStatus,
    businessStatus: mapJiraStatusToBusinessStatus(jiraStatus),
    isHotfix: title.includes("[HOTFIX]"),
    createdAt: issue.fields.created,
    updatedAt: issue.fields.updated,
    statusChangedAt: maxIsoDate(
      statusEntryDate,
      issue.fields.statuscategorychangedate,
      issue.fields.created
    ),
    url: `${baseUrl}/browse/${issue.key}`
  };
}

export function normalizeBoardScope(board: JiraBoard) {
  return {
    id: board.id,
    name: board.name
  };
}
