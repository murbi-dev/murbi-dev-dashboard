export type BusinessStatus =
  | "Waiting"
  | "In Development"
  | "Validation"
  | "Finalizing"
  | "Done";

export type IssuePriority = "Highest" | "High" | "Medium" | "Low" | "Lowest" | "Unknown";
export type IssueComplexity = "PP" | "P" | "M" | "G" | "GG";

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
  businessStatus: BusinessStatus;
  isHotfix: boolean;
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
