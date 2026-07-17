import { describe, expect, it } from "vitest";
import {
  getFirstInProgressDate,
  getFirstDoneDate,
  calculateLeadTime,
  isActiveIssue,
  calculatePercentile,
  isAiDevIssue,
  calculateApprovalWait,
  buildFlowStats
} from "@/lib/jira/jira-flow.helper";
import type { JiraIssue } from "@/types/jira";

const defaultFields = {
  summary: "Test issue",
  created: "2026-01-01T10:00:00.000Z",
  updated: "2026-01-10T10:00:00.000Z",
  status: { name: "Em andamento" },
  issuetype: { name: "Story" }
};

function makeIssue(overrides: Partial<JiraIssue> = {}): JiraIssue {
  const base: JiraIssue = {
    id: "1",
    key: "TEST-1",
    fields: { ...defaultFields },
    changelog: { histories: [] }
  };

  return {
    ...base,
    ...overrides,
    fields: { ...defaultFields, ...overrides.fields } as JiraIssue["fields"],
    changelog: overrides.changelog ?? base.changelog
  };
}

describe("jira-flow.helper", () => {
  describe("getFirstInProgressDate", () => {
    it("returns the first entry to Em andamento (Portuguese)", () => {
      const issue = makeIssue({
        changelog: {
          histories: [
            { created: "2026-01-03T10:00:00.000Z", items: [{ field: "status", fromString: "To Do", toString: "In Progress" }] },
            { created: "2026-01-05T10:00:00.000Z", items: [{ field: "status", fromString: "In Progress", toString: "Done" }] }
          ]
        }
      });

      expect(getFirstInProgressDate(issue)).toBe("2026-01-03T10:00:00.000Z");
    });

    it("returns the first entry to In Progress (English)", () => {
      const issue = makeIssue({
        changelog: {
          histories: [
            { created: "2026-01-03T10:00:00.000Z", items: [{ field: "status", fromString: "To Do", toString: "In Progress" }] }
          ]
        }
      });

      expect(getFirstInProgressDate(issue)).toBe("2026-01-03T10:00:00.000Z");
    });

    it("returns null when no In Progress entry exists", () => {
      const issue = makeIssue();

      expect(getFirstInProgressDate(issue)).toBeNull();
    });

    it("returns null when changelog is empty", () => {
      const issue = makeIssue({ changelog: undefined });

      expect(getFirstInProgressDate(issue)).toBeNull();
    });

    it("skips non-status field changes", () => {
      const issue = makeIssue({
        changelog: {
          histories: [
            { created: "2026-01-03T10:00:00.000Z", items: [{ field: "assignee", fromString: "Alice", toString: "Bob" }] }
          ]
        }
      });

      expect(getFirstInProgressDate(issue)).toBeNull();
    });
  });

  describe("getFirstDoneDate", () => {
    it("returns the first entry to Concluído (Portuguese)", () => {
      const issue = makeIssue({
        fields: { ...defaultFields, status: { name: "Concluído" } },
        changelog: {
          histories: [
            { created: "2026-01-03T10:00:00.000Z", items: [{ field: "status", fromString: "Em andamento", toString: "Concluído" }] }
          ]
        }
      });

      expect(getFirstDoneDate(issue)).toBe("2026-01-03T10:00:00.000Z");
    });

    it("returns the first entry to Done (English)", () => {
      const issue = makeIssue({
        fields: { ...defaultFields, status: { name: "Concluído" } },
        changelog: {
          histories: [
            { created: "2026-01-03T10:00:00.000Z", items: [{ field: "status", fromString: "In Progress", toString: "Done" }] }
          ]
        }
      });

      expect(getFirstDoneDate(issue)).toBe("2026-01-03T10:00:00.000Z");
    });

    it("returns null when no Done entry exists", () => {
      const issue = makeIssue();

      expect(getFirstDoneDate(issue)).toBeNull();
    });
  });

  describe("calculateLeadTime", () => {
    it("calculates lead time between first In Progress and first Done", () => {
      const issue = makeIssue({
        changelog: {
          histories: [
            { created: "2026-01-01T10:00:00.000Z", items: [{ field: "status", fromString: "To Do", toString: "In Progress" }] },
            { created: "2026-01-05T10:00:00.000Z", items: [{ field: "status", fromString: "In Progress", toString: "Done" }] }
          ]
        }
      });

      expect(calculateLeadTime(issue)).toBe(4);
    });

    it("returns null when In Progress is missing", () => {
      const issue = makeIssue({
        changelog: {
          histories: [
            { created: "2026-01-05T10:00:00.000Z", items: [{ field: "status", fromString: "To Do", toString: "Done" }] }
          ]
        }
      });

      expect(calculateLeadTime(issue)).toBeNull();
    });

    it("returns null when Done is missing", () => {
      const issue = makeIssue({
        changelog: {
          histories: [
            { created: "2026-01-01T10:00:00.000Z", items: [{ field: "status", fromString: "To Do", toString: "In Progress" }] }
          ]
        }
      });

      expect(calculateLeadTime(issue)).toBeNull();
    });
  });

  describe("isActiveIssue", () => {
    it("returns true for an active non-Done issue that has entered In Progress", () => {
      const issue = makeIssue({
        fields: { ...defaultFields, status: { name: "Em andamento" } },
        changelog: {
          histories: [
            { created: "2026-01-01T10:00:00.000Z", items: [{ field: "status", fromString: "To Do", toString: "In Progress" }] }
          ]
        }
      });

      expect(isActiveIssue(issue)).toBe(true);
    });

    it("returns false for a Done issue", () => {
      const issue = makeIssue({
        fields: { ...defaultFields, status: { name: "Concluído" } },
        changelog: {
          histories: [
            { created: "2026-01-01T10:00:00.000Z", items: [{ field: "status", fromString: "To Do", toString: "In Progress" }] },
            { created: "2026-01-05T10:00:00.000Z", items: [{ field: "status", fromString: "In Progress", toString: "Done" }] }
          ]
        }
      });

      expect(isActiveIssue(issue)).toBe(false);
    });

    it("returns false for an issue that has never entered In Progress", () => {
      const issue = makeIssue({
        fields: { ...defaultFields, status: { name: "Tarefas pendentes" } }
      });

      expect(isActiveIssue(issue)).toBe(false);
    });
  });

  describe("calculatePercentile", () => {
    it("returns the P50 (median) from sorted values", () => {
      expect(calculatePercentile([1, 2, 3, 4, 5], 50)).toBe(3);
    });

    it("returns the P75 from sorted values", () => {
      expect(calculatePercentile([1, 2, 3, 4, 5], 75)).toBe(4);
    });

    it("returns the P90 from sorted values", () => {
      expect(calculatePercentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 90)).toBe(9);
    });

    it("returns 0 for an empty array", () => {
      expect(calculatePercentile([], 50)).toBe(0);
    });

    it("handles single-element array", () => {
      expect(calculatePercentile([42], 50)).toBe(42);
      expect(calculatePercentile([42], 90)).toBe(42);
    });
  });

  describe("isAiDevIssue", () => {
    const devFlowFieldId = "customfield_10414";

    it("returns true when Fluxo Dev is 'Dev IA' (option object)", () => {
      const issue = makeIssue({
        fields: { ...defaultFields, [devFlowFieldId]: { value: "Dev IA" } } as JiraIssue["fields"]
      });

      expect(isAiDevIssue(issue, devFlowFieldId)).toBe(true);
    });

    it("returns true when Fluxo Dev is a plain string 'Dev IA'", () => {
      const issue = makeIssue({
        fields: { ...defaultFields, [devFlowFieldId]: "dev ia" } as JiraIssue["fields"]
      });

      expect(isAiDevIssue(issue, devFlowFieldId)).toBe(true);
    });

    it("returns false when Fluxo Dev is a human value", () => {
      const issue = makeIssue({
        fields: { ...defaultFields, [devFlowFieldId]: { value: "Dev Humano" } } as JiraIssue["fields"]
      });

      expect(isAiDevIssue(issue, devFlowFieldId)).toBe(false);
    });

    it("returns false when the field is absent", () => {
      const issue = makeIssue();

      expect(isAiDevIssue(issue, devFlowFieldId)).toBe(false);
    });

    it("returns false when no field id is provided", () => {
      const issue = makeIssue({
        fields: { ...defaultFields, [devFlowFieldId]: { value: "Dev IA" } } as JiraIssue["fields"]
      });

      expect(isAiDevIssue(issue, undefined)).toBe(false);
    });
  });

  describe("calculateApprovalWait", () => {
    it("calculates the wait between entering and leaving Aprovação", () => {
      const issue = makeIssue({
        changelog: {
          histories: [
            { created: "2026-01-01T10:00:00.000Z", items: [{ field: "status", fromString: "Tarefas pendentes", toString: "Aprovação" }] },
            { created: "2026-01-03T10:00:00.000Z", items: [{ field: "status", fromString: "Aprovação", toString: "Em andamento" }] }
          ]
        }
      });

      expect(calculateApprovalWait(issue)).toBe(2);
    });

    it("measures until now when the card is still in Aprovação", () => {
      const issue = makeIssue({
        fields: { ...defaultFields, status: { name: "Aprovação" } },
        changelog: {
          histories: [
            { created: "2026-01-01T10:00:00.000Z", items: [{ field: "status", fromString: "Tarefas pendentes", toString: "Aprovação" }] }
          ]
        }
      });

      expect(calculateApprovalWait(issue)).toBeGreaterThan(0);
    });

    it("returns null when the card never entered Aprovação", () => {
      const issue = makeIssue({
        changelog: {
          histories: [
            { created: "2026-01-01T10:00:00.000Z", items: [{ field: "status", fromString: "Tarefas pendentes", toString: "Em andamento" }] }
          ]
        }
      });

      expect(calculateApprovalWait(issue)).toBeNull();
    });
  });

  describe("buildFlowStats", () => {
    it("returns null for an empty list", () => {
      expect(buildFlowStats([])).toBeNull();
    });

    it("builds average and percentiles from the values", () => {
      expect(buildFlowStats([1, 2, 3, 4, 5])).toEqual({
        average: 3,
        p50: 3,
        p75: 4,
        p90: 5,
        totalIssues: 5
      });
    });

    it("does not mutate the input array", () => {
      const values = [5, 1, 3];
      buildFlowStats(values);

      expect(values).toEqual([5, 1, 3]);
    });
  });
});
