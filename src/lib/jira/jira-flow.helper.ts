/**
 * Flow metrics helper — shared logic for Lead Time, Aging and active-issue
 * detection.
 *
 * ## Status matching
 *
 * Everything here compares **status ids**, never names. The changelog carries
 * both (`from`/`to` are ids, `fromString`/`toString` are names), and the name
 * is translated per the language of the account that queries — so matching by
 * name silently stops working when the service account changes.
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
import type { FlowStats } from "@/types/flow";
import { JIRA_STATUS_ID } from "@/lib/status-mapper";

/** Status where work starts. */
const IN_PROGRESS_ENTRY_IDS = new Set<string>([JIRA_STATUS_ID.IN_PROGRESS]);

/** Status that means the card is finished. */
const DONE_ENTRY_IDS = new Set<string>([JIRA_STATUS_ID.DONE]);

/**
 * Status where the card waits on a person. Exclusive to the AI flow
 * (`Fluxo Dev = Dev IA`).
 *
 * Planning is where the AI writes the spec and, when the card asks for it, the
 * design and the tasks. The metric measures how long that planning takes.
 */
const PLANNING_ENTRY_IDS = new Set<string>([JIRA_STATUS_ID.PLANNING]);

/**
 * Normalised value of the `Fluxo Dev` field that flags an AI-driven card.
 */
const AI_DEV_FLOW_VALUE = "dev ia";

/**
 * Extracts all status-change events from the changelog, sorted oldest first.
 *
 * This is the single reader of the status changelog: the flow metrics, the
 * planning stage and the metrics time series all go through it, so the
 * "compare ids, never names" rule lives in one place.
 */
export function getStatusHistory(issue: JiraIssue): Array<{
  fromId: string;
  toId: string;
  changedAt: string;
}> {
  if (!issue.changelog?.histories) return [];

  const events: Array<{
    fromId: string;
    toId: string;
    changedAt: string;
  }> = [];

  for (const history of issue.changelog.histories) {
    for (const item of history.items) {
      if (item.field.toLowerCase() === "status" && item.from != null && item.to != null) {
        events.push({
          fromId: item.from,
          toId: item.to,
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
    if (IN_PROGRESS_ENTRY_IDS.has(event.toId)) {
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
    if (DONE_ENTRY_IDS.has(event.toId)) {
      return event.changedAt;
    }
  }

  return null;
}

/**
 * Returns the date of the **first** time this issue entered the planning stage.
 *
 * Used to place the "Tempo de Planejamento (IA)" of a card in a time bucket: the
 * wait itself is a sum of several stays, so the moment the card first asked for
 * approval is what dates it.
 *
 * @returns ISO date string, or `null` if the card never entered the gate.
 */
export function getFirstPlanningDate(issue: JiraIssue): string | null {
  const history = getStatusHistory(issue);

  for (const event of history) {
    if (PLANNING_ENTRY_IDS.has(event.toId)) {
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
  if (DONE_ENTRY_IDS.has(issue.fields.status.id)) return false;

  return getFirstInProgressDate(issue) !== null;
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

/**
 * Returns `true` if the card is AI-driven (`Fluxo Dev = Dev IA`). Reads the
 * dynamically-resolved Fluxo Dev field id; without it, defaults to `false`.
 */
export function isAiDevIssue(issue: JiraIssue, devFlowFieldId?: string): boolean {
  if (!devFlowFieldId) return false;

  const raw = (issue.fields as Record<string, unknown>)[devFlowFieldId];
  const value =
    typeof raw === "string"
      ? raw
      : raw && typeof raw === "object" && "value" in raw
        ? (raw as { value?: unknown }).value
        : undefined;

  return typeof value === "string" && value.trim().toLowerCase() === AI_DEV_FLOW_VALUE;
}

/**
 * Calculates how long the AI spent planning the card.
 *
 * Sums **every** stay in Planejamento, not just the first one. A card
 * now passes through the gate more than once by design — a rejection sends it
 * to "PRD/Spec Reprovado" and back, and sustaining cards are approved twice
 * (PRD, then Spec) — so measuring only the first stay would undercount. Time
 * spent in "PRD/Spec Reprovado" is not counted: there the AI is reworking.
 *
 * If the card is still sitting in the gate, the open stay counts until now.
 *
 * @returns Calendar days (rounded to 1 decimal), or `null` if the card never
 *   entered the planning stage.
 */
export function calculatePlanningTime(issue: JiraIssue): number | null {
  const history = getStatusHistory(issue);
  let entryMs: number | null = null;
  let totalMs = 0;
  let everEntered = false;

  for (const event of history) {
    if (entryMs === null && PLANNING_ENTRY_IDS.has(event.toId)) {
      entryMs = new Date(event.changedAt).getTime();
      everEntered = true;
      continue;
    }

    if (entryMs !== null && PLANNING_ENTRY_IDS.has(event.fromId)) {
      const exitMs = new Date(event.changedAt).getTime();

      if (exitMs > entryMs) {
        totalMs += exitMs - entryMs;
      }

      entryMs = null;
    }
  }

  if (entryMs !== null && PLANNING_ENTRY_IDS.has(issue.fields.status.id)) {
    totalMs += Date.now() - entryMs;
    everEntered = true;
  }

  return everEntered ? roundTo1(totalMs / (1000 * 60 * 60 * 24)) : null;
}

/**
 * Builds the standard flow statistics (average + percentiles) from a list of
 * day values. Returns `null` when there is no data.
 */
export function buildFlowStats(values: number[]): FlowStats {
  if (values.length === 0) return null;

  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, v) => acc + v, 0);

  return {
    average: roundTo1(sum / sorted.length),
    p50: calculatePercentile(sorted, 50),
    p75: calculatePercentile(sorted, 75),
    p90: calculatePercentile(sorted, 90),
    totalIssues: sorted.length
  };
}

function roundTo1(value: number): number {
  return Math.round(value * 10) / 10;
}
