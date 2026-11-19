import assert from 'node:assert/strict';
import test from 'node:test';
import { parseRetirementArguments, retireEmptyEnvironment, validateInventories } from '../scripts/retire-empty-environment.mjs';

const components = ['edge', 'evidence', 'releases', 'identity', 'artifacts'];
const sourceFixture = () => {
  const prefix = 'archivedchange', accountId = '123456789012', region = 'us-east-1';
  const table = (component, logical) => {
    const name = `${prefix}-development-${component}-${logical}-EXAMPLE`;
    return { name, arn: `arn:aws:dynamodb:${region}:${accountId}:table/${name}` };
  };
  return { environment: 'development', prefix, accountId, region, domain: `dev.${prefix}.lynxpardelle.com`, hostedZoneId: 'ZEXAMPLE',
    stacks: Object.fromEntries(components.map((component) => {
      const name = `${prefix}-development-${component}`;
      return [component, { name, arn: `arn:aws:cloudformation:${region}:${accountId}:stack/${name}/12345678-1234-1234-1234-123456789abc` }];
    })), userPoolId: 'us-east-1_example', accessTable: table('identity', 'AccessTable'), releasesTable: table('releases', 'ReleasesTable'),
    evidenceBucket: `${prefix}-development-releases-evidencebucket-example`, artifactBucket: `${prefix}-development-artifacts-${accountId}`,
    logGroups: [`/${prefix}/development/edge`, `/aws/lambda/${prefix}-development-releases`],
    validationRecords: [{ Name: `_example.dev.${prefix}.lynxpardelle.com.`, Type: 'CNAME', TTL: 300, ResourceRecords: [{ Value: '_example.acm-validations.aws.' }] }],
  };
};
const replacement = () => ({ environment: 'development', region: 'us-east-1', domain: 'dev.logsofchange.lynxpardelle.com', edge: { PublicUrl: 'https://dev.logsofchange.lynxpardelle.com' } });

function fakeAws(source, { users = [], rowCount = 0, evidenceVersions = [], account = source.accountId, incompleteReplacement = false, failDeleteStack = false } = {}) {
  const calls = [], deletedStacks = new Set(), deletedTables = new Set();
  let poolDeleted = false, evidenceDeleted = false, artifactsDeleted = false, artifactsListed = false;
  const value = (args, name) => args[args.indexOf(name) + 1];
  const runner = async (args) => {
    calls.push(args);
    const [service, operation] = args;
    if (service === 'sts') return { Account: account };
    if (service === 'cloudformation' && operation === 'describe-stacks') {
      const name = value(args, '--stack-name');
      if (deletedStacks.has(name)) throw new Error('Stack does not exist');
      const old = Object.values(source.stacks).find((stack) => stack.name === name);
      return { Stacks: [{ StackName: name, StackId: old?.arn || `arn:aws:cloudformation:us-east-1:${source.accountId}:stack/${name}/12345678-1234-1234-1234-123456789abc`, StackStatus: !old && incompleteReplacement ? 'CREATE_IN_PROGRESS' : 'CREATE_COMPLETE' }] };
    }
    if (service === 'cloudformation' && operation === 'delete-stack') {
      if (failDeleteStack) throw new Error('AccessDenied');
      const arn = value(args, '--stack-name');
      deletedStacks.add(Object.values(source.stacks).find((stack) => stack.arn === arn).name);
      return {};
    }
    if (service === 'cloudformation' && operation === 'wait') return {};
    if (service === 'cognito-idp' && operation === 'describe-user-pool') {
      if (poolDeleted) throw new Error('ResourceNotFoundException');
      return { UserPool: { Id: source.userPoolId, Name: `${source.prefix}-development` } };
    }
    if (service === 'cognito-idp' && operation === 'list-users') return { Users: users };
    if (service === 'cognito-idp' && operation === 'delete-user-pool') { poolDeleted = true; return {}; }
    if (service === 'dynamodb' && operation === 'describe-table') {
      const name = value(args, '--table-name');
      if (deletedTables.has(name)) throw new Error('ResourceNotFoundException');
      const item = [source.accessTable, source.releasesTable].find((table) => table.name === name);
      return { Table: { TableArn: item.arn, DeletionProtectionEnabled: name === source.releasesTable.name } };
    }
    if (service === 'dynamodb' && operation === 'scan') return { Count: rowCount };
    if (service === 'dynamodb' && operation === 'update-table') return {};
    if (service === 'dynamodb' && operation === 'delete-table') { deletedTables.add(value(args, '--table-name')); return {}; }
    if (service === 'dynamodb' && operation === 'wait') return {};
    if (service === 's3api' && operation === 'head-bucket') {
      if ((value(args, '--bucket') === source.evidenceBucket && evidenceDeleted) || (value(args, '--bucket') === source.artifactBucket && artifactsDeleted)) throw new Error('NoSuchBucket');
      return {};
    }
    if (service === 's3api' && operation === 'list-object-versions') {
      if (value(args, '--bucket') === source.evidenceBucket) return { Versions: evidenceVersions };
      if (!artifactsListed) { artifactsListed = true; return { Versions: [{ Key: 'edge/code.zip', VersionId: 'owned-version' }] }; }
      return {};
    }
    if (service === 's3api' && operation === 'delete-objects') return {};
    if (service === 's3api' && operation === 'delete-bucket') {
      if (value(args, '--bucket') === source.evidenceBucket) evidenceDeleted = true; else artifactsDeleted = true;
      return {};
    }
    if (service === 'logs' && operation === 'delete-log-group') return {};
    if (service === 'route53' && operation === 'list-resource-record-sets') return { ResourceRecordSets: source.validationRecords };
    if (service === 'route53' && operation === 'change-resource-record-sets') return {};
    throw new Error(`Unexpected test operation ${service} ${operation}`);
  };
  return { runner, calls };
}

