import { getJiraConfig } from "@/services/jira/config";
import { JiraClient } from "@/services/jira/client";
import { getCachedFieldMetadata } from "@/services/jira/metadata";
import { mapJiraStatusToBusinessStatus } from "@/lib/status-mapper";
import type { IssueSearchPayload, IssueSearchResult } from "@/types/issue-search";
import type { JiraIssue, JiraSearchResponse, JiraSprint } from "./types";
import { searchMockIssues } from "./mock-data";

const issueKeyPattern = /^[A-Z][A-Z0-9]+-\d+$/i;
const maxSearchResults = 15;

function escapeJqlText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function buildSearchJql(query: string): string {
  const trimmedQuery = query.trim();
  const escapedQuery = escapeJqlText(trimmedQuery);

  if (issueKeyPattern.test(trimmedQuery)) {
    return `issueKey = ${trimmedQuery.toUpperCase()} OR summary ~ "${escapedQuery}" ORDER BY updated DESC`;
  }

  return `summary ~ "${escapedQuery}" ORDER BY updated DESC`;
}

function parseSprint(value: unknown): JiraSprint | undefined {
  if (!value) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value
      .filter((item): item is JiraSprint => typeof item === "object" && item !== null && "name" in item)
      .sort((a, b) => {
        const dateA = new Date(a.startDate ?? a.endDate ?? a.completeDate ?? 0).getTime();
        const dateB = new Date(b.startDate ?? b.endDate ?? b.completeDate ?? 0).getTime();
        return dateB - dateA;
      })[0];
  }

  if (typeof value === "object" && "name" in value) {
    return value as JiraSprint;
  }

  return undefined;
}

function getLocationLabel(issue: JiraIssue, sprint?: JiraSprint): string {
  if (mapJiraStatusToBusinessStatus(issue.fields.status.name) === "Done") {
    return sprint ? `Concluído · ${sprint.name}` : "Concluído";
  }

  if (!sprint) {
    return "Backlog / sem sprint";
  }

  if (sprint.state === "active") {
    return `Sprint atual · ${sprint.name}`;
  }

  if (sprint.state === "future") {
    return `Próxima sprint · ${sprint.name}`;
  }

  return `Sprint encerrada · ${sprint.name}`;
}

function normalizeSearchIssue(
  issue: JiraIssue,
  baseUrl: string,
  sprintFieldId?: string
): IssueSearchResult {
  const sprint = parseSprint(sprintFieldId ? issue.fields[sprintFieldId] : undefined);
  const title = issue.fields.summary;

  return {
    id: issue.id,
    key: issue.key,
    title,
    jiraStatus: issue.fields.status.name,
    assignee: {
      name: issue.fields.assignee?.displayName ?? "Sem responsável",
      avatarUrl: issue.fields.assignee?.avatarUrls?.["48x48"]
    },
    isHotfix: title.includes("[HOTFIX]"),
    updatedAt: issue.fields.updated,
    sprint: sprint
      ? {
          name: sprint.name,
          state: sprint.state
        }
      : undefined,
    locationLabel: getLocationLabel(issue, sprint),
    url: `${baseUrl}/browse/${issue.key}`
  };
}

export async function searchIssues(query: string): Promise<IssueSearchPayload> {
  const normalizedQuery = query.trim();

  if (normalizedQuery.length < 2) {
    return {
      query: normalizedQuery,
      results: [],
      source: "jira",
      fetchedAt: new Date().toISOString()
    };
  }

  const config = getJiraConfig();

  if (!config) {
    return searchMockIssues(normalizedQuery, "Credenciais do Jira ausentes. Usando dados simulados.");
  }

  try {
    const client = new JiraClient(config);
    const fieldMetadata = await getCachedFieldMetadata(client, config.boardId);
    const fields = ["summary", "status", "assignee", "updated", fieldMetadata.sprintFieldId]
      .filter(Boolean)
      .join(",");
    const jql = encodeURIComponent(buildSearchJql(normalizedQuery));
    const response = await client.get<JiraSearchResponse>(
      `/rest/api/3/search/jql?jql=${jql}&fields=${fields}&maxResults=${maxSearchResults}`
    );

    return {
      query: normalizedQuery,
      results: response.issues.map((issue) => normalizeSearchIssue(issue, config.baseUrl, fieldMetadata.sprintFieldId)),
      source: "jira",
      fetchedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error("Error searching Jira issues:", error);
    const message = error instanceof Error ? error.message : "erro desconhecido no Jira";

    return searchMockIssues(normalizedQuery, `Busca Jira indisponível: ${message}. Usando dados simulados.`);
  }
}
