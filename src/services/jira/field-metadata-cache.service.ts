import {
  jiraFieldMetadataMapper,
  JiraFieldMetadataMapper
} from "@/lib/jira/jira-field-metadata.mapper";
import { JiraClient } from "@/clients/jira/jira.client";
import type { JiraDashboardFieldMetadata, JiraField } from "@/types/jira";

export class JiraFieldMetadataCacheService {
  private readonly fieldMetadataCache = new Map<string, Promise<JiraDashboardFieldMetadata>>();

  constructor(private readonly fieldMetadataMapper: JiraFieldMetadataMapper = jiraFieldMetadataMapper) {}

  getCachedFieldMetadata(client: JiraClient, boardId: string): Promise<JiraDashboardFieldMetadata> {
    const cached = this.fieldMetadataCache.get(boardId);

    if (cached) {
      return cached;
    }

    const metadataPromise = client
      .get<JiraField[]>(`/rest/api/3/field`)
      .then((fields) => this.fieldMetadataMapper.getDashboardFieldMetadata(fields));

    this.fieldMetadataCache.set(boardId, metadataPromise);

    return metadataPromise;
  }
}

export const jiraFieldMetadataCacheService = new JiraFieldMetadataCacheService();
