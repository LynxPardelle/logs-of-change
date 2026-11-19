import { GetCommand, QueryCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { ApiError } from '../releases/domain.mjs';
import { plusCondition } from '../integrations/access.mjs';
import { validId } from '../integrations/access.mjs';
import { publicReleaseDto, validPublicId, validSlug } from './domain.mjs';

const projectKey = (orgId, projectId) => `TENANT#${orgId}#PROJECT#${projectId}`;
const get = async (client, table, PK, SK) => (await client.send(new GetCommand({ TableName: table, Key: { PK, SK }, ConsistentRead: true }))).Item;
function validateCursor(cursor, PK, prefix, validateId) {
  if (cursor && (cursor.PK !== PK || typeof cursor.SK !== 'string' || !cursor.SK.startsWith(prefix) || !validateId(cursor.SK.slice(prefix.length)) || Object.keys(cursor).length !== 2)) throw new ApiError(400, 'VALIDATION_ERROR', 'El cursor no corresponde a este proyecto.');
}

export class DynamoPublicationsReader {
  constructor(client, { publicTable }) { this.client = client; this.publicTable = publicTable; }
  async getPublicProject(slug) { return (await get(this.client, this.publicTable, `PROJECT#${slug}`, 'META'))?.data; }
  async listPublic(slug, cursor, limit) {
    if (!validSlug(slug) || !Number.isInteger(limit) || limit < 1 || limit > 50) throw new ApiError(400, 'VALIDATION_ERROR', 'La consulta no es válida.');
    const PK = `PROJECT#${slug}`; validateCursor(cursor, PK, 'RELEASE#', validPublicId);
    const result = await this.client.send(new QueryCommand({ TableName: this.publicTable, KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
      ExpressionAttributeValues: { ':pk': PK, ':prefix': 'RELEASE#' }, ConsistentRead: true, Limit: limit, ...(cursor ? { ExclusiveStartKey: cursor } : {}) }));
    return { releases: (result.Items ?? []).map(item => item.data), nextCursor: result.LastEvaluatedKey ?? null };
  }
}

export class DynamoPublicationsRepository extends DynamoPublicationsReader {
  constructor(client, { accessTable, adminTable, publicTable }) { super(client, { publicTable }); this.accessTable = accessTable; this.adminTable = adminTable; }
  async getAccess(orgId, projectId, sub) {
    const [membership, project, permission, plan] = await Promise.all([
      get(this.client, this.accessTable, `TENANT#${orgId}`, `MEMBER#${sub}`),
      get(this.client, this.accessTable, `TENANT#${orgId}`, `PROJECT#${projectId}`),
      get(this.client, this.accessTable, projectKey(orgId, projectId), `PERMISSION#${sub}`),
      get(this.client, this.accessTable, `TENANT#${orgId}`, 'PRODUCT'),
    ]);
    return { membership, project, permission, plan };
  }
  async getPublication(orgId, projectId, id) { return (await get(this.client, this.adminTable, projectKey(orgId, projectId), `PUBLICATION#${id}`))?.data; }
  async getProject(orgId, projectId) { return (await get(this.client, this.adminTable, projectKey(orgId, projectId), 'CONFIG'))?.data; }
  async getReceipt(orgId, projectId, key) { return (await get(this.client, this.adminTable, projectKey(orgId, projectId), `IDEMP#${key}`))?.data; }
  async list(orgId, projectId, cursor, limit) {
    const PK = projectKey(orgId, projectId); validateCursor(cursor, PK, 'PUBLICATION#', validId);
    const result = await this.client.send(new QueryCommand({ TableName: this.adminTable, KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)', ExpressionAttributeValues: { ':pk': PK, ':prefix': 'PUBLICATION#' },
      ConsistentRead: true, Limit: limit, ...(cursor ? { ExclusiveStartKey: cursor } : {}) }));
    return { publications: (result.Items ?? []).map(item => item.data), nextCursor: result.LastEvaluatedKey ?? null };
  }
  async transact({ context, operation, publication, previousVersion, config, previousConfigVersion, publicRelease, receipt, nowEpoch }) {
    const { orgId, projectId, sub } = context; const PK = projectKey(orgId, projectId);
    const active = { '#active': 'active' }; const activeValues = { ':active': true };
    const checks = [
      { ConditionCheck: { TableName: this.accessTable, Key: { PK: `TENANT#${orgId}`, SK: `MEMBER#${sub}` }, ConditionExpression: '#active = :active', ExpressionAttributeNames: active, ExpressionAttributeValues: activeValues } },
      { ConditionCheck: { TableName: this.accessTable, Key: { PK: `TENANT#${orgId}`, SK: `PROJECT#${projectId}` },
        ConditionExpression: operation === 'publish' ? '#active = :active AND (attribute_not_exists(#writesFrozen) OR #writesFrozen = :notFrozen)' : '#active = :active',
        ExpressionAttributeNames: operation === 'publish' ? { ...active, '#writesFrozen': 'writesFrozen' } : active, ExpressionAttributeValues: operation === 'publish' ? { ...activeValues, ':notFrozen': false } : activeValues } },
      { ConditionCheck: { TableName: this.accessTable, Key: { PK, SK: `PERMISSION#${sub}` }, ConditionExpression: '#active = :active AND #role = :administrator', ExpressionAttributeNames: { ...active, '#role': 'role' }, ExpressionAttributeValues: { ...activeValues, ':administrator': 'administrator' } } },
    ];
    if (operation === 'publish') checks.push({ ConditionCheck: { TableName: this.accessTable, Key: { PK: `TENANT#${orgId}`, SK: 'PRODUCT' }, ...plusCondition(nowEpoch) } });
    const put = (table, itemPK, SK, data) => ({ Put: { TableName: table, Item: { PK: itemPK, SK, data } } });
    const compareVersion = (write, previous) => {
      if (previous === null) write.Put.ConditionExpression = 'attribute_not_exists(PK)';
      else { write.Put.ConditionExpression = '#data.#version = :version'; write.Put.ExpressionAttributeNames = { '#data': 'data', '#version': 'version' }; write.Put.ExpressionAttributeValues = { ':version': previous }; }
      return write;
    };
    const writes = [...checks, compareVersion(put(this.adminTable, PK, `PUBLICATION#${publication.releaseId}`, publication), previousVersion), put(this.adminTable, PK, `IDEMP#${receipt.key}`, receipt)];
    writes.at(-1).Put.ConditionExpression = 'attribute_not_exists(PK)';
    if (operation === 'publish') {
      const publicData = publicReleaseDto(publicRelease);
      if (publicData.id !== publication.publicId || config.slug !== publication.slug) throw new ApiError(409, 'CONFLICT', 'La proyección no corresponde a esta publicación.');
      writes.push(compareVersion(put(this.adminTable, PK, 'CONFIG', config), previousConfigVersion));
      writes.push({ Put: { TableName: this.adminTable, Item: { PK: `SLUG#${config.slug}`, SK: 'CLAIM', owner: PK }, ConditionExpression: 'attribute_not_exists(PK) OR #owner = :owner', ExpressionAttributeNames: { '#owner': 'owner' }, ExpressionAttributeValues: { ':owner': PK } } });
      writes.push(put(this.publicTable, `PROJECT#${config.slug}`, 'META', { slug: config.slug, name: config.name }));
      writes.push(put(this.publicTable, `PROJECT#${config.slug}`, `RELEASE#${publicData.id}`, publicData));
    } else writes.push({ Delete: { TableName: this.publicTable, Key: { PK: `PROJECT#${publication.slug}`, SK: `RELEASE#${publication.publicId}` } } });
    try { await this.client.send(new TransactWriteCommand({ TransactItems: writes })); }
    catch (error) {
      if (error.name === 'TransactionCanceledException') {
        if (error.CancellationReasons?.slice(0, checks.length).some(reason => reason.Code === 'ConditionalCheckFailed')) throw new ApiError(403, 'FORBIDDEN', 'El acceso o el plan ya no está vigente.');
        if (error.CancellationReasons?.some(reason => ['ConditionalCheckFailed', 'TransactionConflict'].includes(reason.Code))) throw new ApiError(409, 'CONFLICT', 'La publicación, el proyecto o el slug cambió.');
      }
      if (['TransactionConflictException', 'ConditionalCheckFailedException'].includes(error.name)) throw new ApiError(409, 'CONFLICT', 'Hay otra operación en curso. Reintenta con la misma clave.');
      throw error;
    }
  }
}
