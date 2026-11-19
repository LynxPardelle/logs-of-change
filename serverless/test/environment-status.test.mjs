import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, readFile, readdir, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { parseArguments, readEnvironment, writeEnvironmentOutputs } from '../scripts/environment-status.mjs';
import { assertDeploymentBranch, deployEnvironment, parseDeployArguments } from '../scripts/deploy.mjs';

const fixture = (environment = 'development') => {
  const domain = ({ development: 'dev.logsofchange.lynxpardelle.com', testing: 'test.logsofchange.lynxpardelle.com', production: 'logsofchange.lynxpardelle.com' })[environment];
  return {
    identity: { UserPoolId: 'us-east-1_example', UserPoolClientId: 'client123', Issuer: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_example', AuthDomain: `https://logsofchange-${environment}-123456789012.auth.us-east-1.amazoncognito.com`, AccessTableName: 'access', AccessTableArn: 'arn:aws:dynamodb:us-east-1:123456789012:table/access', ApiEndpoint: 'https://identity.execute-api.us-east-1.amazonaws.com', ApiDomainName: 'identity.execute-api.us-east-1.amazonaws.com' },
    releases: { ApiEndpoint: 'https://releases.execute-api.us-east-1.amazonaws.com', ApiDomainName: 'releases.execute-api.us-east-1.amazonaws.com', ReleasesTableName: 'releases', ReleasesTableArn: 'arn:aws:dynamodb:us-east-1:123456789012:table/releases', EvidenceBucketName: 'evidence' },
    evidence: { ApiEndpoint: 'https://evidence.execute-api.us-east-1.amazonaws.com', ApiDomainName: 'evidence.execute-api.us-east-1.amazonaws.com' },
    edge: { PublicUrl: `https://${domain}`, HealthUrl: `https://${domain}/api/v1/health`, DistributionId: 'EEXAMPLE', FrontendFunctionName: 'frontend' },
  };
};

function runnerFor(values, calls = [], environment = 'development') {
  return async (args) => {
    calls.push(args);
    const stackName = args[args.indexOf('--stack-name') + 1];
    const service = stackName.split('-').at(-1);
    return JSON.stringify({ Stacks: [{ StackName: `logsofchange-${environment}-${service}`, StackStatus: 'UPDATE_COMPLETE', Outputs: Object.entries(values[service]).map(([OutputKey, OutputValue]) => ({ OutputKey, OutputValue })) }] });
  };
}

test('CLI defaults to development and never treats unknown or invalid options as approval', () => {
  assert.deepEqual(parseArguments([]), { environment: 'development', writeOutputs: false });
  assert.deepEqual(parseArguments(['--environment=testing', '--write-outputs']), { environment: 'testing', writeOutputs: true });
  for (const args of [['--environment=prod'], ['--environment=../../other'], ['--apply'], ['--write-outputs=false'], ['--output=/tmp/elsewhere']]) {
    assert.throws(() => parseArguments(args));
  }
});

test('recovers a consistent public snapshot using only four read-only AWS calls', async () => {
  const values = fixture(); values.identity.FutureSecret = 'must-not-be-copied';
  const calls = [];
  const snapshot = await readEnvironment('development', { runAws: runnerFor(values, calls) });
  assert.equal(snapshot.domain, 'dev.logsofchange.lynxpardelle.com');
  assert.equal(snapshot.region, 'us-east-1');
  assert.deepEqual(snapshot.stackNames, { identity: 'logsofchange-development-identity', releases: 'logsofchange-development-releases', evidence: 'logsofchange-development-evidence', edge: 'logsofchange-development-edge' });
  assert.equal(snapshot.identity.UserPoolClientId, 'client123');
  assert.equal(snapshot.identity.FutureSecret, undefined);
  assert.equal(calls.length, 4);
  assert.deepEqual(calls.map((args) => args[args.indexOf('--stack-name') + 1]).sort(), ['edge', 'evidence', 'identity', 'releases'].map((service) => `logsofchange-development-${service}`).sort());
  for (const args of calls) {
    assert.deepEqual(args.slice(0, 2), ['cloudformation', 'describe-stacks']);
    assert.deepEqual(args.slice(-4), ['--region', 'us-east-1', '--output', 'json']);
  }
});

test('fails closed on missing outputs, foreign public hosts or incomplete stack state', async () => {
  const missing = fixture(); delete missing.identity.AccessTableName;
  await assert.rejects(readEnvironment('development', { runAws: runnerFor(missing) }), /AccessTableName/);
  const foreign = fixture(); foreign.edge.PublicUrl = 'https://attacker.example';
  await assert.rejects(readEnvironment('development', { runAws: runnerFor(foreign) }), /PublicUrl/);
  const credentialUrl = fixture(); credentialUrl.edge.PublicUrl = 'https://user:password@dev.logsofchange.lynxpardelle.com';
  await assert.rejects(readEnvironment('development', { runAws: runnerFor(credentialUrl) }), /PublicUrl/);
  await assert.rejects(readEnvironment('development', { runAws: async () => JSON.stringify({ Stacks: [{ StackName: 'wrong', StackStatus: 'UPDATE_IN_PROGRESS', Outputs: [] }] }) }), /stack/i);
});

test('production requires an explicit environment selection and has its own permitted host', async () => {
  const snapshot = await readEnvironment('production', { runAws: runnerFor(fixture('production'), [], 'production') });
  assert.equal(snapshot.domain, 'logsofchange.lynxpardelle.com');
  let queried = false;
  await assert.rejects(readEnvironment('invalid', { runAws: async () => { queried = true; } }), /environment/i);
  assert.equal(queried, false);
});

test('importing from another working directory does not invoke AWS or print a snapshot', () => {
  const moduleUrl = new URL('../scripts/environment-status.mjs', import.meta.url).href;
  const script = `await import(${JSON.stringify(moduleUrl)}); process.stdout.write('imported');`;
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], { cwd: tmpdir(), env: { ...process.env, PATH: '', Path: '' }, encoding: 'utf8' });
  assert.equal(result.status, 0);
  assert.equal(result.stdout, 'imported');
  assert.equal(result.stderr, '');
});

