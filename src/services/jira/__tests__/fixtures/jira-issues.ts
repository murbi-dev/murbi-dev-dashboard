import type { JiraIssue } from "@/types/jira";

export function jiraIssueFixture(overrides: Partial<JiraIssue> = {}): JiraIssue {
  const baseIssue: JiraIssue = {
    id: "10001",
    key: "MURBI-571",
    fields: {
      summary: "[HOTFIX] Relatório de auditoria de alocações",
      created: "2026-05-04T16:10:09.016-0300",
      updated: "2026-06-02T17:18:18.489-0300",
      duedate: "2026-06-10",
      status: {
        name: "Em andamento"
      },
      issuetype: {
        name: "Story",
        iconUrl: "https://example.com/story.svg"
      },
      priority: {
        name: "High"
      },
      assignee: {
        displayName: "Henrique Mayrlon da Silva Lourenço",
        avatarUrls: {
          "48x48": "https://example.com/avatar.png"
        }
      },
      statuscategorychangedate: "2026-06-02T17:18:18.489-0300",
      customfield_10345: {
        value: "M",
        id: "10165"
      }
    },
    changelog: {
      histories: [
        {
          created: "2026-06-02T17:18:18.489-0300",
          items: [{ field: "status", fromString: "To Do", toString: "In Progress" }]
        },
        {
          created: "2026-06-02T15:11:03.156-0300",
          items: [{ field: "status", fromString: "Teste QA", toString: "To Do" }]
        },
        {
          created: "2026-05-28T21:27:21.213-0300",
          items: [{ field: "status", fromString: "Pronto para QA", toString: "Teste QA" }]
        }
      ]
    }
  };

  return {
    ...baseIssue,
    ...overrides,
    fields: {
      ...baseIssue.fields,
      ...overrides.fields
    },
    changelog: overrides.changelog ?? baseIssue.changelog
  };
}