test('inventory guard rejects another account, environment, replacement target and unrelated resources before AWS', async () => {
  for (const mutate of [
    (value) => { value.environment = 'testing'; },
    (value) => { value.prefix = 'logsofchange'; },
    (value) => { value.stacks.edge.arn = value.stacks.edge.arn.replace('123456789012', '999999999999'); },
    (value) => { value.accessTable.name = 'unrelated-table'; },
    (value) => { value.artifactBucket = 'another-project-artifacts'; },
    (value) => { value.logGroups = ['/another-project/production']; },
    (value) => { value.validationRecords[0].Name = '_record.lynxpardelle.com.'; },
  ]) {
    const source = sourceFixture(); mutate(source);
    let called = false;
    await assert.rejects(retireEmptyEnvironment(source, replacement(), { runAws: async () => { called = true; } }));
    assert.equal(called, false);
  }
  assert.throws(() => validateInventories(sourceFixture(), { ...replacement(), domain: 'logsofchange.lynxpardelle.com' }));
});

test('default plan verifies empty data and stable replacement using reads only', async () => {
  const source = sourceFixture(), fake = fakeAws(source);
  const report = await retireEmptyEnvironment(source, replacement(), { runAws: fake.runner });
  assert.equal(report.status, 'ready');
  assert.deepEqual(report.counts, { users: 0, accessRows: 0, releaseRows: 0, evidenceVersions: 0, evidenceDeleteMarkers: 0 });
  assert.ok(report.actions.length > 10);
  assert.ok(report.actions.every((entry) => entry.status === 'planned'));
  assert.ok(fake.calls.every((args) => ['get-caller-identity', 'describe-stacks', 'describe-user-pool', 'list-users', 'describe-table', 'scan', 'head-bucket', 'list-object-versions'].includes(args[1])));
});

test('any business data, active account mismatch or incomplete replacement aborts before destructive calls', async () => {
  for (const options of [{ users: [{}] }, { rowCount: 1 }, { evidenceVersions: [{ Key: 'customer-file', VersionId: 'v' }] }, { account: '999999999999' }, { incompleteReplacement: true }]) {
    const source = sourceFixture(), fake = fakeAws(source, options);
    await assert.rejects(retireEmptyEnvironment(source, replacement(), { apply: true, runAws: fake.runner }));
    assert.ok(fake.calls.every((args) => !/^(delete|update|change)-/.test(args[1])));
  }
});

test('apply retires only exact old resources in order and uses structured version and DNS deletes', async () => {
  const source = sourceFixture(), fake = fakeAws(source), progress = [];
  const report = await retireEmptyEnvironment(source, replacement(), { apply: true, runAws: fake.runner, writeProgress: async (value) => { progress.push(structuredClone(value)); } });
  assert.equal(report.status, 'retired');
  assert.ok(report.actions.every((entry) => entry.status === 'completed'));
  const stackDeletes = fake.calls.filter((args) => args[0] === 'cloudformation' && args[1] === 'delete-stack');
  assert.deepEqual(stackDeletes.map((args) => args[args.indexOf('--stack-name') + 1]), components.map((component) => source.stacks[component].arn));
  const tableUpdates = fake.calls.filter((args) => args[0] === 'dynamodb' && args[1] === 'update-table');
  assert.equal(tableUpdates.length, 1);
  assert.equal(tableUpdates[0][tableUpdates[0].indexOf('--table-name') + 1], source.releasesTable.name);
  for (const args of fake.calls.filter((value) => value[0] === 's3api')) assert.equal(args[args.indexOf('--expected-bucket-owner') + 1], source.accountId);
  const versionDelete = fake.calls.find((args) => args[1] === 'delete-objects');
  assert.deepEqual(JSON.parse(versionDelete[versionDelete.indexOf('--delete') + 1]), { Objects: [{ Key: 'edge/code.zip', VersionId: 'owned-version' }], Quiet: true });
  const dnsDelete = fake.calls.find((args) => args[1] === 'change-resource-record-sets');
  assert.deepEqual(JSON.parse(dnsDelete[dnsDelete.indexOf('--change-batch') + 1]), { Changes: [{ Action: 'DELETE', ResourceRecordSet: source.validationRecords[0] }] });
  assert.equal(progress.at(-1).status, 'retired');
});

test('mutation failure records progress and stops instead of deleting remaining resources', async () => {
  const source = sourceFixture(), fake = fakeAws(source, { failDeleteStack: true }), progress = [];
  await assert.rejects(retireEmptyEnvironment(source, replacement(), { apply: true, runAws: fake.runner, writeProgress: async (value) => { progress.push(structuredClone(value)); } }), (error) => error.report.status === 'failed');
  assert.equal(fake.calls.filter((args) => args[1] === 'delete-stack').length, 1);
  assert.equal(fake.calls.filter((args) => args[1] === 'delete-table').length, 0);
  assert.equal(progress.at(-1).actions[0].status, 'running');
});

test('CLI requires explicit inventories and never treats unknown or repeated options as approval', () => {
  assert.deepEqual(parseRetirementArguments(['--source=a.json', '--replacement=b.json']), { apply: false, source: 'a.json', replacement: 'b.json' });
  assert.equal(parseRetirementArguments(['--source=a.json', '--replacement=b.json', '--apply']).apply, true);
  for (const args of [[], ['--apply'], ['--source=a.json', '--replacement=b.json', '--apply=false'], ['--source=a.json', '--source=c.json', '--replacement=b.json']]) assert.throws(() => parseRetirementArguments(args));
});
