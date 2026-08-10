import { describe, expect, it } from "vitest";
import {
  BUSINESS_STATUSES,
  isMappedJiraStatus,
  JIRA_STATUS_ID,
  mapJiraStatusToBusinessStatus
} from "@/lib/status-mapper";

describe("status mapper", () => {
  it("maps Jira status ids to business columns", () => {
    expect(mapJiraStatusToBusinessStatus(JIRA_STATUS_ID.PENDING)).toBe("Waiting");
    expect(mapJiraStatusToBusinessStatus(JIRA_STATUS_ID.IN_PROGRESS)).toBe("In Development");
    expect(mapJiraStatusToBusinessStatus(JIRA_STATUS_ID.PULL_REQUEST)).toBe("In Development");
    expect(mapJiraStatusToBusinessStatus(JIRA_STATUS_ID.READY_FOR_QA)).toBe("In Development");
    expect(mapJiraStatusToBusinessStatus(JIRA_STATUS_ID.QA_TESTING)).toBe("Validation");
    expect(mapJiraStatusToBusinessStatus(JIRA_STATUS_ID.READY_FOR_PROD)).toBe("Finalizing");
    expect(mapJiraStatusToBusinessStatus(JIRA_STATUS_ID.DONE)).toBe("Done");
  });

  it("maps both gate statuses to the Approval column", () => {
    expect(mapJiraStatusToBusinessStatus(JIRA_STATUS_ID.APPROVAL)).toBe("Approval");
    expect(mapJiraStatusToBusinessStatus(JIRA_STATUS_ID.APPROVAL_REJECTED)).toBe("Approval");
  });

  it("never leaves a gate status in Pendente", () => {
    for (const id of [JIRA_STATUS_ID.APPROVAL, JIRA_STATUS_ID.APPROVAL_REJECTED]) {
      expect(isMappedJiraStatus(id)).toBe(true);
      expect(mapJiraStatusToBusinessStatus(id)).not.toBe("Waiting");
    }
  });

  it("ignores the display name entirely", () => {
    // The name is translated per the language of the account that queries and
    // changes on rename. Neither must affect the mapping.
    expect(isMappedJiraStatus("Aprovação")).toBe(false);
    expect(isMappedJiraStatus("In Progress")).toBe(false);
    expect(isMappedJiraStatus("Em andamento")).toBe(false);
  });

  it("keeps unmapped status ids out of the mapped set", () => {
    expect(isMappedJiraStatus(JIRA_STATUS_ID.BACKLOG)).toBe(false);
    expect(isMappedJiraStatus("99999")).toBe(false);
  });

  it("falls back to Waiting so an unmapped status still lands somewhere", () => {
    expect(mapJiraStatusToBusinessStatus("99999")).toBe("Waiting");
  });

  it("keeps Approval between Waiting and In Development", () => {
    expect(BUSINESS_STATUSES).toEqual([
      "Waiting",
      "Approval",
      "In Development",
      "Validation",
      "Finalizing",
      "Done"
    ]);
  });
});
