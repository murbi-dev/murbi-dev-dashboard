import { getBusinessStatusLabel, getPriorityLabel } from "@/lib/display";
import type { DashboardIssue } from "@/types/dashboard";

const exportHeaders = [
  "Chave",
  "Título",
  "Tipo",
  "Complexidade",
  "Prioridade",
  "Status Jira",
  "Status do Fluxo",
  "Responsável",
  "HOTFIX",
  "Épico",
  "Chave do Épico",
  "Reprovações QA",
  "Criado em",
  "Atualizado em",
  "Status desde",
  "Data limite",
  "URL"
];

function cleanTitle(title: string): string {
  return title.replace("[HOTFIX]", "").trim();
}

function formatBoolean(value: boolean): string {
  return value ? "Sim" : "Não";
}

function escapeHtml(value: string | number | undefined): string {
  const text = value === undefined ? "" : String(value);

  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function issueToExportRow(issue: DashboardIssue): Array<string | number | undefined> {
  return [
    issue.key,
    cleanTitle(issue.title),
    issue.issueType.name,
    issue.complexity,
    getPriorityLabel(issue.priority),
    issue.jiraStatus,
    getBusinessStatusLabel(issue.businessStatus),
    issue.assignee.name,
    formatBoolean(issue.isHotfix),
    issue.epic?.name,
    issue.epic?.key,
    issue.qaRejectionCount,
    issue.createdAt,
    issue.updatedAt,
    issue.statusChangedAt,
    issue.dueDate,
    issue.url
  ];
}

export function buildDashboardExportXls(issues: DashboardIssue[]): string {
  const headerCells = exportHeaders.map((header) => `<th>${escapeHtml(header)}</th>`).join("");
  const bodyRows = issues
    .map((issue) => `<tr>${issueToExportRow(issue).map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`)
    .join("");

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
  </head>
  <body>
    <table>
      <thead>
        <tr>${headerCells}</tr>
      </thead>
      <tbody>
        ${bodyRows}
      </tbody>
    </table>
  </body>
</html>`;
}
