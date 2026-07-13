import { describe, expect, it } from "vitest";
import { JiraQualityService } from "@/services/jira/quality.service";
import { JiraClient } from "@/clients/jira/jira.client";
import type { JiraConfig, JiraIssue } from "@/types/jira";

const jiraConfig: JiraConfig = {
  baseUrl: "https://murbi-team.atlassian.net",
  email: "dev@example.com",
  apiToken: "jira-token",
  boardId: "42"
};

function makeIssue(
  key: string,
  overrides?: Partial<JiraIssue["fields"]>,
  changelog?: JiraIssue["changelog"]
): JiraIssue {
  return {
    id: key,
    key,
    fields: {
      summary: "Issue de teste",
      created: "2026-01-01T10:00:00.000Z",
      updated: "2026-06-10T10:00:00.000Z",
      status: { name: "Concluído" },
      issuetype: { name: "Story" },
      assignee: { displayName: "Dev" },
      ...overrides
    },
    changelog: changelog ?? {
      histories: []
    }
  };
}

function qaRejectionHistory(fromStatus = "Teste QA", toStatus = "Em andamento") {
  return {
    histories: [
      {
        created: "2026-06-05T10:00:00.000Z",
        items: [{ field: "status", fromString: fromStatus, toString: toStatus }]
      }
    ]
  };
}

