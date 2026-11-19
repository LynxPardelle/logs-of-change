import assert from 'node:assert/strict';
import test from 'node:test';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { DynamoReleasesRepository } from '../src/releases/repository.mjs';

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
  return { repository: new DynamoReleasesRepository(client, { accessTable: 'access', releasesTable: 'releases' }), requests };
}

const command = () => ({ context: { orgId: 'agency', projectId: 'pilot', sub: 'editor' }, roles: ['editor', 'administrator'], previousVersion: 1,
  release: { id: 'r1', version: 2, status: 'pending_review' }, revision: { number: 1, digest: 'synthetic-digest', manifest: { title: 'Hito' } },
  receipt: { key: 'attempt', digest: 'request-digest', response: { release: { id: 'r1' } } } });

test('real AWS SDK serializes one atomic write with three current access checks and immutable revision/receipt', async () => {
  const { repository, requests } = setup();
  await repository.transact(command());
  assert.equal(requests.length, 1);
  assert.ok(requests[0].operation.endsWith('.TransactWriteItems'));
  const writes = requests[0].body.TransactItems;
  assert.equal(writes.length, 6);
  assert.deepEqual(writes.slice(0, 3).map((item) => item.ConditionCheck.TableName), ['access', 'access', 'access']);
  assert.deepEqual(writes[0].ConditionCheck.Key, { PK: { S: 'TENANT#agency' }, SK: { S: 'MEMBER#editor' } });
  assert.equal(writes[0].ConditionCheck.ExpressionAttributeNames['#active'], 'active');
  assert.equal(writes[1].ConditionCheck.ExpressionAttributeNames['#writesFrozen'], 'writesFrozen');
  assert.equal(writes[1].ConditionCheck.ConditionExpression, '#active = :active AND (attribute_not_exists(#writesFrozen) OR #writesFrozen = :notFrozen)');
  assert.deepEqual(writes[1].ConditionCheck.ExpressionAttributeValues[':notFrozen'], { BOOL: false });
  assert.equal(writes[2].ConditionCheck.ExpressionAttributeNames['#role'], 'role');
  assert.ok(writes[2].ConditionCheck.ConditionExpression.includes('#role IN'));
  assert.equal(writes[3].Put.ConditionExpression, '#data.#version = :version');
  assert.deepEqual(writes[3].Put.ExpressionAttributeValues[':version'], { N: '1' });
  assert.equal(writes[4].Put.Item.SK.S, 'IDEMP#attempt');
  assert.equal(writes[4].Put.ConditionExpression, 'attribute_not_exists(PK)');
  assert.equal(writes[5].Put.Item.SK.S, 'REV#0000000001');
  assert.equal(writes[5].Put.ConditionExpression, 'attribute_not_exists(PK)');
});

test('conditional access cancellation becomes 403 while competing release writes become 409', async () => {
  for (const [index, expectedStatus] of [[0, 403], [2, 403], [3, 409], [4, 409]]) {
    const { repository } = setup(() => ({ statusCode: 400, body: { __type: 'com.amazonaws.dynamodb.v20120810#TransactionCanceledException',
      Message: 'Transaction cancelled', CancellationReasons: Array.from({ length: 6 }, (_, position) => ({ Code: position === index ? 'ConditionalCheckFailed' : 'None' })) } }));
    await assert.rejects(repository.transact(command()), (error) => error.statusCode === expectedStatus);
  }
});

test('access membership, project and permission are strongly consistent reads scoped to the route', async () => {
  const { repository, requests } = setup();
  await repository.getAccess('agency', 'pilot', 'editor');
  assert.equal(requests.length, 3);
  assert.ok(requests.every((request) => request.operation.endsWith('.GetItem') && request.body.ConsistentRead === true));
  assert.deepEqual(requests.map((request) => request.body.Key.SK.S).sort(), ['MEMBER#editor', 'PERMISSION#editor', 'PROJECT#pilot']);
  assert.equal(requests.find((request) => request.body.Key.SK.S === 'PERMISSION#editor').body.Key.PK.S, 'TENANT#agency#PROJECT#pilot');
});

test('malformed and foreign Dynamo cursors are rejected before a database request', async () => {
  const { repository, requests } = setup();
  for (const cursor of [{ PK: 'TENANT#foreign#PROJECT#pilot', SK: 'RELEASE#r1' }, { PK: 'TENANT#agency#PROJECT#pilot', SK: 'IDEMP#key' },
    { PK: 'TENANT#agency#PROJECT#pilot', SK: 'RELEASE#r1', injected: true }]) {
    await assert.rejects(repository.list('agency', 'pilot', cursor, 20), (error) => error.statusCode === 400);
  }
  assert.equal(requests.length, 0);
});
