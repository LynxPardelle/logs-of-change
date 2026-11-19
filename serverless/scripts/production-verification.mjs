// Production canary guard and auditable source preparation. Importing is inert.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { readFile, realpath, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readEnvironment, writeEnvironmentOutputs } from './environment-status.mjs';

export const root = fileURLToPath(new URL('../../', import.meta.url));
export const directory = resolve(root, 'serverless/.deployment/production');
export const region = 'us-east-1';
export const origin = 'https://logsofchange.lynxpardelle.com';
export const sourcePaths = Object.freeze({ smoke: 'serverless/scripts/smoke.mjs', qa: 'serverless/scripts/qa-web.mjs', qaTarget: 'serverless/scripts/qa-web-target.mjs', product: 'serverless/scripts/smoke-product.mjs', cli: 'cli/logsofchange.mjs', guard: 'serverless/scripts/production-verification.mjs', runner: 'serverless/scripts/verify-production.mjs' });
const ignoredArtifacts = ['outputs.json', 'smoke-production.mjs', 'qa-production.mjs', 'verification-context.json', 'verification-source-transformations.json'].map(name => `serverless/.deployment/production/${name}`);
const normalize = source => { assert.equal(typeof source, 'string', 'Verification source must be UTF-8 text.'); return source.replaceAll('\r\n', '\n'); };
export const sha256 = source => createHash('sha256').update(normalize(source)).digest('hex');

export function parseVerificationArguments(args) {
  let mode = 'all', approved = false, modeSeen = false;
  for (const argument of args) {
    if (argument === '--approve-production=true' && !approved) approved = true;
    else if (/^--mode=(all|qa|smoke)$/.test(argument) && !modeSeen) { mode = argument.slice(7); modeSeen = true; }
    else throw new Error('Unsupported or repeated production verification argument. Restore is never permitted.');
  }
  if (!approved) throw new Error('Production verification requires explicit --approve-production=true.');
  return { mode, approved };
}

export function resolveQaTarget(value) {
  assert.ok(value === origin || value === `${origin}/`, 'Production verification requires its literal canonical origin.');
  return { base: new URL(value), environment: 'production' };
}

const tableTargets = snapshot => [
  [snapshot.identity.AccessTableName, snapshot.identity.AccessTableArn, /^logsofchange-production-identity-AccessTable-[A-Za-z0-9]+$/],
  [snapshot.releases.ReleasesTableName, snapshot.releases.ReleasesTableArn, /^logsofchange-production-releases-ReleasesTable-[A-Za-z0-9]+$/],
  [snapshot.publications.AdminTableName, snapshot.publications.AdminTableArn, /^logsofchange-production-publications-AdminTable-[A-Za-z0-9]+$/],
  [snapshot.publications.PublicTableName, snapshot.publications.PublicTableArn, /^logsofchange-production-publications-PublicTable-[A-Za-z0-9]+$/],
];

export function validateProductionSnapshot(snapshot, account) {
  assert.match(account, /^\d{12}$/, 'Unexpected AWS account identity.');
  assert.equal(snapshot.environment, 'production'); assert.equal(snapshot.region, region); assert.equal(snapshot.domain, 'logsofchange.lynxpardelle.com');
  assert.equal(snapshot.edge.PublicUrl, origin); assert.equal(snapshot.edge.HealthUrl, `${origin}/api/v1/health`);
  for (const service of ['identity', 'releases', 'evidence', 'publications', 'edge']) assert.equal(snapshot.stackNames[service], `logsofchange-production-${service}`);
  for (const [name, arn, pattern] of tableTargets(snapshot)) {
    assert.equal(typeof name, 'string'); assert.match(name, pattern, 'Unexpected production table namespace.');
    assert.equal(arn, `arn:aws:dynamodb:${region}:${account}:table/${name}`, 'Unexpected table account or region.');
  }
  assert.equal(new Set(tableTargets(snapshot).map(([name]) => name)).size, 4);
  assert.match(snapshot.identity.UserPoolId, /^us-east-1_[A-Za-z0-9]+$/); assert.match(snapshot.identity.UserPoolClientId, /^[a-z0-9]+$/);
  assert.equal(snapshot.identity.Issuer, `https://cognito-idp.${region}.amazonaws.com/${snapshot.identity.UserPoolId}`);
  assert.equal(snapshot.identity.AuthDomain, `https://logsofchange-production-${account}.auth.${region}.amazoncognito.com`);
  return snapshot;
}

export async function runReadOnly(command, args) {
  return new Promise((accept, reject) => {
    const child = spawn(command, args, { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, AWS_PAGER: '' } });
    let output = '';
    child.stdout.on('data', chunk => { output += chunk; });
    child.stderr.on('data', () => {});
    child.on('error', () => reject(new Error(`Cannot start read-only ${command} verification.`)));
    child.on('exit', code => code === 0 ? accept(output) : reject(new Error(`Read-only ${command} verification failed (${code}); sensitive diagnostics were not printed.`)));
  });
}

