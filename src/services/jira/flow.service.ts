/**
 * Flow Metrics Service.
 *
 * Computes Lead Time and Aging metrics from raw Jira data.
 *
 * ## Lead Time
 *
 * Measures how long completed tickets took to traverse the flow from first
 * In Progress to first Done.
 *
 * - **Data source:** Tickets that entered "Done" within the selected date
 *   range (based on `status CHANGED TO` in the changelog).
 * - **Formula:** `firstDoneDate - firstInProgressDate`
 * - **Excludes:** Tickets without a known In-Progress or Done entry in
 *   their changelog.
 *
 * ## Aging
 *
 * Measures how long currently-active tickets have been in the flow without
 * being completed.
 *
 * - **Data source:** Tickets that are currently active (non-Done, non-Backlog,
 *   non-Epic, non-subtask) and entered an In-Progress status within the
 *   selected date range.
 * - **Formula:** `now - firstInProgressDate`
 *
 * ## Known Limitations
 *
 * - Changelog may be truncated (Jira default limit is 100 entries per page;
 *   we fetch only the first page).
 * - "In Progress" is determined by the "Em andamento" display name in the
 *   changelog. If a ticket enters development via a different status
 *   (e.g. "Pull request") without passing through "Em andamento", it will
 *   not contribute to lead time or aging.
 * - Calendar days are used, not business hours.
 * - Re-openings are ignored — always uses the first occurrence of each status.
 *
 * ## Dependencies
 *
 * - Jira REST API with `expand=changelog`
 * - Jira credentials via `JiraConfigProvider`
 * - Shared helper `src/lib/jira/jira-flow.helper.ts`
 */

import { jiraConfigProvider, JiraConfigProvider } from "@/lib/jira/jira-config.provider";
import { JiraClient } from "@/clients/jira/jira.client";
import {
  calculateLeadTime,
  calculateAging,
  calculateApprovalWait,
  isActiveIssue,
  isAiDevIssue,
  getFirstInProgressDate,
  buildFlowStats
} from "@/lib/jira/jira-flow.helper";
import { isHotfixIssue } from "@/lib/jira/jira-metrics.helper";
import { jiraFieldMetadataCacheService, JiraFieldMetadataCacheService } from "./field-metadata-cache.service";
import type { FlowByDevType, FlowMetricsPayload, FlowStats, AgingIssue } from "@/types/flow";
import type { JiraConfig, JiraIssue, JiraSearchResponse } from "@/types/jira";

export class JiraFlowService {
  private static readonly maxResults = 100;
  private static readonly baseFields = ["summary", "status", "issuetype", "priority", "assignee"].join(",");

  constructor(
    private readonly configProvider: JiraConfigProvider = jiraConfigProvider,
    private readonly clientFactory: (config: JiraConfig) => JiraClient = (config) => new JiraClient(config),
    private readonly fieldMetadataCacheService: JiraFieldMetadataCacheService = jiraFieldMetadataCacheService
  ) {}

  /**
   * Computes Lead Time and Aging metrics for the given date range.
   *
   * @param startDate - ISO date string (YYYY-MM-DD) for the range start.
   * @param endDate - ISO date string (YYYY-MM-DD) for the range end.
   * @param hotfixOnly - When `true`, only HOTFIX issues are considered.
   * @returns Flow metrics payload.
   */
  async getFlowMetrics(
    startDate: string,
    endDate: string,
    hotfixOnly = false
  ): Promise<FlowMetricsPayload> {
    const config = this.configProvider.getConfig();

    if (!config) {
      throw new Error("Credenciais do Jira ausentes.");
    }

    try {
      const client = this.clientFactory(config);
      const fieldMetadata = await this.fieldMetadataCacheService.getCachedFieldMetadata(client, config.boardId);
      const devFlowFieldId = fieldMetadata.devFlowFieldId;
      const fields = devFlowFieldId
        ? `${JiraFlowService.baseFields},${devFlowFieldId}`
        : JiraFlowService.baseFields;

      const [fetchedDoneIssues, fetchedActiveIssues] = await Promise.all([
        this.fetchDoneIssues(client, config.boardId, startDate, endDate, fields),
        this.fetchActiveIssues(client, config.boardId, fields)
      ]);

      const doneIssues = hotfixOnly ? fetchedDoneIssues.filter(isHotfixIssue) : fetchedDoneIssues;
      const activeIssues = hotfixOnly ? fetchedActiveIssues.filter(isHotfixIssue) : fetchedActiveIssues;
      const activeInPeriod = computeActiveIssuesInPeriod(activeIssues, startDate, endDate);

      return {
        dateRange: { start: startDate, end: endDate },
        leadTime: this.computeLeadTime(doneIssues),
        leadTimeByFlow: this.computeStatsByFlow(doneIssues, devFlowFieldId, calculateLeadTime),
        aging: this.computeAging(activeInPeriod, devFlowFieldId),
        agingByFlow: this.computeStatsByFlow(activeInPeriod, devFlowFieldId, calculateAging),
        approvalWait: this.computeApprovalWait([...doneIssues, ...activeIssues])
      };
    } catch (error) {
      console.error("Error fetching flow metrics:", error);
      throw error;
    }
  }

  private computeLeadTime(issues: JiraSearchResponse["issues"]): FlowStats {
    const leadTimes: number[] = [];

    for (const issue of issues) {
      const lt = calculateLeadTime(issue);
      if (lt !== null) {
        leadTimes.push(lt);
      }
    }

    return buildFlowStats(leadTimes);
  }

