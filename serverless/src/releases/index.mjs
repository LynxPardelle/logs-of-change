import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { DynamoReleasesRepository } from './repository.mjs';
import { createReleasesService } from './domain.mjs';
import { createReleasesHandler, createIngestionHandler } from './http.mjs';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}), { marshallOptions: { removeUndefinedValues: true } });
const repository = new DynamoReleasesRepository(client, { accessTable: process.env.ACCESS_TABLE_NAME, releasesTable: process.env.RELEASES_TABLE_NAME });
const service = createReleasesService(repository);
const releases = createReleasesHandler(service);
const ingestions = createIngestionHandler(service);
export const handler = event => event.rawPath?.startsWith('/api/v1/ingestions/') ? ingestions(event) : releases(event);
