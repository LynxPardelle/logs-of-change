import { GetCommand, QueryCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { ApiError } from '../releases/domain.mjs';
import { plusCondition } from '../integrations/access.mjs';

const projectKey = (org, project) => `TENANT#${org}#PROJECT#${project}`;

export function integrationKeyRepository(client, table) {
  const get = async (PK, SK) => (await client.send(new GetCommand({ TableName: table, Key: { PK, SK }, ConsistentRead: true }))).Item;
  async function transact(context, writes, nowEpoch, creating) {
    const { orgId, projectId, sub } = context;
    const conditions = [
      { Key: { PK: `TENANT#${orgId}`, SK: `MEMBER#${sub}` }, ConditionExpression: '#active = :active', ExpressionAttributeNames: { '#active': 'active' }, ExpressionAttributeValues: { ':active': true } },
      { Key: { PK: `TENANT#${orgId}`, SK: `PROJECT#${projectId}` }, ConditionExpression: '#active = :active' + (creating ? ' AND (attribute_not_exists(#frozen) OR #frozen = :open)' : ''), ExpressionAttributeNames: { '#active': 'active', ...(creating ? { '#frozen': 'writesFrozen' } : {}) }, ExpressionAttributeValues: { ':active': true, ...(creating ? { ':open': false } : {}) } },
      { Key: { PK: projectKey(orgId, projectId), SK: `PERMISSION#${sub}` }, ConditionExpression: '#active = :active AND #role = :administrator', ExpressionAttributeNames: { '#active': 'active', '#role': 'role' }, ExpressionAttributeValues: { ':active': true, ':administrator': 'administrator' } },
      ...(creating ? [{ Key: { PK: `TENANT#${orgId}`, SK: 'PRODUCT' }, ...plusCondition(nowEpoch) }] : []),
    ].map(condition => ({ ConditionCheck: { TableName: table, ...condition } }));
    try { await client.send(new TransactWriteCommand({ TransactItems: [...conditions, ...writes] })); }
    catch (error) {
      if (error.name === 'TransactionCanceledException') {
        if (error.CancellationReasons?.slice(0, conditions.length).some(reason => reason.Code === 'ConditionalCheckFailed')) throw new ApiError(403, 'FORBIDDEN', 'El permiso o plan cambió.');
        if (error.CancellationReasons?.some(reason => ['ConditionalCheckFailed', 'TransactionConflict'].includes(reason.Code))) throw new ApiError(409, 'CONFLICT', 'Hay otra operación en curso.');
      }
      if (['TransactionConflictException', 'ConditionalCheckFailedException'].includes(error.name)) throw new ApiError(409, 'CONFLICT', 'Hay otra operación en curso.');
      throw error;
    }
  }
  const receiptWrite = (context, receipt) => ({ Put: { TableName: table, Item: { PK: projectKey(context.orgId, context.projectId), SK: `KEYREQUEST#${receipt.key}`, data: receipt }, ConditionExpression: 'attribute_not_exists(PK)' } });
  return {
    async getAccess(org, project, sub) {
      const [membership, projectRow, permission, plan] = await Promise.all([
        get(`TENANT#${org}`, `MEMBER#${sub}`), get(`TENANT#${org}`, `PROJECT#${project}`), get(projectKey(org, project), `PERMISSION#${sub}`), get(`TENANT#${org}`, 'PRODUCT'),
      ]);
      return { membership, project: projectRow, permission, plan };
    },
    getIntegrationKey: (org, project, id) => get(projectKey(org, project), `INTEGRATION#${id}`),
    async getKeyRequest(org, project, key) { return (await get(projectKey(org, project), `KEYREQUEST#${key}`))?.data; },
    async listIntegrationKeys(org, project) {
      const items = []; let cursor;
      do {
        const result = await client.send(new QueryCommand({ TableName: table, KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)', ExpressionAttributeValues: { ':pk': projectKey(org, project), ':prefix': 'INTEGRATION#' }, ConsistentRead: true, ...(cursor ? { ExclusiveStartKey: cursor } : {}) }));
        items.push(...(result.Items || [])); cursor = result.LastEvaluatedKey;
      } while (cursor);
      return items;
    },
    createIntegrationKey: (context, row, receipt, nowEpoch) => transact(context, [
      { Put: { TableName: table, Item: { PK: projectKey(context.orgId, context.projectId), SK: `INTEGRATION#${row.id}`, ...row }, ConditionExpression: 'attribute_not_exists(PK)' } }, receiptWrite(context, receipt),
    ], nowEpoch, true),
    revokeIntegrationKey: (context, id, receipt, nowEpoch) => transact(context, [
      { Update: { TableName: table, Key: { PK: projectKey(context.orgId, context.projectId), SK: `INTEGRATION#${id}` }, UpdateExpression: 'SET #active = :inactive', ConditionExpression: 'attribute_exists(PK) AND #id = :id', ExpressionAttributeNames: { '#active': 'active', '#id': 'id' }, ExpressionAttributeValues: { ':inactive': false, ':id': id } } }, receiptWrite(context, receipt),
    ], nowEpoch, false),
  };
}
