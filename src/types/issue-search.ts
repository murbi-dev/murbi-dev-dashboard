export type IssueSearchResult = {
  id: string;
  key: string;
  title: string;
  jiraStatus: string;
  assignee: {
    name: string;
    avatarUrl?: string;
  };
  isHotfix: boolean;
  updatedAt: string;
  url?: string;
};

export type IssueSearchPayload = {
  query: string;
  results: IssueSearchResult[];
  source: "jira";
  fetchedAt: string;
};
