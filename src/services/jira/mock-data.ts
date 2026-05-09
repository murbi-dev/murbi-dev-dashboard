import { mapJiraStatusToBusinessStatus } from "@/lib/status-mapper";
import type { DashboardIssue, DashboardPayload, IssuePriority } from "@/types/dashboard";

const now = Date.now();
const hours = (value: number) => new Date(now - value * 60 * 60 * 1000).toISOString();
const days = (value: number) => new Date(now - value * 24 * 60 * 60 * 1000).toISOString();

function issue(
  key: string,
  title: string,
  jiraStatus: string,
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
      issue("MRB-421", "[HOTFIX] Falha no callback de pagamento de assinaturas", "In Progress", "Ana Costa", "Highest", days(3), hours(8), hours(8)),
      issue("MRB-417", "Banner de status para ativações atrasadas", "Pronto para QA", "Bruno Lima", "High", days(5), hours(2), hours(50)),
      issue("MRB-409", "Normalizar eventos de saúde da conta", "Pull Request", "Camila Rocha", "Medium", days(4), hours(1), hours(5)),
      issue("MRB-402", "Visibilidade de suporte para retentativas de nota", "QA", "Diego Alves", "High", days(8), hours(4), hours(32)),
      issue("MRB-398", "Melhorar sinal da fila de primeira resposta", "To Do", "Sem responsável", "Medium", days(2), hours(10), hours(10)),
      issue("MRB-391", "Exportação operacional para revisão mensal", "PRONTO PARA PROD", "Fernanda Melo", "Low", days(11), hours(3), hours(28)),
      issue("MRB-387", "Histórico de auditoria de renovação de conta", "Done", "Gabriel Souza", "Medium", days(7), hours(5), hours(5)),
      issue("MRB-382", "[HOTFIX] Corrigir notificações de alerta duplicadas", "Pronto para QA", "Helena Dias", "Highest", days(1), hours(1), hours(1)),
      issue("MRB-376", "Indicador de linha do tempo do contrato", "In Progress", "Igor Martins", "Medium", days(6), hours(18), hours(26))
    ]
  };
}
