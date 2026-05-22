import type { JiraField } from "./types";

export type JiraDashboardFieldMetadata = {
  complexityFieldId?: string;
  epicLinkFieldId?: string;
  epicNameFieldId?: string;
  issueColorFieldId?: string;
  sprintFieldId?: string;
};

const complexityFieldNames = new Set(["complexidade"]);
const epicLinkFieldNames = new Set(["epic link"]);
const epicNameFieldNames = new Set(["epic name"]);
const issueColorFieldNames = new Set(["issue color"]);
const sprintFieldNames = new Set(["sprint"]);
const epicLinkFieldCustomTypes = new Set(["com.pyxis.greenhopper.jira:gh-epic-link"]);
const epicNameFieldCustomTypes = new Set(["com.pyxis.greenhopper.jira:gh-epic-label"]);
const issueColorFieldCustomTypes = new Set(["com.pyxis.greenhopper.jira:jsw-issue-color"]);
const sprintFieldCustomTypes = new Set(["com.pyxis.greenhopper.jira:gh-sprint"]);

function normalizeFieldName(name: string): string {
  return name.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function getJiraDashboardFieldMetadata(fields: JiraField[]): JiraDashboardFieldMetadata {
  const complexityFieldId = fields.find((field) =>
    complexityFieldNames.has(normalizeFieldName(field.name))
  )?.id;

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
    complexityFieldId,
    epicLinkFieldId,
    epicNameFieldId,
    issueColorFieldId,
    sprintFieldId
  };
}