  /**
   * Splits a per-issue metric (Lead Time or Aging) by dev flow (IA × Humano)
   * and builds independent statistics for each side.
   */
  private computeStatsByFlow(
    issues: JiraSearchResponse["issues"],
    devFlowFieldId: string | undefined,
    calcular: (issue: JiraIssue) => number | null
  ): FlowByDevType {
    const ia: number[] = [];
    const humano: number[] = [];

    for (const issue of issues) {
      const valor = calcular(issue);
      if (valor === null) continue;

      (isAiDevIssue(issue, devFlowFieldId) ? ia : humano).push(valor);
    }

    return { ai: buildFlowStats(ia), human: buildFlowStats(humano) };
  }

  /**
   * Builds the "Tempo de Aprovação (IA)" metric — how long cards waited in the
   * "Aprovação" PRD gate. Only AI-flow cards ever pass through this gate.
   */
  private computeApprovalWait(issues: JiraSearchResponse["issues"]): FlowStats {
    const esperas: number[] = [];

    for (const issue of issues) {
      const espera = calculateApprovalWait(issue);
      if (espera !== null) {
        esperas.push(espera);
      }
    }

    return buildFlowStats(esperas);
  }

  private computeAging(
    issues: JiraSearchResponse["issues"],
    devFlowFieldId?: string
  ): FlowMetricsPayload["aging"] {
    if (issues.length === 0) return null;

    const agingValues: number[] = [];
    const criticalIssues: AgingIssue[] = [];

    for (const issue of issues) {
      const aging = calculateAging(issue);
      if (aging === null) continue;

      agingValues.push(aging);
      criticalIssues.push({
        key: issue.key,
        summary: issue.fields.summary,
        assignee: issue.fields.assignee?.displayName ?? "Sem responsável",
        status: issue.fields.status.name,
        agingDays: aging,
        isAiDev: isAiDevIssue(issue, devFlowFieldId)
      });
    }

    if (agingValues.length === 0) return null;

    criticalIssues.sort((a, b) => b.agingDays - a.agingDays);

    const average = roundTo1(agingValues.reduce((acc, v) => acc + v, 0) / agingValues.length);

    return {
      average,
      over7Days: agingValues.filter((v) => v > 7).length,
      over14Days: agingValues.filter((v) => v > 14).length,
      over30Days: agingValues.filter((v) => v > 30).length,
      totalActiveIssues: agingValues.length,
      criticalIssues
    };
  }

  private async fetchDoneIssues(
    client: JiraClient,
    boardId: string,
    startDate: string,
    endDate: string,
    fields: string
  ): Promise<JiraSearchResponse["issues"]> {
    const issues: JiraSearchResponse["issues"] = [];
    let startAt = 0;
    let total = Number.POSITIVE_INFINITY;

    const endDateExclusive = this.addDays(endDate, 1);
    const jql = encodeURIComponent(
      `issuetype != Epic AND issuetype not in subTaskIssueTypes() AND status = Done AND status CHANGED TO Done AFTER "${startDate}" AND status CHANGED TO Done BEFORE "${endDateExclusive}"`
    );

    while (startAt < total) {
      const response = await client.get<JiraSearchResponse>(
        `/rest/agile/1.0/board/${boardId}/issue?jql=${jql}&fields=${fields}&expand=changelog&startAt=${startAt}&maxResults=${JiraFlowService.maxResults}`
      );

      issues.push(...response.issues);
      total = response.total;

      if (response.isLast || response.issues.length === 0) {
        break;
      }

      startAt += response.issues.length;
    }

    return issues;
  }

  private async fetchActiveIssues(
    client: JiraClient,
    boardId: string,
    fields: string
  ): Promise<JiraSearchResponse["issues"]> {
    const issues: JiraSearchResponse["issues"] = [];
    let startAt = 0;
    let total = Number.POSITIVE_INFINITY;

    const jql = encodeURIComponent(
      `issuetype != Epic AND issuetype not in subTaskIssueTypes() AND status != Backlog AND statusCategory != Done`
    );

    while (startAt < total) {
      const response = await client.get<JiraSearchResponse>(
        `/rest/agile/1.0/board/${boardId}/issue?jql=${jql}&fields=${fields}&expand=changelog&startAt=${startAt}&maxResults=${JiraFlowService.maxResults}`
      );

      issues.push(...response.issues);
      total = response.total;

      if (response.isLast || response.issues.length === 0) {
        break;
      }

      startAt += response.issues.length;
    }

    return issues;
  }

  private addDays(dateString: string, days: number): string {
    const date = new Date(dateString);
    date.setDate(date.getDate() + days);
    return date.toISOString().split("T")[0];
  }
}

/**
 * Filters active issues to only those that entered In Progress within the
 * date range.
 */
function computeActiveIssuesInPeriod(
  issues: JiraSearchResponse["issues"],
  startDate: string,
  endDate: string
): JiraSearchResponse["issues"] {
  const startMs = new Date(startDate).getTime();
  const endMs = new Date(endDate).getTime();

  return issues.filter((issue) => {
    if (!isActiveIssue(issue)) return false;

    const inProgressDate = getFirstInProgressDate(issue);
    if (!inProgressDate) return false;

    const inProgressMs = new Date(inProgressDate).getTime();

    return inProgressMs >= startMs && inProgressMs <= endMs;
  });
}

function roundTo1(value: number): number {
  return Math.round(value * 10) / 10;
}

export const jiraFlowService = new JiraFlowService();
