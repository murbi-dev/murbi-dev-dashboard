import { getJiraConfig } from "@/services/jira/config";
import { JiraClient } from "@/services/jira/client";
import { normalizeBoardScope, normalizeJiraIssue, type JiraEpicDetailsByKey } from "@/services/jira/normalize";
import { getCachedFieldMetadata } from "@/services/jira/metadata";
import { isMappedJiraStatus } from "@/lib/status-mapper";
import type { DashboardPayload } from "@/types/dashboard";
import type { JiraDashboardFieldMetadata } from "@/services/jira/field-metadata";
import type { JiraBoard, JiraSearchResponse } from "./types";
import { getMockDashboard } from "./mock-data";

const baseJiraIssueFields = [
  "summary",
  "status",
  "issuetype",
  "priority",
  "assignee",
  "parent",
  "created",
  "updated",
  "statuscategorychangedate"
];

function buildJiraIssueFields(fieldIds: Array<string | undefined>): string {
  return Array.from(new Set([...baseJiraIssueFields, ...fieldIds.filter((fieldId): fieldId is string => Boolean(fieldId))])).join(",");
}

async function fetchAllBoardKanbanIssues(client: JiraClient, boardId: string, issueFields: string) {
  const maxResults = 100;
  const issues: JiraSearchResponse["issues"] = [];
  let startAt = 0;
  let total = Number.POSITIVE_INFINITY;
  const jql = encodeURIComponent(
    `status != Backlog AND issuetype not in subTaskIssueTypes() AND (statusCategory != Done OR status CHANGED TO Done AFTER -14d)`
  );

  while (startAt < total) {
    const issueResponse = await client.get<JiraSearchResponse>(
      `/rest/agile/1.0/board/${boardId}/issue?jql=${jql}&fields=${issueFields}&expand=changelog&startAt=${startAt}&maxResults=${maxResults}`
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

function getIssueEpicKey(issue: JiraSearchResponse["issues"][number], fieldMetadata: JiraDashboardFieldMetadata): string | undefined {
  if (issue.fields.parent?.key) {
    return issue.fields.parent.key;
  }

  if (!fieldMetadata.epicLinkFieldId) {
    return undefined;
  }

  const epicKey = issue.fields[fieldMetadata.epicLinkFieldId];

  return typeof epicKey === "string" && epicKey.trim() ? epicKey.trim() : undefined;
}

async function fetchEpicDetailsByKey(
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

export async function getDashboardData(): Promise<DashboardPayload> {
  const config = getJiraConfig();

  if (!config) {
    return getMockDashboard("Credenciais do Jira ausentes. Usando dados simulados.");
  }

  try {
    const client = new JiraClient(config);
    const [board, fieldMetadata] = await Promise.all([
      client.get<JiraBoard>(`/rest/agile/1.0/board/${config.boardId}`),
      getCachedFieldMetadata(client, config.boardId)
    ]);

    const issueFields = buildJiraIssueFields([
      fieldMetadata.storyPointsFieldId,
      fieldMetadata.epicLinkFieldId,
      fieldMetadata.epicNameFieldId
    ]);
    const issues = (await fetchAllBoardKanbanIssues(client, config.boardId, issueFields)).filter((issue) =>
      isMappedJiraStatus(issue.fields.status.name)
    );
    const epicKeys = issues
      .map((issue) => getIssueEpicKey(issue, fieldMetadata))
      .filter((epicKey): epicKey is string => Boolean(epicKey));
    const epicDetailsByKey = await fetchEpicDetailsByKey(client, epicKeys, fieldMetadata);

    return {
      scope: normalizeBoardScope(board),
      issues: issues.map((issue) =>
        normalizeJiraIssue(issue, config.baseUrl, fieldMetadata, epicDetailsByKey)
      ),
      source: "jira",
      fetchedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error("Error fetching Jira data:", error);
    const message = error instanceof Error ? error.message : "erro desconhecido no Jira";

    return getMockDashboard(`Jira indisponível: ${message}. Usando dados simulados.`);
  }
}
