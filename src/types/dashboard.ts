export type BusinessStatus =
  | "Waiting"
  | "In Development"
  | "Validation"
  | "Finalizing"
  | "Done";

export type IssuePriority = "Highest" | "High" | "Medium" | "Low" | "Lowest" | "Unknown";

export type DashboardIssue = {
  id: string;
  key: string;
  title: string;
  assignee: {
    name: string;
    avatarUrl?: string;
  };
  priority: IssuePriority;
  jiraStatus: string;
  businessStatus: BusinessStatus;
  isHotfix: boolean;
  createdAt: string;
  updatedAt: string;
  statusChangedAt: string;
  url?: string;
};

export type SprintSummary = {
  id: number | string;
  name: string;
  startedAt?: string;
  endedAt?: string;
};

export type DashboardPayload = {
  sprint: SprintSummary;
  issues: DashboardIssue[];
  source: "jira" | "mock";
  fetchedAt: string;
  warning?: string;
};

export type DashboardFilters = {
  query: string;
  hotfixOnly: boolean;
  assignee: string;
  priority: string;
};
