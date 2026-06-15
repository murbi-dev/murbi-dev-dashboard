import { describe, expect, it } from "vitest";
import { isHotfixIssue } from "@/lib/jira/jira-metrics.helper";
import type { JiraIssue } from "@/types/jira";

function makeIssue(summary: string): JiraIssue {
  return {
    id: "1",
    key: "MUR-1",
    fields: {
      summary,
      created: "2026-01-01T10:00:00.000Z",
      updated: "2026-06-10T10:00:00.000Z",
      status: { name: "Concluído" },
      issuetype: { name: "Story" },
      assignee: { displayName: "Dev" }
    },
    changelog: { histories: [] }
  };
}

describe("isHotfixIssue", () => {
  it("returns true when the summary contains the HOTFIX tag", () => {
    expect(isHotfixIssue(makeIssue("[HOTFIX] Correção urgente"))).toBe(true);
  });

  it("returns false when the summary does not contain the HOTFIX tag", () => {
    expect(isHotfixIssue(makeIssue("Tarefa comum"))).toBe(false);
  });
});
