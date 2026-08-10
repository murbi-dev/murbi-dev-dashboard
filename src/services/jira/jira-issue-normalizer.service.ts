import { isMappedJiraStatus, mapJiraStatusToBusinessStatus } from "@/lib/status-mapper";
import { getQaRejectionEvents, isHotfixIssue } from "@/lib/jira/jira-metrics.helper";
import type { DashboardIssue, IssueComplexity, IssuePriority, IssueTrack, PendingApproval } from "@/types/dashboard";
import type { JiraBoard, JiraDashboardFieldMetadata, JiraEpicDetailsByKey, JiraIssue } from "@/types/jira";

export class JiraIssueNormalizerService {
  private static readonly validPriorities = new Set(["HOTFIX", "Highest", "High", "Medium", "Low", "Lowest"]);
  private static readonly validComplexities = new Set(["PP", "P", "M", "G", "GG"]);
  /** Value of the Jira "Fluxo Dev" field that marks an issue as developed by AI. */
  private static readonly aiDevFlowValue = "dev ia";
  /** Value of the epic's "Divisão" field that marks the project track. */
  private static readonly projectDivisionValue = "projeto";
  /** Values of the "Aprovação Pendente" multiselect, mapped to our own names. */
  private static readonly pendingApprovalValues: Record<string, PendingApproval> = {
    negocio: "business",
    dev: "dev"
  };

  normalizeIssue(
    issue: JiraIssue,
    baseUrl: string,
    fieldMetadata: JiraDashboardFieldMetadata = {},
    epicDetailsByKey: JiraEpicDetailsByKey = {}
  ): DashboardIssue {
    const jiraStatus = issue.fields.status.name;
    const jiraStatusId = issue.fields.status.id;
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
      jiraStatusId,
      businessStatus: mapJiraStatusToBusinessStatus(jiraStatusId),
      isHotfix: isHotfixIssue(issue),
      isAiDev: this.getIsAiDev(issue, fieldMetadata.devFlowFieldId),
      track: this.getTrack(epic, epicDetailsByKey),
      pendingApprovals: this.getPendingApprovals(issue, fieldMetadata.pendingApprovalFieldId),
      isUnknownStatus: !isMappedJiraStatus(jiraStatusId),
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
    const rawValue = this.getOptionFieldValue(issue, fieldId);

    if (!rawValue) {
      return undefined;
    }

    const normalizedValue = rawValue.trim().toUpperCase();

    return JiraIssueNormalizerService.validComplexities.has(normalizedValue) ? (normalizedValue as IssueComplexity) : undefined;
  }

  /**
   * A card belongs to the project track only when its epic says so. No epic,
   * empty "Divisão" or any other value means sustaining — the same rule the
   * `dev-flow` skill applies when it decides which artefacts to produce.
   */
  private getTrack(epic: DashboardIssue["epic"], epicDetailsByKey: JiraEpicDetailsByKey): IssueTrack {
    const division = epic?.key ? epicDetailsByKey[epic.key]?.division : undefined;

    return division?.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") ===
      JiraIssueNormalizerService.projectDivisionValue
      ? "project"
      : "sustaining";
  }

  private getPendingApprovals(issue: JiraIssue, fieldId?: string): PendingApproval[] {
    return this.getMultiOptionFieldValues(issue, fieldId)
      .map((value) => JiraIssueNormalizerService.pendingApprovalValues[this.normalizeOptionValue(value)])
      .filter((approval): approval is PendingApproval => Boolean(approval));
  }

  private normalizeOptionValue(value: string): string {
    return value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  private getMultiOptionFieldValues(issue: JiraIssue, fieldId?: string): string[] {
    if (!fieldId) {
      return [];
    }

    const value = issue.fields[fieldId];

    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((option) => {
        if (typeof option === "string") {
          return option;
        }

        return option && typeof option === "object" && "value" in option && typeof option.value === "string"
          ? option.value
          : undefined;
      })
      .filter((option): option is string => Boolean(option));
  }

  private getIsAiDev(issue: JiraIssue, fieldId?: string): boolean {
    return this.getOptionFieldValue(issue, fieldId)?.trim().toLowerCase() === JiraIssueNormalizerService.aiDevFlowValue;
  }

  private getOptionFieldValue(issue: JiraIssue, fieldId?: string): string | undefined {
    if (!fieldId) {
      return undefined;
    }

    const value = issue.fields[fieldId];

    if (typeof value === "string") {
      return value;
    }

    if (value && typeof value === "object" && "value" in value && typeof value.value === "string") {
      return value.value;
    }

    return undefined;
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
