import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';

const implementation = await import('../scripts/production-verification.mjs').catch(() => ({}));
const entrypoint = await import('../scripts/verify-production.mjs').catch(() => ({}));
const approved = ['--approve-production=true'];
const account = '123456789012';
const revision = 'a'.repeat(40);
const origin = 'https://logsofchange.lynxpardelle.com';

function snapshot() {
  const tables = { AccessTable: 'logsofchange-production-identity-AccessTable-ABC123', ReleasesTable: 'logsofchange-production-releases-ReleasesTable-XYZ123', AdminTable: 'logsofchange-production-publications-AdminTable-ADM123', PublicTable: 'logsofchange-production-publications-PublicTable-PUB123' };
  const value = { environment: 'production', region: 'us-east-1', domain: 'logsofchange.lynxpardelle.com',
    stackNames: Object.fromEntries(['identity', 'releases', 'evidence', 'publications', 'edge'].map(service => [service, `logsofchange-production-${service}`])),
    identity: { UserPoolId: 'us-east-1_example', UserPoolClientId: 'exampleclient', Issuer: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_example', AuthDomain: `https://logsofchange-production-${account}.auth.us-east-1.amazoncognito.com` },
    releases: {}, evidence: {}, publications: {}, edge: { PublicUrl: origin, HealthUrl: `${origin}/api/v1/health` } };
  for (const [key, table] of Object.entries(tables)) Object.assign(value[key === 'AccessTable' ? 'identity' : key === 'ReleasesTable' ? 'releases' : 'publications'], { [`${key}Name`]: table, [`${key}Arn`]: `arn:aws:dynamodb:us-east-1:${account}:table/${table}` });
  return value;
}
async function sources() {
  return Object.fromEntries(await Promise.all(Object.entries(implementation.sourcePaths).map(async ([name, path]) => [name, (await readFile(new URL(`../../${path}`, import.meta.url), 'utf8')).replaceAll('\r\n', '\n')])));
}
async function setup({ branch = 'main', dirty = false, remoteRevision = revision, selectedSnapshot = snapshot(), callerAccount = account, poolName = 'logsofchange-production', clientHasSecret = false } = {}) {
  assert.equal(typeof implementation.productionPreflight, 'function');
  const source = await sources(), calls = []; let writes = 0;
  const runner = async (command, args) => {
    calls.push({ command, args });
    if (command === 'git') {
      if (args[0] === 'branch') return branch;
      if (args[0] === 'status') return dirty ? ' M tracked-file' : '';
      if (args[0] === 'rev-parse') return args.length === 2 ? revision : [revision, revision, remoteRevision].join('\n');
      if (args[0] === 'show') { const path = args[1].slice('HEAD:'.length); return source[Object.keys(implementation.sourcePaths).find(key => implementation.sourcePaths[key] === path)]; }
      if (args[0] === 'check-ignore') return args.slice(args.indexOf('--') + 1).join('\n');
      throw new Error('Unexpected synthetic Git read.');
    }
    assert.equal(command, 'aws'); assert.ok(args.includes('--query'), 'Preflight CLI responses must be projected before reaching Node.');
    if (args[0] === 'sts') return JSON.stringify({ account: callerAccount });
    if (args[0] === 'cloudformation') return JSON.stringify([{ name: 'logsofchange-production-artifacts', status: 'CREATE_COMPLETE', arn: `arn:aws:cloudformation:us-east-1:${account}:stack/logsofchange-production-artifacts/synthetic` }]);
    if (args[1] === 'describe-user-pool') return JSON.stringify({ id: 'us-east-1_example', name: poolName, arn: `arn:aws:cognito-idp:us-east-1:${account}:userpool/us-east-1_example` });
    if (args[1] === 'describe-user-pool-client') return JSON.stringify({ id: 'exampleclient', pool: 'us-east-1_example', name: 'logsofchange-production-web', hasSecret: clientHasSecret, enabled: true, flows: ['code'], scopes: ['openid', 'email', 'profile'], callbacks: [`${origin}/auth/callback`], logout: [`${origin}/`] });
    if (args[1] === 'describe-table') { const name = args[args.indexOf('--table-name') + 1]; return JSON.stringify({ name, arn: `arn:aws:dynamodb:us-east-1:${account}:table/${name}`, status: 'ACTIVE' }); }
    throw new Error('Unexpected synthetic AWS read.');
  };
  return { calls, source, writes: () => writes, dependencies: { runner, readSource: async path => source[Object.keys(implementation.sourcePaths).find(key => implementation.sourcePaths[key] === path)], readEnv: async environment => { calls.push({ environmentRead: environment }); return selectedSnapshot; }, writeOutputs: async () => { writes++; } } };
}

test('production verification requires explicit approval and rejects restore, unknown and duplicate selectors before any tool call', async () => {
  assert.equal(typeof implementation.parseVerificationArguments, 'function');
  assert.deepEqual(implementation.parseVerificationArguments(approved), { mode: 'all', approved: true });
  assert.deepEqual(implementation.parseVerificationArguments(['--mode=qa', ...approved]), { mode: 'qa', approved: true });
  for (const args of [[], ['--approve-production=false'], [...approved, ...approved], [...approved, '--restore=true'], [...approved, '--restore=false'], [...approved, '--environment=production'], [...approved, '--mode=bad'], [...approved, '--mode=qa', '--mode=smoke']]) {
    const { calls, dependencies } = await setup();
    await assert.rejects(implementation.productionPreflight({ ...dependencies, args })); assert.equal(calls.length, 0);
  }
});

test('production verification rejects non-main, dirty and nonmatching remote checkout before AWS', async () => {
  for (const options of [{ branch: 'testing' }, { dirty: true }, { remoteRevision: 'b'.repeat(40) }]) {
    const { calls, dependencies, writes } = await setup(options);
    await assert.rejects(implementation.productionPreflight({ ...dependencies, args: approved }));
    assert.equal(calls.some(call => call.command === 'aws' || call.environmentRead), false); assert.equal(writes(), 0);
  }
});

test('production scope is account-portable and rejects a foreign table, environment, namespace or origin', () => {
  assert.equal(typeof implementation.validateProductionSnapshot, 'function');
  implementation.validateProductionSnapshot(snapshot(), account);
  for (const mutate of [value => { value.environment = 'testing'; }, value => { value.region = 'us-west-2'; }, value => { value.publications.PublicTableArn = value.publications.PublicTableArn.replace(account, '999999999999'); }, value => { value.publications.AdminTableName = value.releases.ReleasesTableName; }, value => { value.identity.AccessTableName = 'logsofchange-testing-identity-AccessTable-ABC123'; }, value => { value.edge.PublicUrl = `${origin}:443`; }, value => { value.edge.PublicUrl = `https://user:password@logsofchange.lynxpardelle.com`; }]) { const value = snapshot(); mutate(value); assert.throws(() => implementation.validateProductionSnapshot(value, account)); }
});

test('fresh CF, STS, pool, client and four active table reads precede rechecked Git and output writes', async () => {
  const { calls, dependencies, writes } = await setup();
  const result = await implementation.productionPreflight({ ...dependencies, args: approved });
  assert.equal(result.codeCommit, revision); assert.equal(result.account, account); assert.equal(writes(), 1);
  assert.equal(calls.filter(call => call.environmentRead === 'production').length, 1);
  const aws = calls.filter(call => call.command === 'aws');
  assert.equal(aws.filter(call => call.args[1] === 'describe-table').length, 4);
  const query = aws.find(call => call.args[1] === 'describe-user-pool-client').args;
  const projection = query[query.indexOf('--query') + 1];
  assert.ok(projection.includes("hasSecret:contains(keys(UserPoolClient), 'ClientSecret')")); assert.ok(!projection.includes('secret:UserPoolClient.ClientSecret'));
  assert.deepEqual(calls.filter(call => call.command === 'git').at(-1).args, ['rev-parse', 'HEAD', 'refs/heads/main', 'refs/remotes/origin/main']);
  for (const options of [{ callerAccount: '999999999999' }, { poolName: 'logsofchange-testing' }, { clientHasSecret: true }]) { const value = await setup(options); await assert.rejects(implementation.productionPreflight({ ...value.dependencies, args: approved })); assert.equal(value.writes(), 0); }
});

test('sources must match tracked HEAD before AWS and exact-once transforms preserve product hook and cleanup', async () => {
  const { source, dependencies, calls } = await setup();
  await assert.rejects(implementation.productionPreflight({ ...dependencies, args: approved, readSource: async path => `${await dependencies.readSource(path)}\n// uncommitted` }));
  assert.equal(calls.some(call => call.command === 'aws'), false);
  const transformed = implementation.buildProductionSources(source);
  assert.ok(transformed.smoke.startsWith("import { productionPreflight } from '../../scripts/production-verification.mjs';"));
  assert.match(transformed.smoke, /artifactUrl: import\.meta\.url/);
  assert.ok(transformed.smoke.includes("from '../../scripts/smoke-product.mjs'"));
  assert.ok(transformed.smoke.includes("from '../../src/evidence/index.mjs'"));
  assert.ok(transformed.smoke.includes("new URL('../../../', import.meta.url)"));
  assert.ok(transformed.smoke.includes('const restoreRequested = false;')); assert.ok(transformed.smoke.includes('await cleanup();')); assert.ok(transformed.smoke.includes('await runProductSmoke('));
  assert.ok(transformed.qa.includes("resolveQaTarget('https://logsofchange.lynxpardelle.com')"));
  assert.equal(transformed.changes.length, 11); assert.equal(Object.keys(transformed.sourceHashes).length, Object.keys(implementation.sourcePaths).length);
  assert.throws(() => implementation.buildProductionSources({ ...source, smoke: source.smoke.replace("from './smoke-product.mjs'", "from './renamed.mjs'") }));
  assert.throws(() => implementation.buildProductionSources({ ...source, qa: `${source.qa}\nconst { base, environment } = resolveQaTarget(process.argv[2]);` }));
});

test('all mode runs QA before smoke and a failed QA never starts the synthetic approval', async () => {
  assert.equal(typeof entrypoint.verifyProduction, 'function'); const source = await sources();
  for (const failed of [false, true]) {
    const stages = [];
    const operation = entrypoint.verifyProduction(approved, { preflight: async () => ({ codeCommit: revision, account, sources: source }), writeArtifacts: async () => { stages.push('write'); }, runModule: async path => { stages.push(path.endsWith('qa-production.mjs') ? 'qa' : 'smoke'); }, exitCode: () => failed ? 1 : 0 });
    if (failed) { await assert.rejects(operation, /QA/); assert.deepEqual(stages, ['write', 'qa']); }
    else { await operation; assert.deepEqual(stages, ['write', 'qa', 'smoke']); }
  }
});

test('importing either production module from another working directory has no CLI side effects', async () => {
  assert.equal(typeof entrypoint.verifyProduction, 'function');
  const entry = new URL('../scripts/verify-production.mjs', import.meta.url).href;
  const helper = new URL('../scripts/production-verification.mjs', import.meta.url).href;
  const result = await promisify(execFile)(process.execPath, ['--input-type=module', '--eval', `await import(${JSON.stringify(entry)}); await import(${JSON.stringify(helper)});`], { cwd: tmpdir(), windowsHide: true });
  assert.equal(result.stdout, ''); assert.equal(result.stderr, '');
});

test('a direct generated copy still requires matching mode, fresh tracked source and its own exact hash', async () => {
  const mismatch = await setup();
  await assert.rejects(implementation.productionPreflight({ ...mismatch.dependencies, args: [...approved, '--mode=qa'], requestedMode: 'smoke' })); assert.equal(mismatch.calls.length, 0);
  const tampered = await setup(); const prepared = implementation.buildProductionSources(tampered.source);
  const artifactUrl = new URL('../.deployment/production/smoke-production.mjs', import.meta.url).href;
  await assert.rejects(implementation.productionPreflight({ ...tampered.dependencies, args: approved, requestedMode: 'smoke', artifactUrl, readArtifact: async () => `${prepared.smoke}\n// changed` }), /stale or modified/);
  assert.equal(tampered.calls.some(call => call.command === 'aws'), false); assert.equal(tampered.writes(), 0);
  const valid = await setup();
  const result = await implementation.productionPreflight({ ...valid.dependencies, args: approved, requestedMode: 'smoke', artifactUrl, readArtifact: async () => prepared.smoke });
  assert.equal(result.codeCommit, revision); assert.equal(valid.writes(), 1);
});

test('a branch change during AWS discovery prevents every output write', async () => {
  const value = await setup(); let branchReads = 0;
  const runner = async (command, args) => command === 'git' && args[0] === 'branch' && ++branchReads === 2 ? 'testing' : value.dependencies.runner(command, args);
  await assert.rejects(implementation.productionPreflight({ ...value.dependencies, runner, args: approved }));
  assert.ok(value.calls.some(call => call.command === 'aws')); assert.equal(value.writes(), 0);
});

test('generated paths already tracked by Git are never treated as ignored writable artifacts', async () => {
  const value = await setup();
  const runner = async (command, args) => {
    if (command === 'git' && args[0] === 'check-ignore') {
      const paths = args.slice(args.indexOf('--') + 1);
      // git check-ignore respects tracked files unless --no-index is supplied.
      return (args.includes('--no-index') ? paths : paths.slice(1)).join('\n');
    }
    return value.dependencies.runner(command, args);
  };
  await assert.rejects(implementation.productionPreflight({ ...value.dependencies, runner, args: approved }));
  assert.equal(value.calls.some(call => call.command === 'aws'), false); assert.equal(value.writes(), 0);
});

test('malformed STS identity stops before CloudFormation discovery', async () => {
  const value = await setup({ callerAccount: 'invalid' });
  await assert.rejects(implementation.productionPreflight({ ...value.dependencies, args: approved }));
  assert.equal(value.calls.some(call => call.environmentRead), false); assert.equal(value.writes(), 0);
});
