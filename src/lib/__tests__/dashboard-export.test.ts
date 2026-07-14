import { describe, expect, it } from "vitest";
import { buildDashboardExportXls } from "@/lib/dashboard-export";
import type { DashboardIssue } from "@/types/dashboard";

function issue(overrides: Partial<DashboardIssue> = {}): DashboardIssue {
  return {
    id: "10001",
    key: "MURBI-571",
    title: "Ajustar exportacao; validar aspas",
    issueType: {
      name: "Story"
    },
    complexity: "M",
    epic: {
      key: "MURBI-500",
      name: 'Epico "Operacional"'
    },
    assignee: {
      name: "Ana Silva"
    },
    priority: "HOTFIX",
    jiraStatus: "Em andamento",
    businessStatus: "In Development",
    isHotfix: true,
    isAiDev: true,
    qaRejectionCount: 2,
    qaRejections: [],
    createdAt: "2026-06-01T10:00:00.000-0300",
    updatedAt: "2026-06-02T10:00:00.000-0300",
    dueDate: "2026-06-10",
    statusChangedAt: "2026-06-02T10:00:00.000-0300",
    url: "https://murbi-team.atlassian.net/browse/MURBI-571",
    ...overrides
  };
}

describe("buildDashboardExportXls", () => {
  it("exports visible dashboard issue fields as an Excel-readable table", () => {
    const xls = buildDashboardExportXls([issue()]);

    expect(xls).toContain("<table>");
    expect(xls).toContain("<th>Chave</th><th>Título</th><th>Tipo</th>");
    expect(xls).toContain("<td>MURBI-571</td>");
    expect(xls).toContain("<td>Ajustar exportacao; validar aspas</td>");
    expect(xls).toContain("<td>Epico &quot;Operacional&quot;</td>");
    expect(xls).toContain("<td>Sim</td>");
  });

  it("exports the Dev IA column for each issue", () => {
    const xls = buildDashboardExportXls([issue({ isHotfix: false, isAiDev: true })]);

    expect(xls).toContain("<th>Dev IA</th>");
    expect(xls).toContain("<td>Ana Silva</td><td>Não</td><td>Sim</td>");
  });
});
