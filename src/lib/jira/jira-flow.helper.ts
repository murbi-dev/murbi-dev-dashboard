/**
 * Flow metrics helper — shared logic for Lead Time, Aging and active-issue
 * detection.
 *
 * ## Status names used in changelog scanning
 *
 * The Jira API may return either the **display name** (Portuguese) or the
 * **system name** (English) in the changelog (`fromString` / `toString`).
 * Both forms are checked:
 *
 * - **In Progress (start of work):** `"Em andamento"` / `"In Progress"`
 * - **Done (completion):** `"Concluído"` / `"Done"`
 *
 * ## Lead Time
 *
 * The time between the **first** entry into an In-Progress status and the
 * **first** entry into a Done status.
 *
 * Formula:
 * ```
 * Lead Time = firstDoneDate - firstInProgressDate
 * ```
 *
 * Only tickets that have **both** a known In-Progress entry and a known Done
 * entry produce a lead time. Tickets that skip "Em andamento" / "In Progress"
 * (e.g., go directly from "Tarefas pendentes" to "Pull request") are skipped.
 * Re-openings are ignored — always uses the first occurrence.
 *
 * ## Aging
 *
 * The time a currently-active ticket has spent in the flow since it was
 * started.
 *
 * Formula:
 * ```
 * Aging = now - firstInProgressDate
 * ```
 *
 * Only tickets that have entered "Em andamento"/"In Progress" at least once
 * are considered active. Tickets still in "Tarefas pendentes" / "To Do"
 * (never started) are excluded.
 *
 * ## Active issue detection
 *
 * A ticket is considered **active** when:
 * 1. Its current Jira status is NOT "Concluído" / "Done".
 * 2. Its changelog shows at least one transition **to** "Em andamento" /
 *    "In Progress".
 *
 * ## Future improvements
 *
 * - Make the entry status names configurable or derive them directly from
 *   `STATUS_MAPPING` in `status-mapper.ts`.
 * - Handle the case where an issue enters "Pull request" or another
 *   development status directly without passing through an In-Progress
 *   equivalent.
 * - Account for re-openings and count only net flow time.
 * - Use business-hours / calendar-aware durations instead of calendar days.
 * - Support Cycle Time (time from first In Progress to first Done, excluding
 *   waiting/blocked time).
 */

import type { JiraIssue } from "@/types/jira";
import { STATUS_MAPPING } from "@/lib/status-mapper";

/**
 * Normalised display names for the "In Progress" (start of work) status.
 *
 * Both Portuguese (`"em andamento"`) and English (`"in progress"`) forms are
 * covered since the Jira changelog may return either depending on the
 * environment configuration.
 */
const IN_PROGRESS_ENTRY_NAMES = new Set([
  ...STATUS_MAPPING["In Development"].slice(0, 1).map((s) => s.toLowerCase()),
  "in progress"
]);

/**
 * Normalised display names for the "Done" (completion) status.
 *
 * Portuguese: `"concluído"`, English: `"done"`.
 */
const DONE_ENTRY_NAMES = new Set([
  ...STATUS_MAPPING["Done"].map((s) => s.toLowerCase()),
  "done"
]);

/**
 * Normalises a Jira status name for case-insensitive comparison.
 */
function normalize(status: string): string {
  return status.trim().toLowerCase();
}

/**
 * Extracts all status-change events from the changelog, sorted oldest first.
 */
function getStatusHistory(issue: JiraIssue): Array<{
  fromStatus: string;
  toStatus: string;
  changedAt: string;
}> {
  if (!issue.changelog?.histories) return [];

  const events: Array<{
    fromStatus: string;
    toStatus: string;
    changedAt: string;
  }> = [];

  for (const history of issue.changelog.histories) {
    for (const item of history.items) {
      if (
        item.field.toLowerCase() === "status" &&
        item.fromString != null &&
        item.toString != null
      ) {
        events.push({
          fromStatus: item.fromString,
          toStatus: item.toString,
          changedAt: history.created
        });
      }
    }
  }

  return events.sort(
    (a, b) => new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime()
  );
}

/**
 * Returns the date of the **first** time this issue entered an In-Progress
 * status.
 *
 * @returns ISO date string, or `null` if no such transition exists.
 */
export function getFirstInProgressDate(issue: JiraIssue): string | null {
  const history = getStatusHistory(issue);

  for (const event of history) {
    if (IN_PROGRESS_ENTRY_NAMES.has(normalize(event.toStatus))) {
      return event.changedAt;
    }
  }

  return null;
}

/**
 * Returns the date of the **first** time this issue entered Done.
 *
 * @returns ISO date string, or `null` if no such transition exists.
 */
export function getFirstDoneDate(issue: JiraIssue): string | null {
  const history = getStatusHistory(issue);

  for (const event of history) {
    if (DONE_ENTRY_NAMES.has(normalize(event.toStatus))) {
      return event.changedAt;
    }
  }

  return null;
}

/**
 * Calculates the **Lead Time** for a single issue.
 *
 * Lead Time = firstDoneDate - firstInProgressDate
 *
 * @returns The number of calendar days (rounded to 1 decimal), or `null` if
 *   the issue lacks either a known In-Progress or Done entry.
 */
export function calculateLeadTime(issue: JiraIssue): number | null {
  const startIso = getFirstInProgressDate(issue);
  const endIso = getFirstDoneDate(issue);

  if (!startIso || !endIso) return null;

  const startMs = new Date(startIso).getTime();
  const endMs = new Date(endIso).getTime();

  if (endMs <= startMs) return null;

  return roundTo1((endMs - startMs) / (1000 * 60 * 60 * 24));
}

/**
 * Calculates the **Aging** for a single active issue.
 *
 * Aging = now - firstInProgressDate
 *
 * @returns The number of calendar days (rounded to 1 decimal), or `null` if
 *   the issue never entered In Progress.
 */
export function calculateAging(issue: JiraIssue): number | null {
  const startIso = getFirstInProgressDate(issue);

  if (!startIso) return null;

  const startMs = new Date(startIso).getTime();
  const nowMs = Date.now();

  return roundTo1((nowMs - startMs) / (1000 * 60 * 60 * 24));
}

/**
 * Returns `true` if the issue is currently **active**:
 * - Not in a Done status.
 * - Has entered an In-Progress status at least once.
 */
export function isActiveIssue(issue: JiraIssue): boolean {
  const currentStatus = normalize(issue.fields.status.name);

  if (DONE_ENTRY_NAMES.has(currentStatus)) return false;

  return getFirstInProgressDate(issue) !== null;
}

/**
 * Returns the list of Jira status **display names** that are considered
 * "active" (i.e. part of the development flow but not Done).
 *
 * This is derived from `STATUS_MAPPING` automatically.
 */
export function getActiveJiraStatusNames(): string[] {
  return [
    ...STATUS_MAPPING["In Development"],
    ...STATUS_MAPPING["Validation"],
    ...STATUS_MAPPING["Finalizing"]
  ];
}

/**
 * Calculates the **P-th percentile** from an array of values using the
 * nearest-rank method.
 *
 * @param sortedValues - Numeric values, **must already be sorted ascending**.
 * @param percentile - Percentile to compute (e.g. 50, 75, 90).
 * @returns The value at the computed rank.
 */
export function calculatePercentile(sortedValues: number[], percentile: number): number {
  if (sortedValues.length === 0) return 0;

  const index = Math.ceil((percentile / 100) * sortedValues.length) - 1;

  return sortedValues[Math.max(0, index)];
}

function roundTo1(value: number): number {
  return Math.round(value * 10) / 10;
}
