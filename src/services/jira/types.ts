export type JiraSprint = {
  id: number;
  name: string;
  state: "active" | "closed" | "future";
  startDate?: string;
  endDate?: string;
};

export type JiraIssue = {
  id: string;
  key: string;
  fields: {
    summary: string;
    created: string;
    updated: string;
    status: {
      name: string;
    };
    priority?: {
      name: string;
    };
    assignee?: {
      displayName: string;
      avatarUrls?: Record<string, string>;
    };
    statuscategorychangedate?: string;
  };
  changelog?: {
    histories: Array<{
      created: string;
      items: Array<{
        field: string;
        from?: string | null;
        fromString?: string | null;
        to?: string | null;
        toString?: string | null;
      }>;
    }>;
  };
};

export type JiraSearchResponse = {
  startAt: number;
  maxResults: number;
  total: number;
  isLast?: boolean;
  issues: JiraIssue[];
};

export type JiraSprintResponse = {
  values: JiraSprint[];
};
