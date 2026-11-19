import { GetCommand, QueryCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { ApiError } from './domain.mjs';
import { plusCondition } from '../integrations/access.mjs';

const projectKey = (orgId, projectId) => `TENANT#${orgId}#PROJECT#${projectId}`;
const revisionKey = (orgId, projectId, releaseId) => `${projectKey(orgId, projectId)}#RELEASE#${releaseId}`;
const numberKey = (number) => String(number).padStart(10, '0');

export class DynamoReleasesRepository {
  constructor(client, { accessTable, releasesTable }) { this.client = client; this.accessTable = accessTable; this.releasesTable = releasesTable; }

  async get(table, key) { return (await this.client.send(new GetCommand({ TableName: table, Key: key, ConsistentRead: true }))).Item; }

  async getAccess(orgId, projectId, sub) {
    const [membership, project, permission] = await Promise.all([
      this.get(this.accessTable, { PK: `TENANT#${orgId}`, SK: `MEMBER#${sub}` }),
      this.get(this.accessTable, { PK: `TENANT#${orgId}`, SK: `PROJECT#${projectId}` }),
      this.get(this.accessTable, { PK: projectKey(orgId, projectId), SK: `PERMISSION#${sub}` }),
    ]);
    return { membership, project, permission };
  }

  async getIntegrationAccess(orgId, projectId, keyId) {
    const [project, integrationKey, plan] = await Promise.all([
      this.get(this.accessTable, { PK: `TENANT#${orgId}`, SK: `PROJECT#${projectId}` }),
      this.get(this.accessTable, { PK: projectKey(orgId, projectId), SK: `INTEGRATION#${keyId}` }),
      this.get(this.accessTable, { PK: `TENANT#${orgId}`, SK: 'PRODUCT' }),
    ]);
    return { project, integrationKey, plan };
  }

  async getRelease(orgId, projectId, id) { return (await this.get(this.releasesTable, { PK: projectKey(orgId, projectId), SK: `RELEASE#${id}` }))?.data; }
  async getReceipt(orgId, projectId, key) { return (await this.get(this.releasesTable, { PK: projectKey(orgId, projectId), SK: `IDEMP#${key}` }))?.data; }
  async getRevision(orgId, projectId, id, number) { return (await this.get(this.releasesTable, { PK: revisionKey(orgId, projectId, id), SK: `REV#${numberKey(number)}` }))?.data; }
  async getDecision(orgId, projectId, id, number) { return (await this.get(this.releasesTable, { PK: revisionKey(orgId, projectId, id), SK: `DECISION#${numberKey(number)}` }))?.data; }

  async list(orgId, projectId, cursor, limit) {
    const PK = projectKey(orgId, projectId);
    if (cursor && (cursor.PK !== PK || typeof cursor.SK !== 'string' || !cursor.SK.startsWith('RELEASE#') || Object.keys(cursor).some((key) => !['PK', 'SK'].includes(key)))) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'El cursor no corresponde a este proyecto.');
    }
    const result = await this.client.send(new QueryCommand({ TableName: this.releasesTable, KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
      ExpressionAttributeValues: { ':pk': PK, ':prefix': 'RELEASE#' }, Limit: limit, ConsistentRead: true, ...(cursor ? { ExclusiveStartKey: cursor } : {}) }));
    return { releases: (result.Items ?? []).map((item) => item.data), nextCursor: result.LastEvaluatedKey ?? null };
  }

  async getHistory(orgId, projectId, releaseId) {
    const revisions = [], decisions = [];
    let cursor;
    do {
      const result = await this.client.send(new QueryCommand({ TableName: this.releasesTable, KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: { ':pk': revisionKey(orgId, projectId, releaseId) }, ConsistentRead: true, ...(cursor ? { ExclusiveStartKey: cursor } : {}) }));
      for (const item of result.Items ?? []) {
        if (item.SK.startsWith('REV#')) revisions.push(item.data);
        if (item.SK.startsWith('DECISION#')) decisions.push(item.data);
      }
      cursor = result.LastEvaluatedKey;
    } while (cursor);
    return { revisions, decisions };
  }

  async transact({ context, roles, previousVersion, release, revision, decision, receipt, integrationAuthorization }) {
    const { orgId, projectId, sub } = context;
    const permissions = Object.fromEntries(roles.map((role, index) => [`:role${index}`, role]));
    let checks = [
      { ConditionCheck: { TableName: this.accessTable, Key: { PK: `TENANT#${orgId}`, SK: `MEMBER#${sub}` }, ConditionExpression: '#active = :active', ExpressionAttributeNames: { '#active': 'active' }, ExpressionAttributeValues: { ':active': true } } },
      { ConditionCheck: { TableName: this.accessTable, Key: { PK: `TENANT#${orgId}`, SK: `PROJECT#${projectId}` },
        ConditionExpression: '#active = :active AND (attribute_not_exists(#writesFrozen) OR #writesFrozen = :notFrozen)',
        ExpressionAttributeNames: { '#active': 'active', '#writesFrozen': 'writesFrozen' }, ExpressionAttributeValues: { ':active': true, ':notFrozen': false } } },
      { ConditionCheck: { TableName: this.accessTable, Key: { PK: projectKey(orgId, projectId), SK: `PERMISSION#${sub}` },
        ConditionExpression: `#active = :active AND #role IN (${Object.keys(permissions).join(', ')})`,
        ExpressionAttributeNames: { '#active': 'active', '#role': 'role' }, ExpressionAttributeValues: { ':active': true, ...permissions } } },
    ];
    if (context.kind === 'integration') {
      if (!integrationAuthorization || integrationAuthorization.keyId !== context.keyId || context.sub !== `integration:${context.keyId}`) throw new ApiError(401, 'INTEGRATION_UNAUTHORIZED', 'La credencial no es válida.');
      checks = [
        checks[1],
        { ConditionCheck: { TableName: this.accessTable, Key: { PK: projectKey(orgId, projectId), SK: `INTEGRATION#${integrationAuthorization.keyId}` },
          ConditionExpression: '#active = :active AND #id = :id AND #scope = :scope AND #hash = :hash AND #expiresAt > :now',
          ExpressionAttributeNames: { '#active': 'active', '#id': 'id', '#scope': 'scope', '#hash': 'secretHash', '#expiresAt': 'expiresAt' },
          ExpressionAttributeValues: { ':active': true, ':id': integrationAuthorization.keyId, ':scope': 'releases:create', ':hash': integrationAuthorization.secretHash, ':now': integrationAuthorization.nowEpoch } } },
        { ConditionCheck: { TableName: this.accessTable, Key: { PK: `TENANT#${orgId}`, SK: 'PRODUCT' }, ...plusCondition(integrationAuthorization.nowEpoch) } },
      ];
    }
    const put = (PK, SK, data) => ({ Put: { TableName: this.releasesTable, Item: { PK, SK, data }, ConditionExpression: 'attribute_not_exists(PK)' } });
    const releaseWrite = put(projectKey(orgId, projectId), `RELEASE#${release.id}`, release);
    if (previousVersion !== null) {
      releaseWrite.Put.ConditionExpression = '#data.#version = :version';
      releaseWrite.Put.ExpressionAttributeNames = { '#data': 'data', '#version': 'version' };
      releaseWrite.Put.ExpressionAttributeValues = { ':version': previousVersion };
    }
    const writes = [...checks, releaseWrite, put(projectKey(orgId, projectId), `IDEMP#${receipt.key}`, receipt)];
    if (revision) writes.push(put(revisionKey(orgId, projectId, release.id), `REV#${numberKey(revision.number)}`, revision));
    if (decision) writes.push(put(revisionKey(orgId, projectId, release.id), `DECISION#${numberKey(decision.revision)}`, decision));
    try { await this.client.send(new TransactWriteCommand({ TransactItems: writes })); }
    catch (error) {
      if (error.name === 'TransactionCanceledException') {
        if (error.CancellationReasons?.slice(0, 3).some((reason) => reason.Code === 'ConditionalCheckFailed')) throw new ApiError(403, 'FORBIDDEN', 'El acceso al proyecto ya no está vigente.');
        if (error.CancellationReasons?.some((reason) => ['ConditionalCheckFailed', 'TransactionConflict'].includes(reason.Code))) throw new ApiError(409, 'CONFLICT', 'La entrega cambió. Actualiza antes de continuar.');
      }
      if (error.name === 'TransactionConflictException' || error.name === 'ConditionalCheckFailedException') throw new ApiError(409, 'CONFLICT', 'Hay otra operación en curso. Reintenta con la misma clave.');
      throw error;
    }
  }
}
