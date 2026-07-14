import { describe, expect, it } from "vitest";
import { JiraFieldMetadataMapper } from "@/lib/jira/jira-field-metadata.mapper";
import type { JiraField } from "@/types/jira";

describe("JiraFieldMetadataMapper", () => {
  const mapper = new JiraFieldMetadataMapper();

  it("resolves the Fluxo Dev custom field id by name", () => {
    const fields: JiraField[] = [
      { id: "customfield_10345", name: "Complexidade" },
      {
        id: "customfield_10414",
        name: "Fluxo Dev",
        schema: { type: "option", custom: "com.atlassian.jira.plugin.system.customfieldtypes:select" }
      }
    ];

    expect(mapper.getDashboardFieldMetadata(fields)).toMatchObject({
      complexityFieldId: "customfield_10345",
      devFlowFieldId: "customfield_10414"
    });
  });

  it("leaves the Fluxo Dev field id undefined when the board does not expose it", () => {
    const fields: JiraField[] = [{ id: "customfield_10345", name: "Complexidade" }];

    expect(mapper.getDashboardFieldMetadata(fields).devFlowFieldId).toBeUndefined();
  });
});
