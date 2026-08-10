import { getAgeInHours } from "@/lib/time";
import type { BusinessStatus, DashboardIssue } from "@/types/dashboard";

type AlertLevel = "none" | "warning" | "critical";

const staleThresholds: Partial<Record<BusinessStatus, { warning: number; critical: number }>> = {
  /**
   * The approval gate waits on a person, so it gets a looser threshold than
   * active development. Starting point, to be calibrated against the
   * "Tempo de Aprovação (IA)" metric once the new flow has run for a while.
   */
  Approval: { warning: 48, critical: 96 },
  "In Development": { warning: 24, critical: 48 },
  Validation: { warning: 48, critical: 72 },
  Finalizing: { warning: 24, critical: 48 }
};

export function getStaleLevel(issue: DashboardIssue): AlertLevel {
  const threshold = staleThresholds[issue.businessStatus];

  if (!threshold) {
    return "none";
  }

  const hours = getAgeInHours(issue.statusChangedAt);

  if (hours >= threshold.critical) {
    return "critical";
  }

  if (hours >= threshold.warning) {
    return "warning";
  }

  return "none";
}
