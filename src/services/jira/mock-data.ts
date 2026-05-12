import { mapJiraStatusToBusinessStatus } from "@/lib/status-mapper";
import type { DashboardIssue, DashboardPayload, IssuePriority } from "@/types/dashboard";
import type { IssueSearchPayload, IssueSearchResult } from "@/types/issue-search";

const now = Date.now();
const hours = (value: number) => new Date(now - value * 60 * 60 * 1000).toISOString();
const days = (value: number) => new Date(now - value * 24 * 60 * 60 * 1000).toISOString();

function issue(
  key: string,
  title: string,
  jiraStatus: string,
  issueTypeName: string,
  storyPoints: number | undefined,
  epic: DashboardIssue["epic"],
  assignee: string,
  priority: IssuePriority,
  createdAt: string,
  updatedAt: string,
  statusChangedAt: string
): DashboardIssue {
  return {
    id: key,
    key,
    title,
    issueType: {
      name: issueTypeName
    },
    storyPoints,
    epic,
    assignee: { name: assignee },
    priority,
    jiraStatus,
    businessStatus: mapJiraStatusToBusinessStatus(jiraStatus),
    isHotfix: title.includes("[HOTFIX]"),
    createdAt,
    updatedAt,
    statusChangedAt
  };
}

export function getMockDashboard(warning?: string): DashboardPayload {
  return {
    sprint: {
      id: "mock-active-sprint",
      name: "Sprint ativa atual"
    },
    source: "mock",
    warning,
    fetchedAt: new Date().toISOString(),
    issues: [
      issue(
        "MRB-421",
        "[HOTFIX] Falha no callback de pagamento de assinaturas",
        "Em andamento",
        "Bug",
        3,
        { key: "MRB-100", name: "Pagamentos" },
        "Ana Costa",
        "Highest",
        days(3),
        hours(8),
        hours(8)
      ),
      issue(
        "MRB-417",
        "Banner de status para ativações atrasadas",
        "Pronto para QA",
        "Story",
        5,
        { key: "MRB-101", name: "Ativações" },
        "Bruno Lima",
        "High",
        days(5),
        hours(2),
        hours(50)
      ),
      issue(
        "MRB-409",
        "Normalizar eventos de saúde da conta",
        "Pull Request",
        "Task",
        2,
        { key: "MRB-102", name: "Saúde da conta" },
        "Camila Rocha",
        "Medium",
        days(4),
        hours(1),
        hours(5)
      ),
      issue(
        "MRB-402",
        "Visibilidade de suporte para retentativas de nota",
        "QA",
        "Story",
        undefined,
        { key: "MRB-103", name: "Suporte financeiro" },
        "Diego Alves",
        "High",
        days(8),
        hours(4),
        hours(32)
      ),
      issue(
        "MRB-398",
        "Melhorar sinal da fila de primeira resposta",
        "To Do",
        "Task",
        3,
        undefined,
        "Sem responsável",
        "Medium",
        days(2),
        hours(10),
        hours(10)
      ),
      issue(
        "MRB-391",
        "Exportação operacional para revisão mensal",
        "Pronto para PROD",
        "Task",
        1,
        { key: "MRB-104", name: "Operações" },
        "Fernanda Melo",
        "Low",
        days(11),
        hours(3),
        hours(28)
      ),
      issue(
        "MRB-387",
        "Histórico de auditoria de renovação de conta",
        "Done",
        "Story",
        8,
        { key: "MRB-105", name: "Renovação" },
        "Gabriel Souza",
        "Medium",
        days(7),
        hours(5),
        hours(5)
      ),
      issue(
        "MRB-382",
        "[HOTFIX] Corrigir notificações de alerta duplicadas",
        "Pronto para QA",
        "Bug",
        2,
        { key: "MRB-106", name: "Alertas" },
        "Helena Dias",
        "Highest",
        days(1),
        hours(1),
        hours(1)
      ),
      issue(
        "MRB-376",
        "Indicador de linha do tempo do contrato",
        "Em andamento",
        "Story",
        5,
        { key: "MRB-107", name: "Contratos" },
        "Igor Martins",
        "Medium",
        days(6),
        hours(18),
        hours(26)
      )
    ]
  };
}

const mockSearchOnlyIssues: IssueSearchResult[] = [
  {
    id: "MRB-182",
    key: "MRB-182",
    title: "Ajustar importador de clientes legados",
    jiraStatus: "To Do",
    assignee: { name: "Sem responsável" },
    isHotfix: false,
    updatedAt: days(14),
    locationLabel: "Backlog / sem sprint",
    url: "https://murbi-team.atlassian.net/browse/MRB-182"
  },
  {
    id: "MRB-295",
    key: "MRB-295",
    title: "Revisar login de operadores internos",
    jiraStatus: "Done",
    assignee: { name: "Larissa Nunes" },
    isHotfix: false,
    updatedAt: days(35),
    sprint: { name: "Sprint 17", state: "closed" },
    locationLabel: "Concluído · Sprint 17",
    url: "https://murbi-team.atlassian.net/browse/MRB-295"
  },
  {
    id: "MRB-430",
    key: "MRB-430",
    title: "Fidelidade: preparar regras da próxima sprint",
    jiraStatus: "To Do",
    assignee: { name: "Marina Freitas" },
    isHotfix: false,
    updatedAt: days(4),
    sprint: { name: "Sprint futura", state: "future" },
    locationLabel: "Próxima sprint · Sprint futura",
    url: "https://murbi-team.atlassian.net/browse/MRB-430"
  }
];

function issueToSearchResult(issue: DashboardIssue): IssueSearchResult {
  return {
    id: issue.id,
    key: issue.key,
    title: issue.title,
    jiraStatus: issue.jiraStatus,
    assignee: issue.assignee,
    isHotfix: issue.isHotfix,
    updatedAt: issue.updatedAt,
    sprint: { name: "Sprint ativa atual", state: "active" },
    locationLabel: issue.businessStatus === "Done" ? "Concluído · Sprint ativa atual" : "Sprint atual · Sprint ativa atual",
    url: issue.url
  };
}

export function searchMockIssues(query: string, warning?: string): IssueSearchPayload {
  const normalizedQuery = query.trim().toLowerCase();
  const currentSprintResults = getMockDashboard().issues.map(issueToSearchResult);

  return {
    query,
    results: [...currentSprintResults, ...mockSearchOnlyIssues]
      .filter(
        (issue) =>
          issue.key.toLowerCase().includes(normalizedQuery) ||
          issue.title.toLowerCase().includes(normalizedQuery) ||
          issue.jiraStatus.toLowerCase().includes(normalizedQuery)
      )
      .slice(0, 15),
    source: "mock",
    fetchedAt: new Date().toISOString(),
    warning
  };
}
