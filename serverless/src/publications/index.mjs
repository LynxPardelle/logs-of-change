import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { DynamoPublicationsRepository } from './repository.mjs';
import { createPublicationsService } from './domain.mjs';
import { createPublicationsHandler } from './http.mjs';
import { createEvidenceReader } from './evidence.mjs';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}), { marshallOptions: { removeUndefinedValues: true } });
const repository = new DynamoPublicationsRepository(client, { accessTable: process.env.ACCESS_TABLE_NAME, adminTable: process.env.ADMIN_TABLE_NAME, publicTable: process.env.PUBLIC_TABLE_NAME });
export const handler = createPublicationsHandler(createPublicationsService(repository, { evidence: createEvidenceReader({ evidenceOrigin: process.env.EVIDENCE_API_ENDPOINT }) }));
