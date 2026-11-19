import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { DynamoReleasesRepository } from './repository.mjs';
import { createReleasesService } from './domain.mjs';
import { createReleasesHandler } from './http.mjs';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}), { marshallOptions: { removeUndefinedValues: true } });
const repository = new DynamoReleasesRepository(client, { accessTable: process.env.ACCESS_TABLE_NAME, releasesTable: process.env.RELEASES_TABLE_NAME });
export const handler = createReleasesHandler(createReleasesService(repository));
