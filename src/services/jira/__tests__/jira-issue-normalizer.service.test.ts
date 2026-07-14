import { describe, expect, it } from "vitest";
import { JiraIssueNormalizerService } from "@/services/jira/jira-issue-normalizer.service";
import { jiraIssueFixture } from "./fixtures/jira-issues";

describe("JiraIssueNormalizerService", () => {
  const normalizer = new JiraIssueNormalizerService();

  it("counts QA rejections from Teste QA to retrabalho statuses", () => {
    const issue = normalizer.normalizeIssue(
      jiraIssueFixture({
        changelog: {
          histories: [
            {
              created: "2026-06-03T09:00:00.000-0300",
              items: [{ field: "status", fromString: "Teste QA", toString: "In Progress" }]
            },
            {
              created: "2026-06-02T15:11:03.156-0300",
              items: [{ field: "status", fromString: "Teste QA", toString: "To Do" }]
            },
            {
              created: "2026-06-01T10:00:00.000-0300",
              items: [{ field: "status", fromString: "Pronto para QA", toString: "Teste QA" }]
            }
          ]
        }
      }),
      "https://murbi-team.atlassian.net",
      { complexityFieldId: "customfield_10345" }
    );

    expect(issue.qaRejectionCount).toBe(2);
    expect(issue.qaRejections).toEqual([
      {
        fromStatus: "Teste QA",
        toStatus: "In Progress",
        changedAt: "2026-06-03T09:00:00.000-0300"
      },
      {
        fromStatus: "Teste QA",
        toStatus: "To Do",
        changedAt: "2026-06-02T15:11:03.156-0300"
      }
    ]);
  });

  it("normalizes card fields without inventing Jira metadata", () => {
    const issue = normalizer.normalizeIssue(
      jiraIssueFixture(),
      "https://murbi-team.atlassian.net",
      { complexityFieldId: "customfield_10345" }
    );

    expect(issue.key).toBe("MURBI-571");
    expect(issue.businessStatus).toBe("In Development");
    expect(issue.isHotfix).toBe(true);
    expect(issue.complexity).toBe("M");
    expect(issue.issueType).toEqual({
      name: "Story",
      iconUrl: "https://example.com/story.svg"
    });
    expect(issue.assignee.name).toBe("Henrique Mayrlon da Silva Lourenço");
    expect(issue.url).toBe("https://murbi-team.atlassian.net/browse/MURBI-571");
  });

  it("marks the issue as AI dev when the Fluxo Dev field is Dev IA", () => {
    const issue = normalizer.normalizeIssue(
      jiraIssueFixture({
        fields: {
          ...jiraIssueFixture().fields,
          customfield_10414: { value: "Dev IA", id: "10171" }
        }
      }),
      "https://murbi-team.atlassian.net",
      { devFlowFieldId: "customfield_10414" }
    );

    expect(issue.isAiDev).toBe(true);
  });

  it("does not mark the issue as AI dev for Dev Humano or a missing Fluxo Dev field", () => {
    const humanIssue = normalizer.normalizeIssue(
      jiraIssueFixture({
        fields: {
          ...jiraIssueFixture().fields,
          customfield_10414: { value: "Dev Humano", id: "10170" }
        }
      }),
      "https://murbi-team.atlassian.net",
      { devFlowFieldId: "customfield_10414" }
    );
    const emptyIssue = normalizer.normalizeIssue(jiraIssueFixture(), "https://murbi-team.atlassian.net", {
      devFlowFieldId: "customfield_10414"
    });

    expect(humanIssue.isAiDev).toBe(false);
    expect(emptyIssue.isAiDev).toBe(false);
  });
});
