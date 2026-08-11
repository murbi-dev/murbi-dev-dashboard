export type BusinessStatus =
  | "Waiting"
  | "Planning"
  | "In Development"
  | "Validation"
  | "Finalizing"
  | "Done";

/**
 * Which track a card came from, derived from the parent epic's "Divisão".
 * A card without an epic counts as sustaining — same rule the `dev-issue`
 * skill uses to decide which artefacts the card produces.
 */
export type IssueTrack = "project" | "sustaining";

/** Who the card is still waiting on while it sits in the approval gate. */

export type IssuePriority = "HOTFIX" | "Highest" | "High" | "Medium" | "Low" | "Lowest" | "Unknown";
export type IssueComplexity = "PP" | "P" | "M" | "G" | "GG";

export type QaRejectionEvent = {
  fromStatus: string;
  toStatus: string;
  changedAt: string;
};

export type DashboardIssue = {
  id: string;
  key: string;
  title: string;
  issueType: {
    name: string;
    iconUrl?: string;
  };
  complexity?: IssueComplexity;
  epic?: {
    key?: string;
    name?: string;
    color?: string;
  };
  assignee: {
    name: string;
    avatarUrl?: string;
  };
  priority: IssuePriority;
  jiraStatus: string;
  /** Stable id — use this for comparisons, never the translated name. */
  jiraStatusId: string;
  businessStatus: BusinessStatus;
  isHotfix: boolean;
  isAiDev: boolean;
  track: IssueTrack;
  /**
   * Approvals the current checkpoint asked for and that are still missing.
   * Empty while the card sits in the gate means the ball is with the AI.
   */
  /** Jira status that the dashboard does not know how to place. */
  isUnknownStatus: boolean;
  qaRejectionCount: number;
  qaRejections: QaRejectionEvent[];
  createdAt: string;
  updatedAt: string;
  dueDate?: string;
  statusChangedAt: string;
  url?: string;
};

export type DashboardScope = {
  id: number | string;
  name: string;
};

export type DashboardPayload = {
  scope: DashboardScope;
  issues: DashboardIssue[];
  source: "jira";
  fetchedAt: string;
};

export type DashboardFilters = {
  query: string;
  hotfixOnly: boolean;
  aiDevOnly: boolean;
  assignee: string;
  priority: string;
  track: IssueTrack | "all";
};
