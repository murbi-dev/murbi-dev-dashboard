import { getJiraDashboardFieldMetadata } from "@/services/jira/field-metadata";
import { JiraClient } from "@/services/jira/client";
import type { JiraBoardConfiguration, JiraField } from "./types";

export type CachedJiraFieldMetadata = ReturnType<typeof getJiraDashboardFieldMetadata>;

const fieldMetadataCache = new Map<string, Promise<CachedJiraFieldMetadata>>();

export function getCachedFieldMetadata(client: JiraClient, boardId: string): Promise<CachedJiraFieldMetadata> {
  const cached = fieldMetadataCache.get(boardId);

  if (cached) {
    return cached;
  }

  const metadataPromise = Promise.all([
    client.get<JiraBoardConfiguration>(`/rest/agile/1.0/board/${boardId}/configuration`),
    client.get<JiraField[]>(`/rest/api/3/field`)
  ]).then(([boardConfiguration, fields]) => getJiraDashboardFieldMetadata(fields, boardConfiguration));

  fieldMetadataCache.set(boardId, metadataPromise);

  return metadataPromise;
}
