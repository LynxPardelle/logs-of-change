import assert from 'node:assert/strict';
import test from 'node:test';
import { parsePlanArguments, setProductPlan } from '../scripts/set-product-plan.mjs';

const epoch = 1800000000;
const account = '123456789012';
const table = 'logsofchange-development-identity-AccessTable-example';
const snapshot = { environment: 'development', region: 'us-east-1', identity: { AccessTableName: table, AccessTableArn: `arn:aws:dynamodb:us-east-1:${account}:table/${table}` } };
const args = ['--environment=development', '--org=agency', '--project=pilot', '--plan=plus'];
const item = row => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, typeof value === 'string' ? { S: value } : typeof value === 'boolean' ? { BOOL: value } : { N: String(value) }]));

function setup({ existing, project = { active: true, projectId: 'pilot' }, branch = 'development', identityAccount = account, environment = snapshot } = {}) {
  const calls = [];
  return { calls, dependencies: { now: () => epoch * 1000,
    readEnvironment: async selected => { calls.push({ readEnvironment: selected }); return environment; },
    runner: async (command, parameters) => {
      calls.push({ command, parameters });
      if (command === 'git') return branch;
      if (parameters[0] === 'sts') return JSON.stringify({ Account: identityAccount });
      if (parameters[0] === 'dynamodb' && parameters[1] === 'get-item') {
        const key = JSON.parse(parameters[parameters.indexOf('--key') + 1]);
        return JSON.stringify({ ...(key.SK.S === 'PRODUCT' ? existing ? { Item: item(existing) } : {} : project ? { Item: item(project) } : {}) });
      }
      if (parameters[0] === 'dynamodb' && parameters[1] === 'transact-write-items') return '{}';
      throw new Error('Unexpected synthetic operation.');
    },
  } };
}

test('plan arguments require an explicit target and never treat unknown flags as approval', () => {
  assert.deepEqual(parsePlanArguments(args), { environment: 'development', org: 'agency', project: 'pilot', plan: 'plus', apply: false, approveProduction: false });
  for (const values of [[], args.slice(1), [...args, '--apply=false'], [...args, '--approve-production=yes'], [...args, '--apply'], [...args, '--org=other'], [...args, '--token=secret'], [...args, '--expires-at=tomorrow'], args.map(v => v === '--org=agency' ? '--org=../other' : v), [...args.map(v => v === '--plan=plus' ? '--plan=free' : v), `--expires-at=${epoch + 600}`]]) assert.throws(() => parsePlanArguments(values));
});

test('default preview freshly verifies account, table, project and existing plan using reads only', async () => {
  const { calls, dependencies } = setup();
  const result = await setProductPlan(parsePlanArguments([...args, `--expires-at=${epoch + 600}`]), dependencies);
  assert.deepEqual(result, { applied: false, environment: 'development', org: 'agency', project: 'pilot', previous: null, product: { plan: 'plus', active: true, expiresAt: epoch + 600 } });
  assert.equal(calls.filter(call => call.readEnvironment).length, 1);
  assert.equal(calls.filter(call => call.command === 'aws').length, 3);
  assert.ok(calls.filter(call => call.parameters?.[1] === 'get-item').every(call => call.parameters.includes('--consistent-read')));
  assert.equal(calls.some(call => call.parameters?.[1] === 'transact-write-items'), false);
});

test('apply writes exactly one CAS entitlement and conditions it on the active target project', async () => {
  const { calls, dependencies } = setup({ existing: { plan: 'plus', active: true, expiresAt: epoch + 500 } });
  const result = await setProductPlan(parsePlanArguments([...args, '--apply=true']), dependencies);
  assert.equal(result.applied, true);
  const call = calls.find(call => call.parameters?.[1] === 'transact-write-items');
  const transaction = JSON.parse(call.parameters[call.parameters.indexOf('--transact-items') + 1]);
  assert.equal(transaction.length, 2);
  assert.equal(transaction[0].ConditionCheck.Key.SK.S, 'PROJECT#pilot');
  assert.equal(transaction[0].ConditionCheck.TableName, table);
  assert.equal(transaction[1].Put.Item.SK.S, 'PRODUCT');
  assert.equal(transaction[1].Put.Item.PK.S, 'TENANT#agency');
  assert.equal(transaction[1].Put.Item.version.N, '1');
  assert.ok(transaction[1].Put.ConditionExpression.includes('attribute_not_exists(#version)'));
  assert.deepEqual(transaction[1].Put.ExpressionAttributeValues[':oldExpiry'], { N: String(epoch + 500) });
});

test('versioned plan updates use CAS, free disables Plus and production guards run before AWS', async () => {
  const versioned = setup({ existing: { plan: 'plus', active: true, version: 4 } });
  const result = await setProductPlan(parsePlanArguments([...args.map(v => v === '--plan=plus' ? '--plan=free' : v), '--apply=true']), versioned.dependencies);
  assert.deepEqual(result.product, { plan: 'free', active: false });
  const transactionCall = versioned.calls.find(call => call.parameters?.[1] === 'transact-write-items');
  const write = JSON.parse(transactionCall.parameters[transactionCall.parameters.indexOf('--transact-items') + 1])[1].Put;
  assert.ok(write.ConditionExpression.includes('#version = :oldVersion'));
  assert.deepEqual(write.ExpressionAttributeValues[':oldVersion'], { N: '4' });
  assert.equal(write.Item.version.N, '5');
  const denied = setup({ branch: 'testing' });
  const productionArgs = args.map(v => v === '--environment=development' ? '--environment=production' : v);
  await assert.rejects(setProductPlan(parsePlanArguments(productionArgs), denied.dependencies));
  assert.equal(denied.calls.some(call => call.command === 'aws' || call.readEnvironment), false);
});

test('invalid ownership, inactive projects, stale expiry and malformed prior plans stop before mutation', async () => {
  for (const options of [{ identityAccount: '999999999999' }, { project: { projectId: 'foreign', active: true } }, { project: { projectId: 'pilot', active: false } }, { project: undefined, existing: { plan: 'plus', active: 'true' } }, { environment: { ...snapshot, identity: { ...snapshot.identity, AccessTableName: 'foreign-table' } } }]) {
    const { calls, dependencies } = setup(options);
    await assert.rejects(setProductPlan(parsePlanArguments([...args, '--apply=true']), dependencies));
    assert.equal(calls.some(call => call.parameters?.[1] === 'transact-write-items'), false);
  }
  const { calls, dependencies } = setup();
  await assert.rejects(setProductPlan(parsePlanArguments([...args, `--expires-at=${epoch}`]), dependencies));
  assert.equal(calls.some(call => call.parameters?.[1] === 'transact-write-items'), false);
});
