import assert from 'node:assert/strict';
import test from 'node:test';
import { EventEmitter } from 'node:events';
import { resolve } from 'node:path';
import { validateProductSmokeScope, cleanupProductSmoke, runPortableCli } from '../scripts/smoke-product.mjs';

const runId = '12345678-1234-4123-8123-123456789abc';
const orgId = `smoke-${runId}`, projectId = 'synthetic-pilot';
const account = '123456789012';
const table = name => `logsofchange-testing-publications-${name}-Table-EXAMPLE`;
const arn = name => `arn:aws:dynamodb:us-east-1:${account}:table/${name}`;
const deployment = { environment: 'testing', region: 'us-east-1', edge: { PublicUrl: 'https://test.logsofchange.lynxpardelle.com' },
  identity: { AccessTableName: table('identity'), AccessTableArn: arn(table('identity')) },
  releases: { ReleasesTableName: table('releases'), ReleasesTableArn: arn(table('releases')) },
  publications: { AdminTableName: table('admin'), AdminTableArn: arn(table('admin')), PublicTableName: table('public'), PublicTableArn: arn(table('public')) } };
const options = { runId, orgId, projectId, origin: deployment.edge.PublicUrl };

test('product smoke refuses foreign tables, accounts, origins and nonsynthetic partitions before mutation', () => {
  const scope = validateProductSmokeScope(deployment, options);
  assert.equal(scope.adminTable, table('admin'));
  assert.equal(scope.projectPK, `TENANT#${orgId}#PROJECT#${projectId}`);
  assert.equal(scope.slug, `smoke-${runId}`);
  for (const input of [
    { ...deployment, publications: { ...deployment.publications, AdminTableArn: arn(table('admin')).replace(account, '999999999999') } },
    { ...deployment, publications: { ...deployment.publications, PublicTableName: 'customers' } },
    { ...deployment, publications: { ...deployment.publications, PublicTableName: deployment.identity.AccessTableName, PublicTableArn: deployment.identity.AccessTableArn } },
    { ...deployment, region: 'us-west-2' },
  ]) assert.throws(() => validateProductSmokeScope(input, options));
  for (const invalid of [{ ...options, runId: 'existing-project' }, { ...options, orgId: 'customer' }, { ...options, projectId: 'customer' }, { ...options, origin: 'https://attacker.example' }]) assert.throws(() => validateProductSmokeScope(deployment, invalid));
});

test('product cleanup deletes only its UUID partitions and uses a conditional slug-owner delete', async () => {
  const scope = validateProductSmokeScope(deployment, options);
  const calls = [];
  const dynamo = { async send(command) {
    calls.push(command);
    if (command.constructor.name === 'QueryCommand') return { Items: command.input.TableName === scope.adminTable ? [{ PK: scope.projectPK, SK: 'CONFIG' }] : [{ PK: scope.publicPK, SK: 'META' }] };
    if (command.constructor.name === 'GetCommand') return { Item: { PK: `SLUG#${scope.slug}`, SK: 'CLAIM', owner: scope.projectPK } };
    return {};
  } };
  const report = { cleanup: { failures: [] } };
  await cleanupProductSmoke({ scope, dynamo, report });
  assert.equal(report.cleanup.deletedPublicationAdminRows, 2);
  assert.equal(report.cleanup.deletedPublicationPublicRows, 1);
  const claim = calls.find(call => call.constructor.name === 'DeleteCommand' && call.input.Key.SK === 'CLAIM');
  assert.equal(claim.input.ConditionExpression, '#owner = :owner');
  assert.equal(claim.input.ExpressionAttributeValues[':owner'], scope.projectPK);
  assert.deepEqual(report.cleanup.failures, []);
});

