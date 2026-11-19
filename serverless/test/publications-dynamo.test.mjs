import assert from 'node:assert/strict';
import test from 'node:test';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const implementation = await import('../src/publications/repository.mjs').catch(() => ({}));
function setup(responder = () => ({ statusCode: 200, body: {} })) {
  assert.equal(typeof implementation.DynamoPublicationsRepository, 'function');
  const requests = [];
  const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-east-1', maxAttempts: 1, credentials: { accessKeyId: 'synthetic-access', secretAccessKey: 'synthetic-secret' }, requestHandler: { async handle(request) {
    const body = JSON.parse(typeof request.body === 'string' ? request.body : new TextDecoder().decode(request.body)); requests.push({ operation: request.headers['x-amz-target'], body }); const result = responder(body);
    return { response: { statusCode: result.statusCode, headers: { 'content-type': 'application/x-amz-json-1.0' }, body: Buffer.from(JSON.stringify(result.body)) } };
  } } }));
  return { repository: new implementation.DynamoPublicationsRepository(client, { accessTable: 'access', adminTable: 'admin', publicTable: 'public' }), reader: new implementation.DynamoPublicationsReader(client, { publicTable: 'public' }), requests };
}
const command = () => ({ operation: 'publish', context: { orgId: 'agency', projectId: 'pilot', sub: 'admin' }, nowEpoch: 1795089600,
  previousVersion: null, previousConfigVersion: null, config: { slug: 'public-project', name: 'Public', version: 1 },
  publication: { releaseId: 'private-release', publicId: '00000000-0000-4000-8000-000000000001', slug: 'public-project', revision: 1, active: true, version: 1 },
  publicRelease: { id: '00000000-0000-4000-8000-000000000001', revision: 1, title: 'Published', acceptedAt: '2026-11-19T12:00:00.000Z', publishedAt: '2026-11-19T12:00:00.000Z' }, receipt: { key: 'attempt', digest: 'digest', response: { publication: {} } } });

test('SDK writes one atomic publication with current membership, project, administrator and Plus checks', async () => {
  const { repository, requests } = setup(); await repository.transact(command());
  assert.equal(requests.length, 1); assert.ok(requests[0].operation.endsWith('.TransactWriteItems'));
  const writes = requests[0].body.TransactItems; assert.equal(writes.length, 10);
  assert.deepEqual(writes.slice(0, 4).map(item => item.ConditionCheck.TableName), ['access', 'access', 'access', 'access']);
  assert.equal(writes[2].ConditionCheck.ExpressionAttributeValues[':administrator'].S, 'administrator');
  assert.deepEqual(writes[3].ConditionCheck.Key, { PK: { S: 'TENANT#agency' }, SK: { S: 'PRODUCT' } });
  assert.ok(writes[3].ConditionCheck.ConditionExpression.includes('#expiresAt'));
  const publicWrites = writes.filter(item => item.Put?.TableName === 'public'); assert.equal(publicWrites.length, 2);
  assert.ok(!JSON.stringify(publicWrites).includes('private-release')); assert.ok(!JSON.stringify(publicWrites).includes('agency'));
  assert.deepEqual(publicWrites[1].Put.Item.data.M.id, { S: command().publicRelease.id });
  assert.ok(writes.find(item => item.Put?.Item?.PK?.S === 'SLUG#public-project').Put.ConditionExpression.includes('owner'));
});

test('unpublish has no Plus or freeze condition and atomically deletes only the selected public projection', async () => {
  const { repository, requests } = setup(); const value = command(); value.operation = 'unpublish'; value.previousVersion = 1; value.publication = { ...value.publication, version: 2, active: false };
  await repository.transact(value); const writes = requests[0].body.TransactItems;
  assert.equal(writes.filter(item => item.ConditionCheck).length, 3);
  assert.ok(!JSON.stringify(writes).includes('writesFrozen')); assert.ok(!JSON.stringify(writes).includes('PRODUCT'));
  assert.equal(writes.find(item => item.Delete).Delete.TableName, 'public');
  assert.deepEqual(writes.find(item => item.Delete).Delete.Key, { PK: { S: 'PROJECT#public-project' }, SK: { S: `RELEASE#${value.publication.publicId}` } });
});

test('access reads are strongly consistent and conditional cancellations distinguish access and state races', async () => {
  const { repository, requests } = setup(); await repository.getAccess('agency', 'pilot', 'admin');
  assert.equal(requests.length, 4); assert.ok(requests.every(request => request.body.ConsistentRead === true));
  for (const [position, status] of [[0, 403], [3, 403], [4, 409], [7, 409]]) {
    const value = setup(() => ({ statusCode: 400, body: { __type: 'com.amazonaws.dynamodb.v20120810#TransactionCanceledException', CancellationReasons: Array.from({ length: 10 }, (_, index) => ({ Code: index === position ? 'ConditionalCheckFailed' : 'None' })) } }));
    await assert.rejects(value.repository.transact(command()), error => error.statusCode === status);
  }
});

test('public reader only queries its public table and rejects foreign or administrative cursor keys before AWS', async () => {
  const { reader, requests } = setup();
  await reader.getPublicProject('public-project'); await reader.listPublic('public-project', undefined, 2);
  assert.ok(requests.every(request => request.body.TableName === 'public' && request.body.ConsistentRead === true));
  const count = requests.length;
  for (const cursor of [{ PK: 'PROJECT#foreign', SK: 'RELEASE#00000000-0000-4000-8000-000000000001' }, { PK: 'PROJECT#public-project', SK: 'META' }, { PK: 'PROJECT#public-project', SK: 'RELEASE#00000000-0000-4000-8000-000000000001', extra: 'x' }]) await assert.rejects(reader.listPublic('public-project', cursor, 2), error => error.statusCode === 400);
  assert.equal(requests.length, count);
});

test('repository enforces the public DTO boundary even when an internal caller adds private fields', async () => {
  const { repository, requests } = setup(); const value = command();
  value.publicRelease.releaseId = 'must-stay-private'; value.publicRelease.actor = 'must-stay-private';
  await repository.transact(value);
  const publicWrites = requests[0].body.TransactItems.filter(item => item.Put?.TableName === 'public');
  assert.ok(!JSON.stringify(publicWrites).includes('must-stay-private'));
});
