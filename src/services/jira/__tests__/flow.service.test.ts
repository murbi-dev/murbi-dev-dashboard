import { describe, expect, it } from "vitest";
import { JiraFlowService } from "@/services/jira/flow.service";
import { JiraClient } from "@/clients/jira/jira.client";
import { JiraFieldMetadataCacheService } from "@/services/jira/field-metadata-cache.service";
import type { JiraConfig } from "@/types/jira";

const jiraConfig: JiraConfig = {
  baseUrl: "https://murbi-team.atlassian.net",
  email: "dev@example.com",
  apiToken: "jira-token",
  boardId: "42"
};

function fieldMetadataStub(devFlowFieldId?: string): JiraFieldMetadataCacheService {
  return {
    getCachedFieldMetadata: async () => ({ devFlowFieldId })
  } as unknown as JiraFieldMetadataCacheService;
}

function doneIssue(
  key: string,
  inProgressDate: string,
  doneDate: string,
  summary = "Done issue",
  priority = "Medium"
) {
  return {
    id: key,
    key,
    fields: {
      summary,
      created: "2026-01-01T10:00:00.000Z",
      updated: doneDate,
      status: { name: "Concluído" },
      issuetype: { name: "Story" },
      priority: { name: priority },
      assignee: { displayName: "Dev" }
    },
    changelog: {
      histories: [
        {
          created: inProgressDate,
          items: [{ field: "status", fromString: "To Do", toString: "In Progress" }]
        },
        {
          created: doneDate,
          items: [{ field: "status", fromString: "In Progress", toString: "Done" }]
        }
      ]
    }
  };
}

function activeIssue(
  key: string,
  inProgressDate: string,
  currentStatus = "Em andamento",
  assigneeName = "Dev",
  summary = "Active issue",
  priority = "Medium"
) {
  return {
    id: key,
    key,
    fields: {
      summary,
      created: "2026-01-01T10:00:00.000Z",
      updated: "2026-06-10T10:00:00.000Z",
      status: { name: currentStatus },
      issuetype: { name: "Story" },
      priority: { name: priority },
      assignee: { displayName: assigneeName }
    },
    changelog: {
      histories: [
        {
          created: inProgressDate,
          items: [{ field: "status", fromString: "To Do", toString: "In Progress" }]
        }
      ]
    }
  };
}

