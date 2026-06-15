/**
 * Quality Metrics Service.
 *
 * Computes engineering quality metrics from raw Jira data.
 *
 * ## Delivery Quality Rate
 *
 * Measures the percentage of delivered tickets that passed through the
 * development flow without needing to return from QA for rework.
 *
 * ### Formula
 *
 * ```
 * Delivery Quality Rate = (Total Entregas - Entregas com Retrabalho) / Total Entregas
 * ```
 *
 * - **Total Entregas**: Tickets that entered "Concluído" (Done) within the
 *   selected date range (based on `status CHANGED TO` in the changelog).
 * - **Entregas com Retrabalho**: Delivered tickets that have at least one
 *   QA rejection event in their full changelog history.
 *
 * ### QA Rejection Definition
 *
 * A ticket is considered rejected by QA when the changelog shows a
 * transition **from** "Teste QA" **to** any rework status:
 * "Tarefas Pendentes", "Em Andamento", "To Do", or "In Progress".
 *
 * This logic lives in `src/lib/jira/jira-metrics.helper.ts` and is shared
 * with the main dashboard normalizer.
 *
 * ### Known Limitations
 *
 * - Delivered tickets that were reopened and moved out of "Done" to an
 *   active status may not be captured by the current JQL filter (the
 *   filter requires `status = Done` — the system status name).
 * - Relies on `expand=changelog` — if the changelog is truncated by Jira
 *   (more than 100 entries), some rejection events may be missed.
 * - The JQL uses the Jira system status name "Done". If your Jira
 *   instance uses a different system name for the Done status, adjust
 *   the JQL accordingly.
 *
 * ### Dependencies
 *
 * - Jira REST API with `expand=changelog`
 * - Jira credentials via `JiraConfigProvider`
 * - Shared helper `src/lib/jira/jira-metrics.helper.ts`
 */

import { jiraConfigProvider, JiraConfigProvider } from "@/lib/jira/jira-config.provider";
import { JiraClient } from "@/clients/jira/jira.client";
import { getQaRejectionCount, isHotfixIssue } from "@/lib/jira/jira-metrics.helper";
import type { QualityMetricsPayload, QualityReworkDelivery } from "@/types/quality";
import type { JiraConfig, JiraSearchResponse } from "@/types/jira";

export class JiraQualityService {
  private static readonly maxResults = 100;
  private static readonly baseFields = ["summary", "status", "issuetype", "updated", "assignee"].join(",");

  constructor(
    private readonly configProvider: JiraConfigProvider = jiraConfigProvider,
    private readonly clientFactory: (config: JiraConfig) => JiraClient = (config) => new JiraClient(config)
  ) {}

  /**
   * Computes the Delivery Quality Rate for the given date range.
   *
   * @param startDate - ISO date string (YYYY-MM-DD) for the range start.
   * @param endDate - ISO date string (YYYY-MM-DD) for the range end.
   * @param hotfixOnly - When `true`, only HOTFIX deliveries are considered.
   * @returns Quality metrics payload.
   */
  async getQualityMetrics(
    startDate: string,
    endDate: string,
    hotfixOnly = false
  ): Promise<QualityMetricsPayload> {
    const config = this.configProvider.getConfig();

    if (!config) {
      throw new Error("Credenciais do Jira ausentes.");
    }

    try {
      const client = this.clientFactory(config);
      const fetchedIssues = await this.fetchDeliveredIssues(client, config.boardId, startDate, endDate);
      const issues = hotfixOnly ? fetchedIssues.filter(isHotfixIssue) : fetchedIssues;

      let totalDeliveries = 0;
      let deliveriesWithRework = 0;
      let totalQaRejections = 0;
      const reworkDeliveries: QualityReworkDelivery[] = [];

      for (const issue of issues) {
        const rejectionCount = getQaRejectionCount(issue);

        if (rejectionCount > 0) {
          deliveriesWithRework += 1;
          reworkDeliveries.push({
            key: issue.key,
            summary: issue.fields.summary,
            assignee: issue.fields.assignee?.displayName ?? "Sem responsável",
            rejectionCount,
            currentStatus: issue.fields.status.name
          });
        }

        totalQaRejections += rejectionCount;
        totalDeliveries += 1;
      }

      reworkDeliveries.sort((a, b) => b.rejectionCount - a.rejectionCount);

      const deliveriesWithoutRework = totalDeliveries - deliveriesWithRework;
      const qualityRate = totalDeliveries > 0
        ? Math.round((deliveriesWithoutRework / totalDeliveries) * 100)
        : 100;

      return {
        dateRange: { start: startDate, end: endDate },
        totalDeliveries,
        deliveriesWithRework,
        deliveriesWithoutRework,
        totalQaRejections,
        qualityRate,
        reworkDeliveries
      };
    } catch (error) {
      console.error("Error fetching quality metrics:", error);

      throw error;
    }
  }

  /**
   * Fetches all issues that entered "Concluído" (Done) within the date range.
   */
  private async fetchDeliveredIssues(
    client: JiraClient,
    boardId: string,
    startDate: string,
    endDate: string
  ) {
    const issues: JiraSearchResponse["issues"] = [];
    let startAt = 0;
    let total = Number.POSITIVE_INFINITY;

    /**
     * JQL: Find issues that:
     * - Are not Epics or subtasks
     * - Are currently in the Done status
     * - Had a status change to Done within the date range
     *
     * Uses the Jira system status name ("Done"), not the localized display
     * name (e.g. "Concluído"). JQL operates on system names.
     *
     * We add 1 day to the end date to make the range inclusive.
     */
    const endDateExclusive = this.addDays(endDate, 1);
    const jql = encodeURIComponent(
      `issuetype != Epic AND issuetype not in subTaskIssueTypes() AND status = Done AND status CHANGED TO Done AFTER "${startDate}" AND status CHANGED TO Done BEFORE "${endDateExclusive}"`
    );

    while (startAt < total) {
      const response = await client.get<JiraSearchResponse>(
        `/rest/agile/1.0/board/${boardId}/issue?jql=${jql}&fields=${JiraQualityService.baseFields}&expand=changelog&startAt=${startAt}&maxResults=${JiraQualityService.maxResults}`
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

export const jiraQualityService = new JiraQualityService();
