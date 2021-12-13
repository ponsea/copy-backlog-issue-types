import dotenv from 'dotenv';
import fetch from 'node-fetch';
import {IssueType} from "./issue-type";
import {CustomField} from "./custom-field";

dotenv.config(); // Load .env file to process.env

const spaceUrl = process.env.BACKLOG_SPACE_URL!;
const apiKey = process.env.BACKLOG_API_KEY!;
const sourceProjectKey = process.env.BACKLOG_SOURCE_PROJECT_KEY!;
const destinationProjectKey = process.env.BACKLOG_DESTINATION_PROJECT_KEY!;

console.log('Copying Issue Types...');

const originalIssueTypes = await getAllIssueTypes(sourceProjectKey);
const copiedIssueTypes = await Promise.all(
  originalIssueTypes.map((original) =>
    addIssueType(destinationProjectKey, {
      name: original.name,
      color: original.color,
      templateSummary: original.templateSummary ?? undefined,
      templateDescription: original.templateDescription ?? undefined
    })
  )
);

copiedIssueTypes.forEach(issueType => console.log('    Issue Type name: ' + issueType.name));
console.log(copiedIssueTypes.length + ' Issue Types were copied!');

console.log('Copying Custom Fields...');

const originalCustomFields = await getAllCustomFields(sourceProjectKey);
const originalIssueTypeIdToCopiedIssueTypeIdMap = new Map(
  originalIssueTypes.map((original, i) => [original.id, copiedIssueTypes[i].id])
);
const copiedCustomFields = await Promise.all(
  originalCustomFields.map(original => {
    const applicableIssueTypesUpdated = {
      ...original,
      applicableIssueTypes: original.applicableIssueTypes.map(originalApplicableIssueTypeId =>
        originalIssueTypeIdToCopiedIssueTypeIdMap.get(originalApplicableIssueTypeId)!
      )
    };
    return addCustomField(destinationProjectKey, convertCustomFieldToCreationParams(applicableIssueTypesUpdated) as any);
  })
);

copiedCustomFields.forEach(customField => console.log('    Custom Field name: ' + customField.name));
console.log(copiedCustomFields.length + ' Custom Fields were copied!');

console.log('Done.');

async function addCustomField(
  projectKey: string,
  customFieldParams: {
    typeId: number,
    name: string,
    applicableIssueTypes?: number[],
    description?: string,
    required?: boolean,
    [key: string]: any; // other fields are different for each typeId
  }
): Promise<CustomField> {
  const response = await fetch(`${spaceUrl}/api/v2/projects/${projectKey}/customFields?apiKey=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(customFieldParams)
  });
  if (response.ok) {
    return await response.json() as CustomField;
  } else {
    throw new Error(JSON.stringify(await response.json()));
  }
}

async function addIssueType(
  projectKey: string,
  issueTypeParams: {
    name: string,
    color: string,
    templateSummary?: string,
    templateDescription?: string }
): Promise<IssueType> {
  const response = await fetch(`${spaceUrl}/api/v2/projects/${projectKey}/issueTypes?apiKey=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(issueTypeParams)
  });
  if (response.ok) {
    return await response.json() as IssueType;
  } else {
    throw new Error(JSON.stringify(await response.json()));
  }
}

async function getAllCustomFields(projectKey: string): Promise<CustomField[]> {
  const response = await fetch(`${spaceUrl}/api/v2/projects/${projectKey}/customFields?apiKey=${apiKey}`);
  if (response.ok) {
    return await response.json() as CustomField[];
  } else {
    throw new Error(JSON.stringify(await response.json()));
  }
}

async function getAllIssueTypes(projectKey: string): Promise<IssueType[]> {
  const response = await fetch(`${spaceUrl}/api/v2/projects/${projectKey}/issueTypes?apiKey=${apiKey}`);
  if (response.ok) {
    return await response.json() as IssueType[];
  } else {
    throw new Error(JSON.stringify(await response.json()));
  }
}

function convertCustomFieldToCreationParams(customField: CustomField): object {
  const commonAttributes = {
    typeId: customField.typeId,
    name: customField.name,
    applicableIssueTypes: customField.applicableIssueTypes ?? [],
    description: customField.description,
    required: customField.required
  };

  // Custom Field Types
  // 1: Text
  // 2: Sentence
  // 3: Number
  // 4: Date
  // 5: Single list
  // 6: Multiple list
  // 7: Checkbox
  // 8: Radio
  if ([5, 6, 7, 8].includes(customField.typeId)) {
    return {
      ...commonAttributes,
      allowAddItem: customField['allowAddItem'],
      allowInput: customField['allowInput'],
      items: (customField['items'] ?? []).map((item: any) => item.name)
    };
  } else if (customField.typeId === 4) {
    return {
      ...commonAttributes,
      min: customField['min'],
      max:	customField['max'],
      initialValueType:	customField['initialValueType'],
      initialDate: customField['initialDate'],
      initialShift: customField['initialShift']
    };
  } else if (customField.typeId === 3) {
    return {
      ...commonAttributes,
      min: customField['min'],
      max: customField['max'],
      initialValue: customField['initialValue'],
      unit: customField['unit']
    };
  } else {
    return commonAttributes;
  }
}