describe("JiraQualityService", () => {
  it("throws when Jira credentials are missing", async () => {
    const missingConfigProvider = { getConfig: () => null };
    const service = new JiraQualityService(missingConfigProvider);

    await expect(service.getQualityMetrics("2026-01-01", "2026-01-31")).rejects.toThrow(
      "Credenciais do Jira ausentes."
    );
  });

  it("returns 100% quality rate when there are no deliveries", async () => {
    const service = new JiraQualityService(
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
        }) as unknown as JiraClient
    );

    const result = await service.getQualityMetrics("2026-01-01", "2026-01-31");

    expect(result.totalDeliveries).toBe(0);
    expect(result.qualityRate).toBe(100);
    expect(result.totalQaRejections).toBe(0);
    expect(result.reworkDeliveries).toEqual([]);
  });

  it("counts deliveries with and without rework", async () => {
    const issues = [
      makeIssue("MUR-1"),
      makeIssue("MUR-2", {}, qaRejectionHistory()),
      makeIssue("MUR-3"),
      makeIssue("MUR-4", {}, qaRejectionHistory())
    ];

    const service = new JiraQualityService(
      { getConfig: () => jiraConfig },
      () =>
        ({
          get: async <T>(): Promise<T> => ({
            startAt: 0,
            maxResults: 100,
            total: issues.length,
            isLast: true,
            issues
          }) as T
        }) as unknown as JiraClient
    );

    const result = await service.getQualityMetrics("2026-01-01", "2026-01-31");

    expect(result.totalDeliveries).toBe(4);
    expect(result.deliveriesWithRework).toBe(2);
    expect(result.deliveriesWithoutRework).toBe(2);
    expect(result.qualityRate).toBe(50);
  });

  it("counts total QA rejections across all issues", async () => {
    const issues = [
      makeIssue("MUR-1"),
      makeIssue(
        "MUR-2",
        {},
        {
          histories: [
            ...qaRejectionHistory().histories,
            ...qaRejectionHistory().histories
          ]
        }
      ),
      makeIssue(
        "MUR-3",
        {},
        qaRejectionHistory()
      )
    ];

    const service = new JiraQualityService(
      { getConfig: () => jiraConfig },
      () =>
        ({
          get: async <T>(): Promise<T> => ({
            startAt: 0,
            maxResults: 100,
            total: issues.length,
            isLast: true,
            issues
          }) as T
        }) as unknown as JiraClient
    );

    const result = await service.getQualityMetrics("2026-01-01", "2026-01-31");

    expect(result.totalQaRejections).toBe(3);
    expect(result.deliveriesWithRework).toBe(2);
  });

  it("includes rework delivery details sorted by rejection count descending", async () => {
    const issues = [
      makeIssue("MUR-1", { summary: "Sem rework" }),
      makeIssue(
        "MUR-2",
        {
          summary: "Duas rejeições",
          assignee: { displayName: "Ana" }
        },
        {
          histories: [
            ...qaRejectionHistory().histories,
            ...qaRejectionHistory().histories
          ]
        }
      ),
      makeIssue(
        "MUR-3",
        {
          summary: "Uma rejeição",
          assignee: { displayName: "Beto" }
        },
        qaRejectionHistory()
      ),
      makeIssue(
        "MUR-4",
        {
          summary: "Três rejeições",
          assignee: { displayName: "Ana" }
        },
        {
          histories: [
            ...qaRejectionHistory().histories,
            ...qaRejectionHistory().histories,
            ...qaRejectionHistory().histories
          ]
        }
      )
    ];

    const service = new JiraQualityService(
      { getConfig: () => jiraConfig },
      () =>
        ({
          get: async <T>(): Promise<T> => ({
            startAt: 0,
            maxResults: 100,
            total: issues.length,
            isLast: true,
            issues
          }) as T
        }) as unknown as JiraClient
    );

    const result = await service.getQualityMetrics("2026-01-01", "2026-01-31");

    expect(result.reworkDeliveries).toHaveLength(3);
    expect(result.reworkDeliveries[0].key).toBe("MUR-4");
    expect(result.reworkDeliveries[0].rejectionCount).toBe(3);
    expect(result.reworkDeliveries[0].summary).toBe("Três rejeições");
    expect(result.reworkDeliveries[0].assignee).toBe("Ana");
    expect(result.reworkDeliveries[1].key).toBe("MUR-2");
    expect(result.reworkDeliveries[1].rejectionCount).toBe(2);
    expect(result.reworkDeliveries[2].key).toBe("MUR-3");
    expect(result.reworkDeliveries[2].rejectionCount).toBe(1);
  });

  it("considers only HOTFIX deliveries when hotfixOnly is true", async () => {
    const issues = [
      makeIssue("MUR-1", { summary: "Tarefa comum" }),
      makeIssue(
        "MUR-2",
        { summary: "Correção urgente", priority: { name: "HOTFIX" } },
        qaRejectionHistory()
      ),
      makeIssue("MUR-3", { summary: "Outra tarefa comum" }),
      makeIssue("MUR-4", { summary: "Outro fix", priority: { name: "HOTFIX" } })
    ];

    const service = new JiraQualityService(
      { getConfig: () => jiraConfig },
      () =>
        ({
          get: async <T>(): Promise<T> => ({
            startAt: 0,
            maxResults: 100,
            total: issues.length,
            isLast: true,
            issues
          }) as T
        }) as unknown as JiraClient
    );

    const result = await service.getQualityMetrics("2026-01-01", "2026-01-31", true);

    expect(result.totalDeliveries).toBe(2);
    expect(result.deliveriesWithRework).toBe(1);
    expect(result.deliveriesWithoutRework).toBe(1);
    expect(result.qualityRate).toBe(50);
    expect(result.reworkDeliveries).toHaveLength(1);
    expect(result.reworkDeliveries[0].key).toBe("MUR-2");
  });

  it("handles missing assignee gracefully", async () => {
    const issues = [
      makeIssue("MUR-1", { assignee: undefined }, qaRejectionHistory())
    ];

    const service = new JiraQualityService(
      { getConfig: () => jiraConfig },
      () =>
        ({
          get: async <T>(): Promise<T> => ({
            startAt: 0,
            maxResults: 100,
            total: issues.length,
            isLast: true,
            issues
          }) as T
        }) as unknown as JiraClient
    );

    const result = await service.getQualityMetrics("2026-01-01", "2026-01-31");

    expect(result.reworkDeliveries[0].assignee).toBe("Sem responsável");
  });
});
