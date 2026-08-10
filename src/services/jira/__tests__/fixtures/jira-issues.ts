import type { JiraIssue } from "@/types/jira";

export function jiraIssueFixture(overrides: Partial<JiraIssue> = {}): JiraIssue {
  const baseIssue: JiraIssue = {
    id: "10001",
    key: "MURBI-571",
    fields: {
      summary: "Relatório de auditoria de alocações",
      created: "2026-05-04T16:10:09.016-0300",
      updated: "2026-06-02T17:18:18.489-0300",
      duedate: "2026-06-10",
      status: { id: "3", name: "Em andamento" },
      issuetype: {
        name: "Story",
        iconUrl: "https://example.com/story.svg"
      },
      priority: {
        name: "HOTFIX"
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
          items: [{ field: "status", from: "10011", fromString: "To Do", to: "3", toString: "In Progress" }]
        },
        {
          created: "2026-06-02T15:11:03.156-0300",
          items: [{ field: "status", from: "10158", fromString: "Teste QA", to: "10011", toString: "To Do" }]
        },
        {
          created: "2026-05-28T21:27:21.213-0300",
          items: [{ field: "status", from: "10091", fromString: "Pronto para QA", to: "10158", toString: "Teste QA" }]
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
