export type JiraConfig = {
  baseUrl: string;
  email: string;
  apiToken: string;
  boardId: string;
};

export function getJiraConfig(): JiraConfig | null {
  const { JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN, JIRA_BOARD_ID } = process.env;

  if (!JIRA_BASE_URL || !JIRA_EMAIL || !JIRA_API_TOKEN || !JIRA_BOARD_ID) {
    return null;
  }

  return {
    baseUrl: JIRA_BASE_URL.replace(/\/$/, ""),
    email: JIRA_EMAIL,
    apiToken: JIRA_API_TOKEN,
    boardId: JIRA_BOARD_ID
  };
}
