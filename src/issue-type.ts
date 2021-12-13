export interface IssueType {
  id: number;
  projectId: number;
  name: string;
  color: string;
  displayOrder: number;
  templateSummary: null | string;
  templateDescription: null | string;
}