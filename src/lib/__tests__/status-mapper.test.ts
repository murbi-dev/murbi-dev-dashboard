import { describe, expect, it } from "vitest";
import { isMappedJiraStatus, mapJiraStatusToBusinessStatus } from "@/lib/status-mapper";

describe("status mapper", () => {
  it("maps Jira technical statuses to business columns", () => {
    expect(mapJiraStatusToBusinessStatus("Tarefas pendentes")).toBe("Waiting");
    expect(mapJiraStatusToBusinessStatus("Em andamento")).toBe("In Development");
    expect(mapJiraStatusToBusinessStatus("Pull request")).toBe("In Development");
    expect(mapJiraStatusToBusinessStatus("Pronto para QA")).toBe("In Development");
    expect(mapJiraStatusToBusinessStatus("Teste QA")).toBe("Validation");
    expect(mapJiraStatusToBusinessStatus("Pronto para PROD")).toBe("Finalizing");
    expect(mapJiraStatusToBusinessStatus("Concluído")).toBe("Done");
  });

  it("keeps unknown Jira statuses out of the mapped set", () => {
    expect(isMappedJiraStatus("Backlog")).toBe(false);
    expect(isMappedJiraStatus("Status novo")).toBe(false);
  });
});
