import { describe, expect, it } from "vitest";
import { JiraClient } from "@/clients/jira/jira.client";
import { JiraDashboardService } from "@/services/jira/dashboard.service";
import { JiraFieldMetadataCacheService } from "@/services/jira/field-metadata-cache.service";
import { JiraIssueSearchService } from "@/services/jira/issue-search.service";
import { jiraIssueFixture } from "./fixtures/jira-issues";
import type { JiraBoard, JiraConfig, JiraDashboardFieldMetadata, JiraSearchResponse } from "@/types/jira";

const missingConfigProvider = {
  getConfig: () => null
};

const jiraConfig: JiraConfig = {
  baseUrl: "https://murbi-team.atlassian.net",
  email: "dev@example.com",
  apiToken: "jira-token",
  boardId: "42"
};

describe("Jira services", () => {
  it("does not fall back to dashboard mock data when Jira credentials are missing", async () => {
    const service = new JiraDashboardService(missingConfigProvider);

    await expect(service.getDashboardData()).rejects.toThrow("Credenciais do Jira ausentes.");
  });

  it("does not fall back to search mock data when Jira credentials are missing", async () => {
    const service = new JiraIssueSearchService(missingConfigProvider);

    await expect(service.searchIssues("MURBI-571")).rejects.toThrow("Credenciais do Jira ausentes.");
  });

  it("returns an empty Jira search payload for short queries without requiring credentials", async () => {
    const service = new JiraIssueSearchService(missingConfigProvider);

    await expect(service.searchIssues("m")).resolves.toMatchObject({
      query: "m",
      results: [],
      source: "jira"
    });
  });

  it("filters epics and subtasks from board dashboard issues", async () => {
    const requestedPaths: string[] = [];
    const board: JiraBoard = { id: 42, name: "Murbi Dev" };
    const story = jiraIssueFixture({ id: "10001", key: "MURBI-571" });
    const epic = jiraIssueFixture({
      id: "10002",
      key: "MURBI-572",
      fields: {
        ...story.fields,
        summary: "Épico de operações",
        issuetype: {
          name: "Epic",
          iconUrl: "https://example.com/epic.svg",
          hierarchyLevel: 1
        }
      }
    });
    const subtask = jiraIssueFixture({
      id: "10003",
      key: "MURBI-573",
      fields: {
        ...story.fields,
        summary: "Subtarefa de ajuste",
        issuetype: {
          name: "Sub-task",
          iconUrl: "https://example.com/subtask.svg",
          hierarchyLevel: -1,
          subtask: true
        }
      }
    });
    const searchResponse: JiraSearchResponse = {
      startAt: 0,
      maxResults: 100,
      total: 3,
      isLast: true,
      issues: [story, epic, subtask]
    };
    const client = {
      get: async <T>(path: string): Promise<T> => {
        requestedPaths.push(path);

        if (path === "/rest/agile/1.0/board/42") {
          return board as T;
        }

        if (path.startsWith("/rest/agile/1.0/board/42/issue")) {
          return searchResponse as T;
        }

        throw new Error(`Unexpected Jira request: ${path}`);
      }
    };
    const fieldMetadataCacheService = {
      getCachedFieldMetadata: async (): Promise<JiraDashboardFieldMetadata> => ({ complexityFieldId: "customfield_10345" })
    };
    const service = new JiraDashboardService(
      { getConfig: () => jiraConfig },
      () => client as unknown as JiraClient,
      fieldMetadataCacheService as unknown as JiraFieldMetadataCacheService
    );

    const payload = await service.getDashboardData();
    const issueRequest = requestedPaths.find((path) => path.startsWith("/rest/agile/1.0/board/42/issue"));

    expect(payload.issues.map((issue) => issue.key)).toEqual(["MURBI-571"]);
    expect(decodeURIComponent(issueRequest ?? "")).toContain("issuetype != Epic");
    expect(decodeURIComponent(issueRequest ?? "")).toContain("issuetype not in subTaskIssueTypes()");
  });
});