test('optional writer creates only the fixed ignored output path and rejects invalid snapshots', async () => {
  const root = await mkdtemp(join(tmpdir(), 'logs-of-change-status-'));
  try {
    const snapshot = await readEnvironment('development', { runAws: runnerFor(fixture()) });
    const output = await writeEnvironmentOutputs(snapshot, { serviceRoot: root });
    assert.equal(output, join(await realpath(root), '.deployment', 'development', 'outputs.json'));
    assert.deepEqual(JSON.parse(await readFile(output, 'utf8')), snapshot);
    assert.deepEqual(await readdir(dirname(output)), ['outputs.json']);
    await assert.rejects(writeEnvironmentOutputs({ ...snapshot, environment: '../outside' }, { serviceRoot: root }), /environment/i);
    await assert.rejects(writeEnvironmentOutputs({ ...snapshot, region: 'eu-west-1' }, { serviceRoot: root }), /region/i);
    await assert.rejects(writeEnvironmentOutputs({ ...snapshot, stackNames: { ...snapshot.stackNames, edge: 'other-project-edge' } }, { serviceRoot: root }), /stack names/i);
  } finally {
    const target = resolve(root);
    assert.ok(target.startsWith(resolve(tmpdir()) + sep) && basename(target).startsWith('logs-of-change-status-'));
    await rm(target, { recursive: true, force: true });
  }
});

test('deployment arguments reject unknown options, duplicate selectors and implicit production approval', () => {
  assert.deepEqual(parseDeployArguments([]), { environment: 'development', service: 'all', approveProduction: false });
  assert.deepEqual(parseDeployArguments(['--environment=production', '--approve-production=true', '--service=edge']), { environment: 'production', service: 'edge', approveProduction: true });
  for (const args of [['--environment=prod'], ['--service=unknown'], ['--region=eu-west-1'], ['--approve-production=false'], ['--environment=development', '--environment=testing'], ['--hosted-zone-id=../unsafe']]) {
    assert.throws(() => parseDeployArguments(args));
  }
});

test('deployments enforce development to testing to main before local or AWS mutations', async () => {
  assert.doesNotThrow(() => assertDeploymentBranch('development', 'development'));
  assert.doesNotThrow(() => assertDeploymentBranch('testing', 'testing'));
  assert.doesNotThrow(() => assertDeploymentBranch('production', 'main', true));
  for (const [environment, branch, approval] of [['development', 'architecture/serverless-product-foundation', false], ['testing', 'development', false], ['production', 'testing', true], ['production', 'main', false]]) {
    const calls = [];
    await assert.rejects(deployEnvironment({ environment, approveProduction: approval }, { runner: async (command, args) => {
      calls.push([command, args]);
      if (command === 'git') return branch;
      throw new Error('AWS must not be called before branch validation.');
    } }), /requires|Production requires/);
    assert.deepEqual(calls, [['git', ['branch', '--show-current']]]);
  }
  let called = false;
  await assert.rejects(deployEnvironment({ environment: '../other' }, { runner: async () => { called = true; } }), /environment/i);
  assert.equal(called, false);
});
