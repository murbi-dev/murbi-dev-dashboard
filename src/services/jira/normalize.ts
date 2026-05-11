import { mapJiraStatusToBusinessStatus } from "@/lib/status-mapper";
import type { DashboardIssue, IssuePriority } from "@/types/dashboard";
import type { JiraDashboardFieldMetadata } from "./field-metadata";
import type { JiraIssue, JiraSprint } from "./types";

const validPriorities = new Set(["Highest", "High", "Medium", "Low", "Lowest"]);

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

function splitSprintIds(value?: string | null): string[] {
  return value?.split(",").map((item) => item.trim()).filter(Boolean) ?? [];
}

function getSprintEntryDate(issue: JiraIssue, sprint: JiraSprint): string | undefined {
  const sprintId = String(sprint.id);

  return issue.changelog?.histories
    .filter((history) =>
      history.items.some((item) => {
        if (item.field.toLowerCase() !== "sprint") {
          return false;
        }

        const fromIds = splitSprintIds(item.from);
        const toIds = splitSprintIds(item.to);

        return !fromIds.includes(sprintId) && toIds.includes(sprintId);
      })
    )
    .map((history) => history.created)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
}

function maxIsoDate(...dates: Array<string | undefined>): string {
  return dates
    .filter((date): date is string => Boolean(date))
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] as string;
}

function getNumberField(issue: JiraIssue, fieldId?: string): number | undefined {
  if (!fieldId) {
    return undefined;
  }

  const value = issue.fields[fieldId];

  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
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
  sprint: JiraSprint,
  fieldMetadata: JiraDashboardFieldMetadata = {},
  epicDetailsByKey: JiraEpicDetailsByKey = {}
): DashboardIssue {
  const jiraStatus = issue.fields.status.name;
  const priority = issue.fields.priority?.name ?? "Unknown";
  const title = issue.fields.summary;
  const statusEntryDate = getLatestStatusEntryDate(issue, jiraStatus);
  const sprintEntryDate = getSprintEntryDate(issue, sprint);
  const storyPoints = getNumberField(issue, fieldMetadata.storyPointsFieldId);
  const epic = getEpic(issue, fieldMetadata, epicDetailsByKey);

  return {
    id: issue.id,
    key: issue.key,
    title,
    issueType: {
      name: issue.fields.issuetype.name,
      iconUrl: issue.fields.issuetype.iconUrl
    },
    storyPoints,
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
      sprintEntryDate,
      sprint.startDate,
      issue.fields.statuscategorychangedate,
      issue.fields.created
    ),
    url: `${baseUrl}/browse/${issue.key}`
  };
}

export function normalizeSprint(sprint: JiraSprint) {
  return {
    id: sprint.id,
    name: sprint.name,
    startedAt: sprint.startDate,
    endedAt: sprint.endDate
  };
}
