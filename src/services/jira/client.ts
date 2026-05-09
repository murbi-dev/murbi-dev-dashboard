import type { JiraConfig } from "@/services/jira/config";

export class JiraApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number
  ) {
    super(message);
  }
}

export class JiraClient {
  private readonly authHeader: string;

  constructor(private readonly config: JiraConfig) {
    this.authHeader = `Basic ${Buffer.from(`${config.email}:${config.apiToken}`).toString("base64")}`;
  }

  async get<T>(path: string): Promise<T> {
    const response = await fetch(`${this.config.baseUrl}${path}`, {
      headers: {
        Accept: "application/json",
        Authorization: this.authHeader
      },
      next: { revalidate: 0 }
    });

    if (!response.ok) {
      console.error(`Jira API request failed:`, await response.text());
      throw new JiraApiError(`Jira request failed with ${response.status}`, response.status);
    }

    return response.json() as Promise<T>;
  }
}
