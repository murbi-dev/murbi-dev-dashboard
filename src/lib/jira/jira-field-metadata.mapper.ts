import type { JiraDashboardFieldMetadata, JiraField } from "@/types/jira";

export class JiraFieldMetadataMapper {
  private static readonly complexityFieldNames = new Set(["complexidade"]);
  private static readonly epicLinkFieldNames = new Set(["epic link"]);
  private static readonly epicNameFieldNames = new Set(["epic name"]);
  private static readonly issueColorFieldNames = new Set(["issue color"]);
  private static readonly sprintFieldNames = new Set(["sprint"]);
  private static readonly epicLinkFieldCustomTypes = new Set(["com.pyxis.greenhopper.jira:gh-epic-link"]);
  private static readonly epicNameFieldCustomTypes = new Set(["com.pyxis.greenhopper.jira:gh-epic-label"]);
  private static readonly issueColorFieldCustomTypes = new Set(["com.pyxis.greenhopper.jira:jsw-issue-color"]);
  private static readonly sprintFieldCustomTypes = new Set(["com.pyxis.greenhopper.jira:gh-sprint"]);

  getDashboardFieldMetadata(fields: JiraField[]): JiraDashboardFieldMetadata {
    const complexityFieldId = fields.find((field) =>
      JiraFieldMetadataMapper.complexityFieldNames.has(this.normalizeFieldName(field.name))
    )?.id;

    const epicLinkFieldId = fields.find(
      (field) =>
        JiraFieldMetadataMapper.epicLinkFieldNames.has(this.normalizeFieldName(field.name)) ||
        (field.schema?.custom ? JiraFieldMetadataMapper.epicLinkFieldCustomTypes.has(field.schema.custom) : false)
    )?.id;
    const epicNameFieldId = fields.find(
      (field) =>
        JiraFieldMetadataMapper.epicNameFieldNames.has(this.normalizeFieldName(field.name)) ||
        (field.schema?.custom ? JiraFieldMetadataMapper.epicNameFieldCustomTypes.has(field.schema.custom) : false)
    )?.id;
    const issueColorFieldId = fields.find(
      (field) =>
        JiraFieldMetadataMapper.issueColorFieldNames.has(this.normalizeFieldName(field.name)) ||
        (field.schema?.custom ? JiraFieldMetadataMapper.issueColorFieldCustomTypes.has(field.schema.custom) : false)
    )?.id;
    const sprintFieldId = fields.find(
      (field) =>
        JiraFieldMetadataMapper.sprintFieldNames.has(this.normalizeFieldName(field.name)) ||
        (field.schema?.custom ? JiraFieldMetadataMapper.sprintFieldCustomTypes.has(field.schema.custom) : false)
    )?.id;

    return {
      complexityFieldId,
      epicLinkFieldId,
      epicNameFieldId,
      issueColorFieldId,
      sprintFieldId
    };
  }

  private normalizeFieldName(name: string): string {
    return name.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }
}

export const jiraFieldMetadataMapper = new JiraFieldMetadataMapper();
