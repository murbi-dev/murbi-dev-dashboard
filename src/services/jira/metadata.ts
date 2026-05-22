import { getJiraDashboardFieldMetadata } from "@/services/jira/field-metadata";
import { JiraClient } from "@/services/jira/client";
import type { JiraField } from "./types";

export type CachedJiraFieldMetadata = ReturnType<typeof getJiraDashboardFieldMetadata>;

const fieldMetadataCache = new Map<string, Promise<CachedJiraFieldMetadata>>();

export function getCachedFieldMetadata(client: JiraClient, boardId: string): Promise<CachedJiraFieldMetadata> {
  const cached = fieldMetadataCache.get(boardId);

  if (cached) {
    return cached;
  }

  const metadataPromise = client
    .get<JiraField[]>(`/rest/api/3/field`)
    .then((fields) => getJiraDashboardFieldMetadata(fields));

  fieldMetadataCache.set(boardId, metadataPromise);

  return metadataPromise;
}
