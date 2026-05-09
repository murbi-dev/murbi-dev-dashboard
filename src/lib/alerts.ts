import { getAgeInHours } from "@/lib/time";
import type { BusinessStatus, DashboardIssue } from "@/types/dashboard";

type AlertLevel = "none" | "warning" | "critical";

const staleThresholds: Partial<Record<BusinessStatus, { warning: number; critical: number }>> = {
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
