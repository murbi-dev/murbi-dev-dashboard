import { mapJiraStatusToBusinessStatus } from "@/lib/status-mapper";
import { getQaRejectionEvents } from "@/lib/jira/jira-metrics.helper";
import type { DashboardIssue, IssueComplexity, IssuePriority } from "@/types/dashboard";
import type { JiraBoard, JiraDashboardFieldMetadata, JiraEpicDetailsByKey, JiraIssue } from "@/types/jira";

export class JiraIssueNormalizerService {
  private static readonly validPriorities = new Set(["Highest", "High", "Medium", "Low", "Lowest"]);
  private static readonly validComplexities = new Set(["PP", "P", "M", "G", "GG"]);

  normalizeIssue(
    issue: JiraIssue,
    baseUrl: string,
    fieldMetadata: JiraDashboardFieldMetadata = {},
    epicDetailsByKey: JiraEpicDetailsByKey = {}
  ): DashboardIssue {
    const jiraStatus = issue.fields.status.name;
    const priority = issue.fields.priority?.name ?? "Unknown";
    const title = issue.fields.summary;
    const statusEntryDate = this.getLatestStatusEntryDate(issue, jiraStatus);
    const complexity = this.getComplexityField(issue, fieldMetadata.complexityFieldId);
    const epic = this.getEpic(issue, fieldMetadata, epicDetailsByKey);
    const qaRejections = getQaRejectionEvents(issue);

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
      priority: JiraIssueNormalizerService.validPriorities.has(priority) ? (priority as IssuePriority) : "Unknown",
      jiraStatus,
      businessStatus: mapJiraStatusToBusinessStatus(jiraStatus),
      isHotfix: title.includes("[HOTFIX]"),
      qaRejectionCount: qaRejections.length,
      qaRejections,
      createdAt: issue.fields.created,
      updatedAt: issue.fields.updated,
      dueDate: issue.fields.duedate ?? undefined,
      statusChangedAt: this.maxIsoDate(
        statusEntryDate,
        issue.fields.statuscategorychangedate,
        issue.fields.created
      ),
      url: `${baseUrl}/browse/${issue.key}`
    };
  }

  normalizeBoardScope(board: JiraBoard) {
    return {
      id: board.id,
      name: board.name
    };
  }

  private getLatestStatusEntryDate(issue: JiraIssue, currentStatus: string): string | undefined {
    return issue.changelog?.histories
      .filter((history) =>
        history.items.some(
          (item) => item.field.toLowerCase() === "status" && item.toString === currentStatus
        )
      )
      .map((history) => history.created)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
  }

  private maxIsoDate(...dates: Array<string | undefined>): string {
    return dates
      .filter((date): date is string => Boolean(date))
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] as string;
  }

  private getComplexityField(issue: JiraIssue, fieldId?: string): IssueComplexity | undefined {
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

    return JiraIssueNormalizerService.validComplexities.has(normalizedValue) ? (normalizedValue as IssueComplexity) : undefined;
  }

  private getStringField(issue: JiraIssue, fieldId?: string): string | undefined {
    if (!fieldId) {
      return undefined;
    }

    const value = issue.fields[fieldId];

    return typeof value === "string" && value.trim() ? value.trim() : undefined;
  }

  private getEpic(
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

    const epicKey = this.getStringField(issue, fieldMetadata.epicLinkFieldId);
    const epicName = this.getStringField(issue, fieldMetadata.epicNameFieldId);
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
}

export const jiraIssueNormalizerService = new JiraIssueNormalizerService();
