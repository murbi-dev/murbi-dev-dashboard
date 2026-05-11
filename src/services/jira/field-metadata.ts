import type { JiraBoardConfiguration, JiraField } from "./types";

export type JiraDashboardFieldMetadata = {
  storyPointsFieldId?: string;
  epicLinkFieldId?: string;
  epicNameFieldId?: string;
  issueColorFieldId?: string;
  sprintFieldId?: string;
};

const epicLinkFieldNames = new Set(["epic link"]);
const epicNameFieldNames = new Set(["epic name"]);
const issueColorFieldNames = new Set(["issue color"]);
const sprintFieldNames = new Set(["sprint"]);
const epicLinkFieldCustomTypes = new Set(["com.pyxis.greenhopper.jira:gh-epic-link"]);
const epicNameFieldCustomTypes = new Set(["com.pyxis.greenhopper.jira:gh-epic-label"]);
const issueColorFieldCustomTypes = new Set(["com.pyxis.greenhopper.jira:jsw-issue-color"]);
const sprintFieldCustomTypes = new Set(["com.pyxis.greenhopper.jira:gh-sprint"]);

function normalizeFieldName(name: string): string {
  return name.trim().toLowerCase();
}

export function getJiraDashboardFieldMetadata(
  fields: JiraField[],
  boardConfiguration?: JiraBoardConfiguration
): JiraDashboardFieldMetadata {
  const storyPointsFieldId = boardConfiguration?.estimation?.field?.fieldId;

  const epicLinkFieldId = fields.find(
    (field) =>
      epicLinkFieldNames.has(normalizeFieldName(field.name)) ||
      (field.schema?.custom ? epicLinkFieldCustomTypes.has(field.schema.custom) : false)
  )?.id;
  const epicNameFieldId = fields.find(
    (field) =>
      epicNameFieldNames.has(normalizeFieldName(field.name)) ||
      (field.schema?.custom ? epicNameFieldCustomTypes.has(field.schema.custom) : false)
  )?.id;
  const issueColorFieldId = fields.find(
    (field) =>
      issueColorFieldNames.has(normalizeFieldName(field.name)) ||
      (field.schema?.custom ? issueColorFieldCustomTypes.has(field.schema.custom) : false)
  )?.id;
  const sprintFieldId = fields.find(
    (field) =>
      sprintFieldNames.has(normalizeFieldName(field.name)) ||
      (field.schema?.custom ? sprintFieldCustomTypes.has(field.schema.custom) : false)
  )?.id;

  return {
    storyPointsFieldId,
    epicLinkFieldId,
    epicNameFieldId,
    issueColorFieldId,
    sprintFieldId
  };
}