test('product cleanup preserves a slug claim owned by another project and records the failure', async () => {
  const scope = validateProductSmokeScope(deployment, options);
  const calls = [];
  const dynamo = { async send(command) { calls.push(command); return command.constructor.name === 'QueryCommand' ? { Items: command.input.TableName === scope.publicTable ? [{ PK: scope.publicPK, SK: 'META' }] : [] } : command.constructor.name === 'GetCommand' ? { Item: { owner: 'TENANT#customer#PROJECT#real' } } : {}; } };
  const report = { cleanup: { failures: [] } };
  await cleanupProductSmoke({ scope, dynamo, report });
  assert.equal(calls.some(call => call.constructor.name === 'DeleteCommand'), false);
  assert.equal(calls.some(call => call.constructor.name === 'QueryCommand' && call.input.TableName === scope.publicTable), false);
  assert.equal(calls.some(call => call.constructor.name === 'TransactWriteCommand'), false);
  assert.equal(report.cleanup.failures.length, 1);
});

test('product cleanup refuses orphaned public rows when no owned slug claim exists', async () => {
  const scope = validateProductSmokeScope(deployment, options);
  const calls = [];
  const dynamo = { async send(command) { calls.push(command); return command.constructor.name === 'QueryCommand' ? { Items: command.input.TableName === scope.publicTable ? [{ PK: scope.publicPK, SK: 'META' }] : [] } : {}; } };
  const report = { cleanup: { failures: [] } };
  await cleanupProductSmoke({ scope, dynamo, report });
  assert.equal(calls.some(call => ['DeleteCommand', 'TransactWriteCommand'].includes(call.constructor.name)), false);
  assert.equal(report.cleanup.failures.length, 1);
});

test('public deletes remain conditional on ownership and a failed deletion preserves the claim for recovery', async () => {
  const scope = validateProductSmokeScope(deployment, options);
  const calls = [];
  const dynamo = { async send(command) {
    calls.push(command);
    if (command.constructor.name === 'GetCommand') return { Item: { owner: scope.projectPK } };
    if (command.constructor.name === 'QueryCommand') return { Items: command.input.TableName === scope.publicTable ? [{ PK: scope.publicPK, SK: 'META' }] : [] };
    if (command.constructor.name === 'TransactWriteCommand') { const error = new Error('Ownership changed'); error.name = 'TransactionCanceledException'; throw error; }
    return {};
  } };
  const report = { cleanup: { failures: [] } };
  await cleanupProductSmoke({ scope, dynamo, report });
  const transaction = calls.find(call => call.constructor.name === 'TransactWriteCommand').input.TransactItems;
  assert.equal(transaction[0].ConditionCheck.ExpressionAttributeValues[':owner'], scope.projectPK);
  assert.equal(transaction[1].Delete.TableName, scope.publicTable);
  assert.equal(calls.some(call => call.constructor.name === 'DeleteCommand' && call.input.Key.SK === 'CLAIM'), false);
  assert.equal(report.cleanup.deletedPublicationPublicRows, 0);
  assert.equal(report.cleanup.failures.length, 1);
});

test('portable CLI subprocess receives its key only in environment and returns only safe receipt metadata', async () => {
  const apiKey = `loc_${'a'.repeat(32)}_${'B'.repeat(43)}`;
  let invoked;
  const root = resolve('synthetic-repository'), directory = resolve(root, 'serverless/.deployment/testing');
  const result = await runPortableCli({ root, directory, environment: 'testing', orgId, projectId, file: resolve(directory, 'product-cli-input.json'), idempotencyKey: 'synthetic-run', apiKey }, { spawnImpl: (command, args, options) => {
    invoked = { command, args, options };
    const child = new EventEmitter(); child.stdout = new EventEmitter(); child.stderr = new EventEmitter();
    queueMicrotask(() => { child.stdout.emit('data', JSON.stringify({ environment: 'testing', releaseId: 'r1', revision: 1, status: 'draft' })); child.emit('exit', 0); });
    return child;
  } });
  assert.equal(result.status, 'draft');
  assert.ok(!JSON.stringify(invoked.args).includes(apiKey));
  assert.equal(invoked.options.env.LOGSOFCHANGE_API_KEY, apiKey);
  assert.equal(invoked.options.cwd, directory);
  assert.ok(!JSON.stringify(result).includes(apiKey));
});
