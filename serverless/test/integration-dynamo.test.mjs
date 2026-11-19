import assert from 'node:assert/strict';
import test from 'node:test';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { integrationKeyRepository } from '../src/identity/key-repository.mjs';
import { DynamoReleasesRepository } from '../src/releases/repository.mjs';
import { planIsPlus } from '../src/integrations/access.mjs';

const keyId = 'a'.repeat(32), epoch = 1800000000, secretHash = 'b'.repeat(64);
const human = { orgId: 'agency', projectId: 'pilot', sub: 'admin' };
const machine = { ...human, sub: `integration:${keyId}`, kind: 'integration', keyId, secretHash };
const keyRow = { id: keyId, name: 'CI', scope: 'releases:create', active: true, expiresAt: epoch + 86400, createdAt: '2026-11-19T12:00:00Z', secretHash };
const receipt = { key: 'attempt', digest: 'request-digest', response: { key: { id: keyId, active: true } } };

function setup(responder = () => ({ statusCode: 200, body: {} })) {
  const requests = [];
  const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-east-1', maxAttempts: 1,
    credentials: { accessKeyId: 'synthetic-access-key', secretAccessKey: 'synthetic-test-secret' },
    requestHandler: { async handle(request) {
      const body = JSON.parse(typeof request.body === 'string' ? request.body : new TextDecoder().decode(request.body));
      requests.push({ operation: request.headers['x-amz-target'], body });
      const result = responder(body);
      return { response: { statusCode: result.statusCode, headers: { 'content-type': 'application/x-amz-json-1.0' }, body: Buffer.from(JSON.stringify(result.body)) } };
    } },
  }));
  return { keys: integrationKeyRepository(client, 'access'), releases: new DynamoReleasesRepository(client, { accessTable: 'access', releasesTable: 'releases' }), requests };
}

test('key creation serializes current administrator/project/Plus checks and persists only hash plus a safe immutable receipt', async () => {
  const { keys, requests } = setup();
  await keys.createIntegrationKey(human, keyRow, receipt, epoch);
  const entries = requests[0].body.TransactItems;
  assert.equal(entries.length, 6);
  assert.deepEqual(entries.slice(0, 4).map(entry => entry.ConditionCheck.Key.SK.S), ['MEMBER#admin', 'PROJECT#pilot', 'PERMISSION#admin', 'PRODUCT']);
  assert.equal(entries[1].ConditionCheck.ExpressionAttributeNames['#frozen'], 'writesFrozen');
  assert.deepEqual(entries[2].ConditionCheck.ExpressionAttributeValues[':administrator'], { S: 'administrator' });
  assert.deepEqual(entries[3].ConditionCheck.ExpressionAttributeValues[':now'], { N: String(epoch) });
  assert.equal(entries[4].Put.Item.secretHash.S, secretHash);
  assert.equal(entries[4].Put.Item.SK.S, `INTEGRATION#${keyId}`);
  assert.equal(entries[5].Put.Item.SK.S, 'KEYREQUEST#attempt');
  assert.equal(entries[5].Put.ConditionExpression, 'attribute_not_exists(PK)');
  assert.equal(Object.hasOwn(entries[4].Put.Item, 'token'), false);
});

test('revocation rechecks administrator access atomically without requiring Plus or open project writes', async () => {
  const { keys, requests } = setup();
  await keys.revokeIntegrationKey(human, keyId, receipt, epoch);
  const entries = requests[0].body.TransactItems;
  assert.equal(entries.length, 5);
  assert.deepEqual(entries.slice(0, 3).map(entry => entry.ConditionCheck.Key.SK.S), ['MEMBER#admin', 'PROJECT#pilot', 'PERMISSION#admin']);
  assert.equal(entries[1].ConditionCheck.ConditionExpression.includes('frozen'), false);
  assert.deepEqual(entries[3].Update.ExpressionAttributeValues[':inactive'], { BOOL: false });
  assert.equal(entries[3].Update.Key.PK.S, 'TENANT#agency#PROJECT#pilot');
});

test('integration writes use one transaction with project, exact active credential and current Plus checks', async () => {
  const { releases, requests } = setup();
  await releases.transact({ context: machine, roles: [], previousVersion: null, release: { id: 'r1', status: 'draft', version: 1 }, receipt,
    integrationAuthorization: { keyId, secretHash, nowEpoch: epoch } });
  const entries = requests[0].body.TransactItems;
  assert.equal(entries.length, 5);
  assert.deepEqual(entries.slice(0, 3).map(entry => entry.ConditionCheck.Key.SK.S), ['PROJECT#pilot', `INTEGRATION#${keyId}`, 'PRODUCT']);
  const condition = entries[1].ConditionCheck;
  assert.deepEqual(condition.ExpressionAttributeValues[':hash'], { S: secretHash });
  assert.deepEqual(condition.ExpressionAttributeValues[':scope'], { S: 'releases:create' });
  assert.deepEqual(condition.ExpressionAttributeValues[':now'], { N: String(epoch) });
  assert.ok(condition.ConditionExpression.includes('#expiresAt > :now'));
  assert.equal(entries[3].Put.Item.SK.S, 'RELEASE#r1');
  assert.equal(entries[4].Put.Item.SK.S, 'IDEMP#attempt');
  assert.equal(JSON.stringify(entries.slice(3)).includes(secretHash), false);
});

test('key/plan authorization cancellation is distinguished from competing immutable writes', async () => {
  for (const [operation, index, status] of [['create', 2, 403], ['create', 3, 403], ['create', 5, 409], ['ingest', 0, 403], ['ingest', 1, 403], ['ingest', 2, 403], ['ingest', 4, 409]]) {
    const { keys, releases } = setup(() => ({ statusCode: 400, body: { __type: 'com.amazonaws.dynamodb.v20120810#TransactionCanceledException', Message: 'Synthetic cancellation', CancellationReasons: Array.from({ length: operation === 'create' ? 6 : 5 }, (_, position) => ({ Code: position === index ? 'ConditionalCheckFailed' : 'None' })) } }));
    const action = operation === 'create' ? keys.createIntegrationKey(human, keyRow, receipt, epoch) : releases.transact({ context: machine, roles: [], previousVersion: null, release: { id: 'r1', version: 1 }, receipt, integrationAuthorization: { keyId, secretHash, nowEpoch: epoch } });
    await assert.rejects(action, error => error.statusCode === status);
  }
});

test('integration and management access reads are consistent and scoped; Plus fails closed on malformed expiry', async () => {
  const { keys, releases, requests } = setup();
  await keys.getAccess('agency', 'pilot', 'admin');
  assert.equal(requests.length, 4);
  assert.ok(requests.every(request => request.body.ConsistentRead === true));
  requests.length = 0;
  await releases.getIntegrationAccess('agency', 'pilot', keyId);
  assert.deepEqual(requests.map(request => request.body.Key.SK.S), ['PROJECT#pilot', `INTEGRATION#${keyId}`, 'PRODUCT']);
  assert.ok(requests.every(request => request.body.ConsistentRead === true));
  for (const expiresAt of [null, 'future', epoch, epoch - 1, epoch + 0.5]) assert.equal(planIsPlus({ active: true, plan: 'plus', expiresAt }, epoch), false);
  assert.equal(planIsPlus({ active: true, plan: 'plus' }, epoch), true);
});
