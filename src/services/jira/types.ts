export type JiraSprint = {
  id: number;
  name: string;
  state: "active" | "closed" | "future";
  startDate?: string;
  endDate?: string;
  completeDate?: string;
};

export type JiraBoard = {
  id: number;
  name: string;
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
    issuetype: {
      name: string;
      iconUrl?: string;
    };
    priority?: {
      name: string;
    };
    parent?: {
      key: string;
      fields?: {
        summary?: string;
        issuetype?: {
          name: string;
          hierarchyLevel?: number;
        };
      };
    };
    assignee?: {
      displayName: string;
      avatarUrls?: Record<string, string>;
    };
    statuscategorychangedate?: string;
    [fieldId: string]: unknown;
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

export type JiraField = {
  id: string;
  name: string;
  schema?: {
    type?: string;
    custom?: string;
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
