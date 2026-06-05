import { describe, expect, it } from "vitest";
import { JiraDashboardService } from "@/services/jira/dashboard.service";
import { JiraIssueSearchService } from "@/services/jira/issue-search.service";

const missingConfigProvider = {
  getConfig: () => null
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
});
