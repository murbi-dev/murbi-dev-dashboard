export type JiraSprint = {
  id: number;
  name: string;
  state: "active" | "closed" | "future";
  startDate?: string;
  endDate?: string;
  completeDate?: string;
};

export type JiraConfig = {
  baseUrl: string;
  email: string;
  apiToken: string;
  boardId: string;
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
    duedate?: string | null;
    status: {
      id: string;
      name: string;
    };
    issuetype: {
      name: string;
      iconUrl?: string;
      hierarchyLevel?: number;
      subtask?: boolean;
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

export type JiraDashboardFieldMetadata = {
  complexityFieldId?: string;
  devFlowFieldId?: string;
  /** "Divisão" — lives on the epic, not on the card. */
  divisionFieldId?: string;
  /** "Aprovação Pendente" — multiselect, so it arrives as an array. */
  pendingApprovalFieldId?: string;
  epicLinkFieldId?: string;
  epicNameFieldId?: string;
  issueColorFieldId?: string;
  sprintFieldId?: string;
};

export type JiraEpicDetailsByKey = Record<string, { name?: string; color?: string; division?: string }>;

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
