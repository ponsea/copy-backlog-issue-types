export interface CustomField {
  "id": number;
  "version": number;
  "typeId": number;
  "name": string;
  "description": string;
  "required": boolean;
  "useIssueType": boolean;
  "applicableIssueTypes": number[];
  "displayOrder": number;
  [key: string]: any; // Other fields are different for each typeId
}