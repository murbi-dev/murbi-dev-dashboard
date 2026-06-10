import { describe, expect, it } from "vitest";
import {
  getFirstInProgressDate,
  getFirstDoneDate,
  calculateLeadTime,
  isActiveIssue,
  calculatePercentile
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
});
