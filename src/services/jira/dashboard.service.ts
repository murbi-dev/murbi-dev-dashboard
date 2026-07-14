import { jiraConfigProvider, JiraConfigProvider } from "@/lib/jira/jira-config.provider";
import { JiraClient } from "@/clients/jira/jira.client";
import {
  jiraIssueNormalizerService,
  JiraIssueNormalizerService
} from "@/services/jira/jira-issue-normalizer.service";
import {
  jiraFieldMetadataCacheService,
  JiraFieldMetadataCacheService
} from "@/services/jira/field-metadata-cache.service";
import { isMappedJiraStatus } from "@/lib/status-mapper";
import type { DashboardPayload } from "@/types/dashboard";
import type { JiraBoard, JiraConfig, JiraDashboardFieldMetadata, JiraEpicDetailsByKey, JiraIssue, JiraSearchResponse } from "@/types/jira";

export class JiraDashboardService {
  private static readonly baseJiraIssueFields = [
    "summary",
    "status",
    "issuetype",
    "priority",
    "assignee",
    "parent",
    "created",
    "updated",
    "duedate",
    "statuscategorychangedate"
  ];
  private static readonly maxResults = 100;
  private static readonly boardJql = `status != Backlog AND issuetype != Epic AND issuetype not in subTaskIssueTypes() AND (statusCategory != Done OR status CHANGED TO Done AFTER -14d)`;

  constructor(
    private readonly configProvider: JiraConfigProvider = jiraConfigProvider,
    private readonly clientFactory: (config: JiraConfig) => JiraClient = (config) => new JiraClient(config),
    private readonly fieldMetadataCacheService: JiraFieldMetadataCacheService = jiraFieldMetadataCacheService,
    private readonly normalizer: JiraIssueNormalizerService = jiraIssueNormalizerService
  ) {}

  async getDashboardData(): Promise<DashboardPayload> {
    const config = this.configProvider.getConfig();

    if (!config) {
      throw new Error("Credenciais do Jira ausentes.");
    }

    try {
      const client = this.clientFactory(config);
      const [board, fieldMetadata] = await Promise.all([
        client.get<JiraBoard>(`/rest/agile/1.0/board/${config.boardId}`),
        this.fieldMetadataCacheService.getCachedFieldMetadata(client, config.boardId)
      ]);

      const issueFields = this.buildJiraIssueFields([
        fieldMetadata.complexityFieldId,
        fieldMetadata.devFlowFieldId,
        fieldMetadata.epicLinkFieldId,
        fieldMetadata.epicNameFieldId
      ]);
      const issues = (await this.fetchAllBoardKanbanIssues(client, config.boardId, issueFields)).filter(
        (issue) => this.isDashboardIssue(issue) && isMappedJiraStatus(issue.fields.status.name)
      );
      const epicKeys = issues
        .map((issue) => this.getIssueEpicKey(issue, fieldMetadata))
        .filter((epicKey): epicKey is string => Boolean(epicKey));
      const epicDetailsByKey = await this.fetchEpicDetailsByKey(client, epicKeys, fieldMetadata);

      return {
        scope: this.normalizer.normalizeBoardScope(board),
        issues: issues.map((issue) =>
          this.normalizer.normalizeIssue(issue, config.baseUrl, fieldMetadata, epicDetailsByKey)
        ),
        source: "jira",
        fetchedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error("Error fetching Jira data:", error);

      throw error;
    }
  }

  private buildJiraIssueFields(fieldIds: Array<string | undefined>): string {
    return Array.from(
      new Set([
        ...JiraDashboardService.baseJiraIssueFields,
        ...fieldIds.filter((fieldId): fieldId is string => Boolean(fieldId))
      ])
    ).join(",");
  }

  private async fetchAllBoardKanbanIssues(client: JiraClient, boardId: string, issueFields: string) {
    const issues: JiraSearchResponse["issues"] = [];
    let startAt = 0;
    let total = Number.POSITIVE_INFINITY;
    const jql = encodeURIComponent(JiraDashboardService.boardJql);

    while (startAt < total) {
      const issueResponse = await client.get<JiraSearchResponse>(
        `/rest/agile/1.0/board/${boardId}/issue?jql=${jql}&fields=${issueFields}&expand=changelog&startAt=${startAt}&maxResults=${JiraDashboardService.maxResults}`
      );

      issues.push(...issueResponse.issues);
      total = issueResponse.total;

      if (issueResponse.isLast || issueResponse.issues.length === 0) {
        break;
      }

      startAt += issueResponse.issues.length;
    }

    return issues;
  }

  private isDashboardIssue(issue: JiraIssue): boolean {
    const issueType = issue.fields.issuetype;
    const normalizedIssueTypeName = issueType.name.trim().toLowerCase();

    return normalizedIssueTypeName !== "epic" && issueType.hierarchyLevel !== 1 && issueType.subtask !== true;
  }

  private getIssueEpicKey(issue: JiraIssue, fieldMetadata: JiraDashboardFieldMetadata): string | undefined {
    if (issue.fields.parent?.key) {
      return issue.fields.parent.key;
    }

    if (!fieldMetadata.epicLinkFieldId) {
      return undefined;
    }

    const epicKey = issue.fields[fieldMetadata.epicLinkFieldId];

    return typeof epicKey === "string" && epicKey.trim() ? epicKey.trim() : undefined;
  }

  private async fetchEpicDetailsByKey(
    client: JiraClient,
    epicKeys: string[],
    fieldMetadata: JiraDashboardFieldMetadata
  ): Promise<JiraEpicDetailsByKey> {
    if (epicKeys.length === 0) {
      return {};
    }

    const uniqueKeys = Array.from(new Set(epicKeys));
    const detailsByKey: JiraEpicDetailsByKey = {};
    const fields = ["summary", fieldMetadata.issueColorFieldId].filter(Boolean).join(",");

    for (let index = 0; index < uniqueKeys.length; index += 50) {
      const keys = uniqueKeys.slice(index, index + 50);
      const jql = encodeURIComponent(`key in (${keys.join(",")})`);
      const response = await client.get<JiraSearchResponse>(
        `/rest/api/3/search/jql?jql=${jql}&fields=${fields}&maxResults=${keys.length}`
      );

      for (const issue of response.issues) {
        const color = fieldMetadata.issueColorFieldId ? issue.fields[fieldMetadata.issueColorFieldId] : undefined;

        detailsByKey[issue.key] = {
          name: issue.fields.summary,
          color: typeof color === "string" && color.trim() ? color.trim() : undefined
        };
      }
    }

    return detailsByKey;
  }
}

export const jiraDashboardService = new JiraDashboardService();
