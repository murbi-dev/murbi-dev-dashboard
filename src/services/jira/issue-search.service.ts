import { jiraConfigProvider, JiraConfigProvider } from "@/lib/jira/jira-config.provider";
import { JiraClient } from "@/clients/jira/jira.client";
import { isHotfixIssue } from "@/lib/jira/jira-metrics.helper";
import type { IssueSearchPayload, IssueSearchResult } from "@/types/issue-search";
import type { JiraConfig, JiraIssue, JiraSearchResponse } from "@/types/jira";

export class JiraIssueSearchService {
  private static readonly issueKeyPattern = /^[A-Z][A-Z0-9]+-\d+$/i;
  private static readonly maxSearchResults = 15;

  constructor(
    private readonly configProvider: JiraConfigProvider = jiraConfigProvider,
    private readonly clientFactory: (config: JiraConfig) => JiraClient = (config) => new JiraClient(config)
  ) {}

  async searchIssues(query: string): Promise<IssueSearchPayload> {
    const normalizedQuery = query.trim();

    if (normalizedQuery.length < 2) {
      return {
        query: normalizedQuery,
        results: [],
        source: "jira",
        fetchedAt: new Date().toISOString()
      };
    }

    const config = this.configProvider.getConfig();

    if (!config) {
      throw new Error("Credenciais do Jira ausentes.");
    }

    try {
      const client = this.clientFactory(config);
      const fields = ["summary", "status", "priority", "assignee", "updated"].join(",");
      const jql = encodeURIComponent(this.buildSearchJql(normalizedQuery));
      const response = await client.get<JiraSearchResponse>(
        `/rest/api/3/search/jql?jql=${jql}&fields=${fields}&maxResults=${JiraIssueSearchService.maxSearchResults}`
      );

      return {
        query: normalizedQuery,
        results: response.issues.map((issue) => this.normalizeSearchIssue(issue, config.baseUrl)),
        source: "jira",
        fetchedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error("Error searching Jira issues:", error);

      throw error;
    }
  }

  private escapeJqlText(value: string): string {
    return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  }

  private buildSearchJql(query: string): string {
    const trimmedQuery = query.trim();
    const escapedQuery = this.escapeJqlText(trimmedQuery);

    if (JiraIssueSearchService.issueKeyPattern.test(trimmedQuery)) {
      return `issueKey = ${trimmedQuery.toUpperCase()} OR summary ~ "${escapedQuery}" ORDER BY updated DESC`;
    }

    return `summary ~ "${escapedQuery}" ORDER BY updated DESC`;
  }

  private normalizeSearchIssue(issue: JiraIssue, baseUrl: string): IssueSearchResult {
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
      isHotfix: isHotfixIssue(issue),
      updatedAt: issue.fields.updated,
      url: `${baseUrl}/browse/${issue.key}`
    };
  }
}

export const jiraIssueSearchService = new JiraIssueSearchService();