describe("JiraFlowService", () => {
  it("throws when Jira credentials are missing", async () => {
    const missingConfigProvider = { getConfig: () => null };
    const service = new JiraFlowService(missingConfigProvider);

    await expect(service.getFlowMetrics("2026-01-01", "2026-01-31")).rejects.toThrow(
      "Credenciais do Jira ausentes."
    );
  });

  it("computes lead time metrics from done issues", async () => {
    const service = new JiraFlowService(
      { getConfig: () => jiraConfig },
      () =>
        ({
          get: async <T>(path: string): Promise<T> => {
            if (decodeURIComponent(path).includes("status = Done")) {
              return {
                startAt: 0,
                maxResults: 100,
                total: 3,
                isLast: true,
                issues: [
                  doneIssue("MUR-1", "2026-01-01T10:00:00.000Z", "2026-01-05T10:00:00.000Z"),
                  doneIssue("MUR-2", "2026-01-02T10:00:00.000Z", "2026-01-06T10:00:00.000Z"),
                  doneIssue("MUR-3", "2026-01-03T10:00:00.000Z", "2026-01-07T10:00:00.000Z")
                ]
              } as T;
            }

            return { startAt: 0, maxResults: 100, total: 0, isLast: true, issues: [] } as T;
          }
        }) as unknown as JiraClient,
      fieldMetadataStub()
    );

    const result = await service.getFlowMetrics("2026-01-01", "2026-01-31");

    expect(result.leadTime).not.toBeNull();
    expect(result.leadTime!.totalIssues).toBe(3);
    expect(result.leadTime!.average).toBe(4);
    expect(result.leadTime!.p50).toBe(4);
    expect(result.leadTime!.p75).toBe(4);
    expect(result.leadTime!.p90).toBe(4);
  });

  it("computes aging metrics from active issues", async () => {
    const service = new JiraFlowService(
      { getConfig: () => jiraConfig },
      () =>
        ({
          get: async <T>(path: string): Promise<T> => {
            if (decodeURIComponent(path).includes("status = Done")) {
              return { startAt: 0, maxResults: 100, total: 0, isLast: true, issues: [] } as T;
            }

            return {
              startAt: 0,
              maxResults: 100,
              total: 3,
              isLast: true,
              issues: [
                activeIssue("MUR-4", "2026-06-01T10:00:00.000Z"),
                activeIssue("MUR-5", "2026-06-05T10:00:00.000Z"),
                activeIssue("MUR-6", "2026-06-08T10:00:00.000Z")
              ]
            } as T;
          }
        }) as unknown as JiraClient,
      fieldMetadataStub()
    );

    const result = await service.getFlowMetrics("2026-06-01", "2026-06-30");

    expect(result.aging).not.toBeNull();
    expect(result.aging!.totalActiveIssues).toBe(3);
    expect(result.aging!.criticalIssues).toHaveLength(3);
    expect(result.aging!.criticalIssues[0].agingDays).toBeGreaterThanOrEqual(
      result.aging!.criticalIssues[1].agingDays
    );
  });

  it("considers only HOTFIX issues when hotfixOnly is true", async () => {
    const service = new JiraFlowService(
      { getConfig: () => jiraConfig },
      () =>
        ({
          get: async <T>(path: string): Promise<T> => {
            if (decodeURIComponent(path).includes("status = Done")) {
              return {
                startAt: 0,
                maxResults: 100,
                total: 2,
                isLast: true,
                issues: [
                  doneIssue("MUR-1", "2026-01-01T10:00:00.000Z", "2026-01-05T10:00:00.000Z", "Tarefa comum"),
                  doneIssue(
                    "MUR-2",
                    "2026-01-02T10:00:00.000Z",
                    "2026-01-06T10:00:00.000Z",
                    "Correção urgente",
                    "HOTFIX"
                  )
                ]
              } as T;
            }

            return {
              startAt: 0,
              maxResults: 100,
              total: 2,
              isLast: true,
              issues: [
                activeIssue("MUR-3", "2026-06-01T10:00:00.000Z", "Em andamento", "Dev", "Ativa comum"),
                activeIssue("MUR-4", "2026-06-05T10:00:00.000Z", "Em andamento", "Dev", "Ativa", "HOTFIX")
              ]
            } as T;
          }
        }) as unknown as JiraClient,
      fieldMetadataStub()
    );

    const result = await service.getFlowMetrics("2026-06-01", "2026-06-30", true);

    expect(result.leadTime).not.toBeNull();
    expect(result.leadTime!.totalIssues).toBe(1);
    expect(result.aging).not.toBeNull();
    expect(result.aging!.totalActiveIssues).toBe(1);
    expect(result.aging!.criticalIssues[0].key).toBe("MUR-4");
  });

  it("returns null metrics when no issues match", async () => {
    const service = new JiraFlowService(
      { getConfig: () => jiraConfig },
      () =>
        ({
          get: async <T>(): Promise<T> => ({
            startAt: 0,
            maxResults: 100,
            total: 0,
            isLast: true,
            issues: []
          }) as T
        }) as unknown as JiraClient,
      fieldMetadataStub()
    );

    const result = await service.getFlowMetrics("2026-01-01", "2026-01-31");

    expect(result.leadTime).toBeNull();
    expect(result.aging).toBeNull();
  });

  it("segments lead time by dev flow and computes approval wait", async () => {
    const devFlowFieldId = "customfield_10414";

    const doneIa = {
      id: "IA-1",
      key: "IA-1",
      fields: {
        summary: "Entrega IA",
        created: "2026-01-01T10:00:00.000Z",
        updated: "2026-01-07T10:00:00.000Z",
        status: { name: "Concluído" },
        issuetype: { name: "Story" },
        priority: { name: "Medium" },
        assignee: { displayName: "IA" },
        [devFlowFieldId]: { value: "Dev IA" }
      },
      changelog: {
        histories: [
          { created: "2026-01-01T10:00:00.000Z", items: [{ field: "status", fromString: "Tarefas pendentes", toString: "Aprovação" }] },
          { created: "2026-01-03T10:00:00.000Z", items: [{ field: "status", fromString: "Aprovação", toString: "In Progress" }] },
          { created: "2026-01-07T10:00:00.000Z", items: [{ field: "status", fromString: "In Progress", toString: "Done" }] }
        ]
      }
    };

    const doneHumano = {
      id: "H-1",
      key: "H-1",
      fields: {
        summary: "Entrega humana",
        created: "2026-01-01T10:00:00.000Z",
        updated: "2026-01-03T10:00:00.000Z",
        status: { name: "Concluído" },
        issuetype: { name: "Story" },
        priority: { name: "Medium" },
        assignee: { displayName: "Dev" },
        [devFlowFieldId]: { value: "Dev Humano" }
      },
      changelog: {
        histories: [
          { created: "2026-01-01T10:00:00.000Z", items: [{ field: "status", fromString: "To Do", toString: "In Progress" }] },
          { created: "2026-01-03T10:00:00.000Z", items: [{ field: "status", fromString: "In Progress", toString: "Done" }] }
        ]
      }
    };

    const service = new JiraFlowService(
      { getConfig: () => jiraConfig },
      () =>
        ({
          get: async <T>(path: string): Promise<T> => {
            if (decodeURIComponent(path).includes("status = Done")) {
              return { startAt: 0, maxResults: 100, total: 2, isLast: true, issues: [doneIa, doneHumano] } as T;
            }

            return { startAt: 0, maxResults: 100, total: 0, isLast: true, issues: [] } as T;
          }
        }) as unknown as JiraClient,
      fieldMetadataStub(devFlowFieldId)
    );

    const result = await service.getFlowMetrics("2026-01-01", "2026-01-31");

    expect(result.leadTimeByFlow.ai).not.toBeNull();
    expect(result.leadTimeByFlow.ai!.totalIssues).toBe(1);
    expect(result.leadTimeByFlow.ai!.average).toBe(4);

    expect(result.leadTimeByFlow.human).not.toBeNull();
    expect(result.leadTimeByFlow.human!.totalIssues).toBe(1);
    expect(result.leadTimeByFlow.human!.average).toBe(2);

    expect(result.approvalWait).not.toBeNull();
    expect(result.approvalWait!.totalIssues).toBe(1);
    expect(result.approvalWait!.average).toBe(2);
  });
});
