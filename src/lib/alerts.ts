import { getAgeInHours } from "@/lib/time";
import type { BusinessStatus, DashboardIssue } from "@/types/dashboard";

type AlertLevel = "none" | "warning" | "critical";

const staleThresholds: Partial<Record<BusinessStatus, { warning: number; critical: number }>> = {
  /**
   * Planning is the AI writing the spec and, when the card asks for it, the
   * design and the tasks. Looser than active development because a big card
   * legitimately takes longer to plan. Calibrate against the
   * "Tempo de Planejamento (IA)" metric.
   */
  Planning: { warning: 48, critical: 96 },
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
