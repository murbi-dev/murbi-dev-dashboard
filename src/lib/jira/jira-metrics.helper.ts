/**
 * Shared helper for Jira metrics calculations.
 *
 * Centralizes QA rejection logic so both the dashboard normalizer and the
 * quality-metrics service use the same rules.
 *
 * ## What characterizes a QA rejection
 *
 * A ticket is considered rejected by QA when a changelog entry shows a
 * transition **from** "Teste QA" **to** any of the rework statuses:
 *
 * - "Tarefas Pendentes" / "tarefas pendentes"
 * - "Em Andamento" / "em andamento"
 * - "To Do" / "to do"
 * - "In Progress" / "in progress"
 *
 * Only transitions whose `field` equals `status` are evaluated. Status
 * names are normalised (trimmed, lower-cased) before comparison.
 *
 * ## Known limitations
 *
 * - Relies on `expand=changelog` being present in the Jira API call.
 * - Only detects rework that flows back through the defined statuses;
 *   any other path out of QA is not counted.
 * - The changelog may be truncated if the issue has too many transitions
 *   (Jira default limit is 100 entries per page; the dashboard fetches
 *   only the first page).
 * - Does not handle issues where the QA status has a different display
 *   name in the Jira project.
 *
 * ## Dependencies
 *
 * - Jira REST API with `expand=changelog` on the issue.
 * - The QA status name must be `Teste QA`.
 */

import type { JiraIssue } from "@/types/jira";

/**
 * Normalises a Jira status name for comparison.
 */
function normalizeStatusName(status: string): string {
  return status.trim().toLowerCase();
}

/** Raw QA status name as it appears in Jira. */
const qaStatusName = "teste qa";

/** Status names that represent rework (returning from QA). */
const qaRejectionTargetStatusNames = new Set([
  "tarefas pendentes",
  "em andamento",
  "to do",
  "in progress"
]);

/**
 * Returns the QA rejection events for a Jira issue.
 *
 * Each event contains the source status, target status, and the timestamp
 * of the transition. Events are sorted from newest to oldest.
 *
 * @param issue - A raw Jira issue with changelog.
 * @returns An array of rejection events (empty if none).
 */
export function getQaRejectionEvents(issue: JiraIssue): Array<{
  fromStatus: string;
  toStatus: string;
  changedAt: string;
}> {
  return (
    issue.changelog?.histories
      .flatMap((history) =>
        history.items
          .filter(
            (item) =>
              item.field.toLowerCase() === "status" &&
              item.fromString != null &&
              item.toString != null &&
              normalizeStatusName(item.fromString) === qaStatusName &&
              qaRejectionTargetStatusNames.has(normalizeStatusName(item.toString))
          )
          .map((item) => ({
            fromStatus: item.fromString as string,
            toStatus: item.toString as string,
            changedAt: history.created
          }))
      )
      .sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime()) ?? []
  );
}

/**
 * Returns the number of QA rejections for a Jira issue.
 *
 * @param issue - A raw Jira issue with changelog.
 * @returns The count of QA rejections.
 */
export function getQaRejectionCount(issue: JiraIssue): number {
  return getQaRejectionEvents(issue).length;
}

/**
 * Returns whether a Jira issue has been rejected by QA at least once.
 *
 * @param issue - A raw Jira issue with changelog.
 * @returns `true` if the issue has at least one QA rejection.
 */
export function hasQaRejection(issue: JiraIssue): boolean {
  return getQaRejectionEvents(issue).length > 0;
}