async function verifyCheckout(runner) {
  assert.equal((await runner('git', ['branch', '--show-current'])).trim(), 'main', 'Production verification requires branch main.');
  assert.equal((await runner('git', ['status', '--porcelain'])).trim(), '', 'Production verification requires a clean checkout.');
  const revisions = (await runner('git', ['rev-parse', 'HEAD', 'refs/heads/main', 'refs/remotes/origin/main'])).trim().split(/\r?\n/);
  assert.equal(revisions.length, 3); assert.match(revisions[0], /^[a-f0-9]{40}$/);
  assert.ok(revisions.every(value => value === revisions[0]), 'main must match the fetched origin/main reference.');
  return revisions[0];
}

export async function productionPreflight({ args = process.argv.slice(2), runner = runReadOnly, requestedMode, artifactUrl,
  readSource = path => readFile(resolve(root, path), 'utf8'), readArtifact = path => readFile(path, 'utf8'), readEnv = readEnvironment, writeOutputs = writeEnvironmentOutputs } = {}) {
  const options = parseVerificationArguments(args);
  if (requestedMode && options.mode !== 'all' && options.mode !== requestedMode) throw new Error('Production verification mode does not match this runner.');
  const codeCommit = await verifyCheckout(runner);
  const sources = {};
  for (const [name, path] of Object.entries(sourcePaths)) {
    const source = normalize(await readSource(path));
    const committed = normalize(await runner('git', ['show', `HEAD:${path}`]));
    assert.equal(sha256(source), sha256(committed), `The ${name} verification source does not match tracked HEAD.`);
    sources[name] = source;
  }
  const prepared = buildProductionSources(sources);
  const ignored = (await runner('git', ['check-ignore', '--', ...ignoredArtifacts])).trim().split(/\r?\n/);
  assert.ok(ignoredArtifacts.every(path => ignored.includes(path)), 'Production verification artifacts must remain ignored by Git.');
  if (artifactUrl !== undefined) {
    assert.ok(['qa', 'smoke'].includes(requestedMode), 'A generated runner requires its exact mode.');
    const expectedPath = resolve(directory, `${requestedMode}-production.mjs`);
    assert.equal(artifactUrl, pathToFileURL(expectedPath).href, 'Unexpected generated verification location.');
    assert.equal(sha256(await readArtifact(expectedPath)), prepared.outputHashes[requestedMode], 'Generated verification source is stale or modified.');
  }
  const aws = async commands => JSON.parse(await runner('aws', [...commands, '--region', region, '--output', 'json']));
  const caller = await aws(['sts', 'get-caller-identity', '--query', '{account:Account}']);
  const account = caller.account;
  assert.match(account, /^\d{12}$/, 'Unexpected AWS account identity.');
  const snapshot = validateProductionSnapshot(await readEnv('production', { runAws: commands => runner('aws', commands) }), account);
  const artifacts = await aws(['cloudformation', 'describe-stacks', '--stack-name', 'logsofchange-production-artifacts', '--query', 'Stacks[].{name:StackName,status:StackStatus,arn:StackId}']);
  assert.equal(artifacts.length, 1); assert.equal(artifacts[0].name, 'logsofchange-production-artifacts');
  assert.ok(['CREATE_COMPLETE', 'UPDATE_COMPLETE', 'UPDATE_ROLLBACK_COMPLETE'].includes(artifacts[0].status));
  assert.ok(artifacts[0].arn.startsWith(`arn:aws:cloudformation:${region}:${account}:stack/logsofchange-production-artifacts/`));
  const pool = await aws(['cognito-idp', 'describe-user-pool', '--user-pool-id', snapshot.identity.UserPoolId, '--query', '{id:UserPool.Id,name:UserPool.Name,arn:UserPool.Arn}']);
  assert.equal(pool.id, snapshot.identity.UserPoolId); assert.equal(pool.name, 'logsofchange-production');
  assert.equal(pool.arn, `arn:aws:cognito-idp:${region}:${account}:userpool/${pool.id}`);
  const client = await aws(['cognito-idp', 'describe-user-pool-client', '--user-pool-id', pool.id, '--client-id', snapshot.identity.UserPoolClientId, '--query', "{id:UserPoolClient.ClientId,pool:UserPoolClient.UserPoolId,name:UserPoolClient.ClientName,hasSecret:contains(keys(UserPoolClient), 'ClientSecret'),enabled:UserPoolClient.AllowedOAuthFlowsUserPoolClient,flows:UserPoolClient.AllowedOAuthFlows,scopes:UserPoolClient.AllowedOAuthScopes,callbacks:UserPoolClient.CallbackURLs,logout:UserPoolClient.LogoutURLs}"]);
  assert.equal(client.id, snapshot.identity.UserPoolClientId); assert.equal(client.pool, pool.id); assert.equal(client.name, 'logsofchange-production-web');
  assert.equal(client.hasSecret, false); assert.equal(client.enabled, true); assert.deepEqual(client.flows, ['code']); assert.ok(client.scopes.includes('openid'));
  assert.deepEqual(client.callbacks, [`${origin}/auth/callback`]); assert.deepEqual(client.logout, [`${origin}/`]);
  for (const [name, arn] of tableTargets(snapshot)) {
    const table = await aws(['dynamodb', 'describe-table', '--table-name', name, '--query', '{name:Table.TableName,arn:Table.TableArn,status:Table.TableStatus}']);
    assert.equal(table.name, name); assert.equal(table.arn, arn); assert.equal(table.status, 'ACTIVE');
  }
  assert.equal(await verifyCheckout(runner), codeCommit, 'Checkout changed during production preflight.');
  await writeOutputs(snapshot);
  return { checkedAt: new Date().toISOString(), environment: 'production', origin, region, account, codeCommit, sourceHashes: prepared.sourceHashes,
    restorePermitted: false, syntheticScope: 'random UUID tenant, four SUPPRESS users and UUID-derived product partitions only', options, sources };
}

