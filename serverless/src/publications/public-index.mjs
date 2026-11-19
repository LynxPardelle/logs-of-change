import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { DynamoPublicationsReader } from './repository.mjs';
import { createPublicReader } from './domain.mjs';
import { createPublicHandler } from './http.mjs';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
export const handler = createPublicHandler(createPublicReader(new DynamoPublicationsReader(client, { publicTable: process.env.PUBLIC_TABLE_NAME })));
