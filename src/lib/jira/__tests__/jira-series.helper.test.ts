import { describe, expect, it } from "vitest";
import { buildFlowSeries, buildQualitySeries, getDeliveryDate } from "@/lib/jira/jira-series.helper";
import { JIRA_STATUS_ID } from "@/lib/status-mapper";
import type { JiraIssue } from "@/types/jira";

const devFlowFieldId = "customfield_10414";

type StatusChange = { from: string; to: string; at: string };

function makeIssue(
  key: string,
  changes: StatusChange[],
  overrides?: Partial<JiraIssue["fields"]>
): JiraIssue {
  return {
    id: key,
    key,
    fields: {
      summary: `Card ${key}`,
      created: "2026-03-01T09:00:00.000Z",
      updated: "2026-03-20T09:00:00.000Z",
      status: { id: JIRA_STATUS_ID.DONE, name: "Concluído" },
      issuetype: { name: "Story" },
      assignee: { displayName: "Dev" },
      ...overrides
    },
    changelog: {
      histories: changes.map((change) => ({
        created: change.at,
        items: [
          {
            field: "status",
            from: change.from,
            to: change.to,
            fromString: "de",
            toString: "para"
          }
        ]
      }))
    }
  };
}

function qaRejection(at: string) {
  return {
    created: at,
    items: [
      {
        field: "status",
        from: JIRA_STATUS_ID.QA_TESTING,
        to: JIRA_STATUS_ID.IN_PROGRESS,
        fromString: "Teste QA",
        toString: "Em andamento"
      }
    ]
  };
}

describe("getDeliveryDate", () => {
  it("prefers the Done transition that happened inside the range", () => {
    const issue = makeIssue("MUR-1", [
      { from: JIRA_STATUS_ID.QA_TESTING, to: JIRA_STATUS_ID.DONE, at: "2026-01-10T10:00:00.000Z" },
      { from: JIRA_STATUS_ID.DONE, to: JIRA_STATUS_ID.IN_PROGRESS, at: "2026-02-01T10:00:00.000Z" },
      { from: JIRA_STATUS_ID.QA_TESTING, to: JIRA_STATUS_ID.DONE, at: "2026-03-05T10:00:00.000Z" }
    ]);

    expect(getDeliveryDate(issue, "2026-03-01", "2026-03-31")).toBe("2026-03-05T10:00:00.000Z");
  });

  it("falls back to the first Done transition when none is inside the range", () => {
    const issue = makeIssue("MUR-2", [
      { from: JIRA_STATUS_ID.QA_TESTING, to: JIRA_STATUS_ID.DONE, at: "2026-01-10T10:00:00.000Z" }
    ]);

    expect(getDeliveryDate(issue, "2026-03-01", "2026-03-31")).toBe("2026-01-10T10:00:00.000Z");
  });

  it("returns null when the changelog has no Done transition", () => {
    const issue = makeIssue("MUR-3", []);

    expect(getDeliveryDate(issue, "2026-03-01", "2026-03-31")).toBeNull();
  });
});

describe("buildQualitySeries", () => {
  const deliveredOn = (key: string, at: string, rejections: string[] = []) => {
    const issue = makeIssue(key, [
      { from: JIRA_STATUS_ID.QA_TESTING, to: JIRA_STATUS_ID.DONE, at }
    ]);

    issue.changelog?.histories.push(...rejections.map(qaRejection));

    return issue;
  };

  it("buckets deliveries by the delivery date at every granularity", () => {
    const issues = [
      deliveredOn("MUR-1", "2026-03-02T10:00:00.000Z"),
      deliveredOn("MUR-2", "2026-03-02T18:00:00.000Z"),
      deliveredOn("MUR-3", "2026-03-04T10:00:00.000Z")
    ];

    const series = buildQualitySeries(issues, "2026-03-01", "2026-03-05");

    expect(series.daily).toHaveLength(5);
    expect(series.daily[1].totalDeliveries).toBe(2);
    expect(series.daily[3].totalDeliveries).toBe(1);
    expect(series.monthly).toHaveLength(1);
    expect(series.monthly[0].totalDeliveries).toBe(3);
  });

  it("computes the quality rate per bucket and leaves an empty bucket as a gap", () => {
    const issues = [
      deliveredOn("MUR-1", "2026-03-02T10:00:00.000Z"),
      deliveredOn("MUR-2", "2026-03-02T11:00:00.000Z", ["2026-03-01T10:00:00.000Z"]),
      deliveredOn("MUR-3", "2026-03-04T10:00:00.000Z")
    ];

    const series = buildQualitySeries(issues, "2026-03-01", "2026-03-05");

    expect(series.daily[1]).toMatchObject({
      totalDeliveries: 2,
      deliveriesWithRework: 1,
      deliveriesWithoutRework: 1,
      totalQaRejections: 1,
      qualityRate: 50
    });
    expect(series.daily[3].qualityRate).toBe(100);
    expect(series.daily[0].qualityRate).toBeNull();
    expect(series.daily[0].totalDeliveries).toBe(0);
  });

  it("ignores deliveries whose changelog has no Done transition", () => {
    const series = buildQualitySeries([makeIssue("MUR-9", [])], "2026-03-01", "2026-03-05");

    expect(series.daily.every((point) => point.totalDeliveries === 0)).toBe(true);
  });
});

