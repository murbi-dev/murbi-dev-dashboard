import { getJiraConfig } from "@/services/jira/config";
import { JiraClient } from "@/services/jira/client";
import { normalizeJiraIssue, normalizeSprint } from "@/services/jira/normalize";
import type { DashboardPayload } from "@/types/dashboard";
import type { JiraSearchResponse, JiraSprintResponse } from "./types";
import { getMockDashboard } from "./mock-data";

const jiraIssueFields = [
  "summary",
  "status",
  "priority",
  "assignee",
  "created",
  "updated",
  "statuscategorychangedate"
].join(",");

async function fetchAllBoardSprintIssues(client: JiraClient, boardId: string, sprintId: number) {
  const maxResults = 100;
  const issues: JiraSearchResponse["issues"] = [];
  let startAt = 0;
  let total = Number.POSITIVE_INFINITY;
  const jql = encodeURIComponent(`Sprint = ${sprintId} AND issuetype not in subTaskIssueTypes()`);

  while (startAt < total) {
    const issueResponse = await client.get<JiraSearchResponse>(
      `/rest/agile/1.0/board/${boardId}/issue?jql=${jql}&fields=${jiraIssueFields}&expand=changelog&startAt=${startAt}&maxResults=${maxResults}`
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

export async function getDashboardData(): Promise<DashboardPayload> {
  const config = getJiraConfig();

  if (!config) {
    return getMockDashboard("Credenciais do Jira ausentes. Usando dados simulados.");
  }

  try {
    const client = new JiraClient(config);
    const sprintResponse = await client.get<JiraSprintResponse>(
      `/rest/agile/1.0/board/${config.boardId}/sprint?state=active`
    );
    const activeSprint = sprintResponse.values[0];

    if (!activeSprint) {
      return getMockDashboard("Nenhuma sprint ativa encontrada neste board. Usando dados simulados.");
    }

    const issues = await fetchAllBoardSprintIssues(client, config.boardId, activeSprint.id);

    return {
      sprint: normalizeSprint(activeSprint),
      issues: issues.map((issue) => normalizeJiraIssue(issue, config.baseUrl, activeSprint)),
      source: "jira",
      fetchedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error("Error fetching Jira data:", error);
    const message = error instanceof Error ? error.message : "erro desconhecido no Jira";

    return getMockDashboard(`Jira indisponível: ${message}. Usando dados simulados.`);
  }
}
