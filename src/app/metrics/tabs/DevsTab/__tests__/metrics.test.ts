import { describe, expect, it } from "vitest";
import { buildDeveloperMetrics } from "@/app/metrics/tabs/DevsTab/metrics";
import type { BusinessStatus, DashboardIssue } from "@/types/dashboard";

function issue(overrides: {
  key: string;
  assigneeName: string;
  businessStatus: BusinessStatus;
  qaRejectionCount: number;
}): DashboardIssue {
  return {
    id: overrides.key,
    key: overrides.key,
    title: "Card de teste",
    issueType: {
      name: "Story"
    },
    assignee: {
      name: overrides.assigneeName
    },
    priority: "Medium",
    jiraStatus: overrides.businessStatus === "Done" ? "Concluído" : "Em andamento",
    businessStatus: overrides.businessStatus,
    isHotfix: false,
    isAiDev: false,
    qaRejectionCount: overrides.qaRejectionCount,
    qaRejections: [],
    createdAt: "2026-06-01T10:00:00.000-0300",
    updatedAt: "2026-06-02T10:00:00.000-0300",
    statusChangedAt: "2026-06-02T10:00:00.000-0300"
  };
}

describe("buildDeveloperMetrics", () => {
  it("counts only unfinished cards that returned from QA", () => {
    const [metrics] = buildDeveloperMetrics([
      issue({
        key: "MURBI-1",
        assigneeName: "Ana",
        businessStatus: "In Development",
        qaRejectionCount: 2
      }),
      issue({
        key: "MURBI-2",
        assigneeName: "Ana",
        businessStatus: "Validation",
        qaRejectionCount: 1
      }),
      issue({
        key: "MURBI-3",
        assigneeName: "Ana",
        businessStatus: "Done",
        qaRejectionCount: 3
      }),
      issue({
        key: "MURBI-4",
        assigneeName: "Ana",
        businessStatus: "In Development",
        qaRejectionCount: 0
      })
    ]);

    expect(metrics.qaRejections).toBe(2);
  });
});