describe("buildFlowSeries", () => {
  const doneIn = (key: string, startAt: string, doneAt: string, isAi = false) =>
    makeIssue(
      key,
      [
        { from: JIRA_STATUS_ID.PENDING, to: JIRA_STATUS_ID.IN_PROGRESS, at: startAt },
        { from: JIRA_STATUS_ID.QA_TESTING, to: JIRA_STATUS_ID.DONE, at: doneAt }
      ],
      isAi ? { [devFlowFieldId]: { value: "Dev IA" } } : undefined
    );

  it("averages the lead time of each bucket and leaves empty buckets as gaps", () => {
    const series = buildFlowSeries({
      doneIssues: [
        doneIn("MUR-1", "2026-03-01T00:00:00.000Z", "2026-03-03T00:00:00.000Z"),
        doneIn("MUR-2", "2026-03-01T00:00:00.000Z", "2026-03-05T00:00:00.000Z")
      ],
      approvalIssues: [],
      agingIssues: [],
      devFlowFieldId,
      startDate: "2026-03-01",
      endDate: "2026-03-05"
    });

    expect(series.daily[2]).toMatchObject({ leadTimeAverage: 2, leadTimeP50: 2, deliveries: 1 });
    expect(series.daily[4]).toMatchObject({ leadTimeAverage: 4, deliveries: 1 });
    expect(series.daily[0].leadTimeAverage).toBeNull();
    expect(series.weekly[1]).toMatchObject({ leadTimeAverage: 3, leadTimeP50: 2, deliveries: 2 });
  });

  it("splits the lead time between the AI flow and the human flow", () => {
    const series = buildFlowSeries({
      doneIssues: [
        doneIn("MUR-1", "2026-03-01T00:00:00.000Z", "2026-03-03T00:00:00.000Z", true),
        doneIn("MUR-2", "2026-03-01T00:00:00.000Z", "2026-03-07T00:00:00.000Z")
      ],
      approvalIssues: [],
      agingIssues: [],
      devFlowFieldId,
      startDate: "2026-03-01",
      endDate: "2026-03-07"
    });

    expect(series.weekly[1].leadTimeAiAverage).toBe(2);
    expect(series.weekly[1].leadTimeHumanAverage).toBe(6);
  });

  it("dates the approval wait by the first entry into the gate", () => {
    const issue = makeIssue("MUR-1", [
      { from: JIRA_STATUS_ID.PENDING, to: JIRA_STATUS_ID.APPROVAL, at: "2026-03-02T00:00:00.000Z" },
      {
        from: JIRA_STATUS_ID.APPROVAL,
        to: JIRA_STATUS_ID.IN_PROGRESS,
        at: "2026-03-04T00:00:00.000Z"
      }
    ]);

    const series = buildFlowSeries({
      doneIssues: [],
      approvalIssues: [issue],
      agingIssues: [],
      devFlowFieldId,
      startDate: "2026-03-01",
      endDate: "2026-03-05"
    });

    expect(series.daily[1].approvalWaitAverage).toBe(2);
    expect(series.daily[3].approvalWaitAverage).toBeNull();
  });

  it("dates the aging by the entry into In Progress", () => {
    const issue = makeIssue(
      "MUR-1",
      [{ from: JIRA_STATUS_ID.PENDING, to: JIRA_STATUS_ID.IN_PROGRESS, at: "2026-03-03T00:00:00.000Z" }],
      { status: { id: JIRA_STATUS_ID.IN_PROGRESS, name: "Em andamento" } }
    );

    const series = buildFlowSeries({
      doneIssues: [],
      approvalIssues: [],
      agingIssues: [issue],
      devFlowFieldId,
      startDate: "2026-03-01",
      endDate: "2026-03-05"
    });

    expect(series.daily[2].agingAverage).not.toBeNull();
    expect(series.daily.filter((point) => point.agingAverage !== null)).toHaveLength(1);
  });
});