function replaceOnce(source, before, after) {
  assert.equal(source.split(before).length, 2, 'Expected exactly one audited production source transformation.');
  return source.replace(before, after);
}

export function buildProductionSources(input) {
  const sources = Object.fromEntries(Object.entries(input).map(([key, value]) => [key, normalize(value)]));
  let { smoke, qa } = sources; const changes = [];
  const change = (kind, before, after) => { if (kind === 'smoke') smoke = replaceOnce(smoke, before, after); else qa = replaceOnce(qa, before, after); changes.push({ kind, before, after }); };
  change('smoke', "import { verifyActa } from '../src/evidence/index.mjs';", "import { verifyActa } from '../../src/evidence/index.mjs';");
  change('smoke', "from './smoke-product.mjs'", "from '../../scripts/smoke-product.mjs'");
  change('smoke', "const environment = process.argv.find((value) => value.startsWith('--environment='))?.split('=')[1] ?? 'development';\nif (!['development', 'testing'].includes(environment)) throw new Error('Synthetic smoke is restricted to development or testing.');\nconst restoreRequested = process.argv.includes('--restore=true');\nif (restoreRequested && environment !== 'development') throw new Error('Synthetic restore validation is restricted to development.');", "const environment = 'production';\nconst restoreRequested = false;");
  change('smoke', "const root = fileURLToPath(new URL('../../', import.meta.url));", "const root = fileURLToPath(new URL('../../../', import.meta.url));");
  change('smoke', "const reportName = process.argv.find((value) => value.startsWith('--report-name='))?.split('=')[1] || 'smoke-report.json';", "const reportName = 'logsofchange-smoke-report.json';");
  change('smoke', "const expectedDomain = environment === 'development' ? 'dev.logsofchange.lynxpardelle.com' : 'test.logsofchange.lynxpardelle.com';", "const expectedDomain = 'logsofchange.lynxpardelle.com';");
  change('smoke', 'syntheticRunId: runId, startedAt:', 'syntheticRunId: runId, codeCommit: productionVerification.codeCommit, startedAt:');
  change('qa', "import { resolveQaTarget } from './qa-web-target.mjs';", "import { resolveQaTarget } from '../../scripts/production-verification.mjs';");
  change('qa', "const serviceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');", "const serviceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');");
  change('qa', 'const { base, environment } = resolveQaTarget(process.argv[2]);', `const { base, environment } = resolveQaTarget('${origin}');`);
  change('qa', 'const report = { origin: base.origin, environment, checkedAt:', 'const report = { origin: base.origin, environment, codeCommit: productionVerification.codeCommit, checkedAt:');
  const prefix = mode => `import { productionPreflight } from '../../scripts/production-verification.mjs';\nconst productionVerification = await productionPreflight({ requestedMode: '${mode}', artifactUrl: import.meta.url });\n`;
  smoke = prefix('smoke') + smoke; qa = prefix('qa') + qa;
  return { smoke, qa, changes, sourceHashes: Object.fromEntries(Object.entries(sources).map(([key, value]) => [key, sha256(value)])), outputHashes: { smoke: sha256(smoke), qa: sha256(qa) } };
}

export async function writeVerificationArtifacts(context, prepared) {
  assert.equal(await realpath(dirname(directory)), dirname(directory), 'Refusing a redirected deployment directory.');
  assert.equal(await realpath(directory), directory, 'Refusing a redirected production directory.');
  const write = async (name, content) => {
    const target = resolve(directory, name);
    assert.equal(dirname(target), directory);
    const temporary = resolve(directory, `.verification-${randomUUID()}.tmp`);
    try { await writeFile(temporary, content, { flag: 'wx', mode: 0o600 }); await rename(temporary, target); }
    finally { await rm(temporary, { force: true }); }
  };
  const { sources, ...publicContext } = context;
  await write('smoke-production.mjs', prepared.smoke); await write('qa-production.mjs', prepared.qa);
  await write('verification-context.json', JSON.stringify(publicContext, null, 2) + '\n');
  await write('verification-source-transformations.json', JSON.stringify({ codeCommit: context.codeCommit, sourceHashes: prepared.sourceHashes, outputHashes: prepared.outputHashes, changes: prepared.changes }, null, 2) + '\n');
}
