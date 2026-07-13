import { describe, expect, it } from "vitest";
import { isHotfixIssue } from "@/lib/jira/jira-metrics.helper";
import type { JiraIssue } from "@/types/jira";

function makeIssue(priority?: string): JiraIssue {
  return {
    id: "1",
    key: "MUR-1",
    fields: {
      summary: "Correção urgente",
      created: "2026-01-01T10:00:00.000Z",
      updated: "2026-06-10T10:00:00.000Z",
      status: { name: "Concluído" },
      issuetype: { name: "Story" },
      priority: priority ? { name: priority } : undefined,
      assignee: { displayName: "Dev" }
    },
    changelog: { histories: [] }
  };
}

describe("isHotfixIssue", () => {
  it("returns true when the priority is HOTFIX", () => {
    expect(isHotfixIssue(makeIssue("HOTFIX"))).toBe(true);
  });

  it("returns false when the priority is not HOTFIX", () => {
    expect(isHotfixIssue(makeIssue("High"))).toBe(false);
  });

  it("returns false when the issue has no priority", () => {
    expect(isHotfixIssue(makeIssue())).toBe(false);
  });
});
