import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { createIntegrationManagementHandler } from './integrations.mjs';
import { integrationKeyRepository } from './key-repository.mjs';

const json = (statusCode, data) => ({ statusCode, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }, body: JSON.stringify(data) });

export function createIdentityHandler(repository) {
  const manage = createIntegrationManagementHandler(repository);
  return async (event) => {
    if (event.rawPath?.startsWith('/api/v1/identity/orgs/')) return manage(event);
    const sub = event.requestContext?.authorizer?.jwt?.claims?.sub;
    if (!sub) return json(401, { error: { code: 'UNAUTHENTICATED', message: 'Inicia sesión.' } });
    try {
      const memberships = [];
      for (const candidate of await repository.findMemberships(sub)) {
        const member = await repository.getMembership(candidate.orgId, sub);
        if (member?.active !== true) continue;
        const projects = [];
        for (const project of await repository.listProjects(candidate.orgId)) {
          if (project.active !== true) continue;
          const permission = await repository.getPermission(candidate.orgId, project.projectId, sub);
          if (permission?.active === true && ['administrator', 'editor', 'reviewer'].includes(permission.role)) {
            projects.push({ projectId: project.projectId, name: project.name || project.projectId, role: permission.role });
          }
        }
        memberships.push({ orgId: candidate.orgId, orgName: member.orgName || candidate.orgId, projects });
      }
      return json(200, { sub, memberships });
    } catch {
      return json(503, { error: { code: 'IDENTITY_UNAVAILABLE', message: 'No se pudo consultar el acceso. Intenta nuevamente.' } });
    }
  };
}

export function dynamoIdentityRepository(client, table) {
  const get = async (PK, SK) => (await client.send(new GetCommand({ TableName: table, Key: { PK, SK }, ConsistentRead: true }))).Item;
  const queryAll = async (parameters) => {
    const items = [];
    let cursor;
    do {
      const result = await client.send(new QueryCommand({ TableName: table, ...parameters, ExclusiveStartKey: cursor }));
      items.push(...(result.Items || []));
      cursor = result.LastEvaluatedKey;
    } while (cursor);
    return items;
  };
  return {
    ...integrationKeyRepository(client, table),
    findMemberships: (sub) => queryAll({ IndexName: 'ActorIndex', KeyConditionExpression: 'actor = :actor', ExpressionAttributeValues: { ':actor': sub } }),
    getMembership: (org, sub) => get(`TENANT#${org}`, `MEMBER#${sub}`),
    listProjects: (org) => queryAll({ ConsistentRead: true, KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)', ExpressionAttributeValues: { ':pk': `TENANT#${org}`, ':prefix': 'PROJECT#' } }),
    getPermission: (org, project, sub) => get(`TENANT#${org}#PROJECT#${project}`, `PERMISSION#${sub}`),
  };
}

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
export const handler = createIdentityHandler(dynamoIdentityRepository(client, process.env.ACCESS_TABLE_NAME));
