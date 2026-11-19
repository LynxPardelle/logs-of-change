// Synthetic development smoke. Credentials and OAuth tokens exist only in this process.
import assert from 'node:assert/strict';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { CognitoIdentityProviderClient, AdminCreateUserCommand, AdminSetUserPasswordCommand, AdminDeleteUserCommand } from '@aws-sdk/client-cognito-identity-provider';
import { DynamoDBClient, CreateBackupCommand, DescribeBackupCommand, RestoreTableFromBackupCommand, DescribeTableCommand, DeleteTableCommand, DeleteBackupCommand,
  UpdateTableCommand, waitUntilTableExists, waitUntilTableNotExists } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand, DeleteCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { chromium } from 'playwright';
import { verifyActa } from '../src/evidence/index.mjs';
import { validateProductSmokeScope, runProductSmoke, cleanupProductSmoke } from './smoke-product.mjs';

const environment = process.argv.find((value) => value.startsWith('--environment='))?.split('=')[1] ?? 'development';
if (!['development', 'testing'].includes(environment)) throw new Error('Synthetic smoke is restricted to development or testing.');
const restoreRequested = process.argv.includes('--restore=true');
if (restoreRequested && environment !== 'development') throw new Error('Synthetic restore validation is restricted to development.');
const root = fileURLToPath(new URL('../../', import.meta.url));
const directory = resolve(root, 'serverless/.deployment', environment);
const reportName = process.argv.find((value) => value.startsWith('--report-name='))?.split('=')[1] || 'smoke-report.json';
if (!/^[a-z0-9-]+\.json$/.test(reportName)) throw new Error('Invalid sanitized report filename.');
const deployment = JSON.parse(await readFile(resolve(directory, 'outputs.json'), 'utf8'));
if (deployment.environment !== environment) throw new Error('Deployment environment does not match the requested smoke.');
const origin = deployment.edge.PublicUrl.replace(/\/$/, '');
const expectedDomain = environment === 'development' ? 'dev.logsofchange.lynxpardelle.com' : 'test.logsofchange.lynxpardelle.com';
if (new URL(origin).hostname !== expectedDomain || new URL(origin).protocol !== 'https:') throw new Error('Smoke origin is not the isolated Logs of Change environment.');
const { UserPoolId: poolId, UserPoolClientId: clientId, AccessTableName: accessTable } = deployment.identity;
const releasesTable = deployment.releases.ReleasesTableName;
// Local outputs are public configuration, but a smoke must still never point
// its synthetic cleanup at a table from another environment or deployment.
const sourceTable = /^arn:aws:dynamodb:us-east-1:(\d{12}):table\/(.+)$/.exec(deployment.releases.ReleasesTableArn || '');
assert.ok(sourceTable && sourceTable[2] === releasesTable && releasesTable.startsWith(`logsofchange-${environment}-`), 'Unexpected release table scope.');
assert.equal(deployment.identity.AccessTableArn, `arn:aws:dynamodb:us-east-1:${sourceTable[1]}:table/${accessTable}`);
assert.ok(accessTable.startsWith(`logsofchange-${environment}-`), 'Unexpected access table scope.');
const region = 'us-east-1';
const cognito = new CognitoIdentityProviderClient({ region });
const dynamoClient = new DynamoDBClient({ region });
const dynamo = DynamoDBDocumentClient.from(dynamoClient);
const runId = randomUUID();
const orgId = `smoke-${runId}`;
const projectId = 'synthetic-pilot';
const tenantPK = `TENANT#${orgId}`;
const projectPK = `${tenantPK}#PROJECT#${projectId}`;
const productScope = validateProductSmokeScope(deployment, { runId, orgId, projectId, origin });
const base = `/api/v1/orgs/${orgId}/projects/${projectId}/releases`;
const users = [];
const report = { product: 'Logs of Change', environment, origin, syntheticRunId: runId, startedAt: new Date().toISOString(), status: 'running',
  checks: [], synthetic: true, cleanup: { deletedUsers: 0, deletedAccessRows: 0, deletedReleaseRows: 0, failures: [] } };
let browser;
let backupArn;
let restoredTableArn;
let restorationStarted = false;
const restoredTableName = `logsofchange-smoke-${runId}`;

function assertOwnRestoreTarget() {
  assert.equal(restoredTableName, `logsofchange-smoke-${runId}`);
  assert.notEqual(restoredTableName, releasesTable);
  assert.match(restoredTableName, /^logsofchange-smoke-[a-f0-9-]{36}$/);
  const expectedArn = `${deployment.releases.ReleasesTableArn.split(':table/')[0]}:table/${restoredTableName}`;
  if (restoredTableArn) assert.equal(restoredTableArn, expectedArn);
}

async function restoreAndVerify(releaseId, originalRevision, originalDecision) {
  assertOwnRestoreTarget();
  const result = await dynamoClient.send(new CreateBackupCommand({ TableName: releasesTable, BackupName: `logsofchange-smoke-${runId}` }));
  backupArn = result.BackupDetails?.BackupArn;
  assert.ok(backupArn?.startsWith(`${deployment.releases.ReleasesTableArn}/backup/`));
  let available = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    const description = await dynamoClient.send(new DescribeBackupCommand({ BackupArn: backupArn }));
    if (description.BackupDescription?.BackupDetails?.BackupStatus === 'AVAILABLE') { available = true; break; }
    await new Promise((accept) => setTimeout(accept, 5000));
  }
  assert.ok(available, 'Synthetic backup did not become available within the bounded wait.');
  console.log('Restoring the synthetic development backup into a new isolated table.');
  const restored = await dynamoClient.send(new RestoreTableFromBackupCommand({ BackupArn: backupArn, TargetTableName: restoredTableName, BillingModeOverride: 'PAY_PER_REQUEST' }));
  restorationStarted = true;
  restoredTableArn = restored.TableDescription?.TableArn;
  assertOwnRestoreTarget();
  await waitUntilTableExists({ client: dynamoClient, maxWaitTime: 1200, minDelay: 10, maxDelay: 20 }, { TableName: restoredTableName });
  const PK = `${projectPK}#RELEASE#${releaseId}`;
  const revision = (await dynamo.send(new GetCommand({ TableName: restoredTableName, Key: { PK, SK: 'REV#0000000002' }, ConsistentRead: true }))).Item?.data;
  const decision = (await dynamo.send(new GetCommand({ TableName: restoredTableName, Key: { PK, SK: 'DECISION#0000000002' }, ConsistentRead: true }))).Item?.data;
  assert.deepEqual(revision, originalRevision);
  assert.deepEqual(decision, originalDecision);
  assert.ok(verifyActa({ schema: 'logsofchange.acta.v1', orgId, projectId, releaseId, revision, decision }));
  report.restore = { performed: true, sourceUnmodified: true, acceptedRevisionRecovered: true, digestVerified: true };
}

function safeFailure(error) {
  // Avoid serializing SDK requests, browser traces, passwords, codes, or tokens.
  return { name: error?.name || 'Error', stage: report.currentStage || 'initialization', browserStep: report.browserStep, oauthStep: report.oauthStep, oauthHttpStatus: report.oauthHttpStatus, callback: report.callbackDiagnostic };
}

async function check(name, operation) {
  report.currentStage = name;
  await operation();
  report.checks.push({ name, status: 'passed' });
  console.log(`PASS ${name}`);
}

async function api(user, path, { method = 'GET', body, key, accepted = [200], rawToken } = {}) {
  const response = await fetch(`${origin}${path}`, { method, redirect: 'error', signal: AbortSignal.timeout(20000),
    headers: { ...(user?.tokens?.access_token || rawToken ? { authorization: `Bearer ${rawToken || user.tokens.access_token}` } : {}),
      ...(body !== undefined ? { 'content-type': 'application/json' } : {}), ...(key ? { 'idempotency-key': key } : {}) },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  assert.ok(accepted.includes(response.status), `Unexpected HTTP status ${response.status}; expected ${accepted.join('/')}.`);
  const result = await response.json();
  return { status: response.status, body: result, headers: response.headers };
}

async function putAccess(item) { await dynamo.send(new PutCommand({ TableName: accessTable, Item: item })); }
async function permission(user, role) {
  await putAccess({ PK: projectPK, SK: `PERMISSION#${user.sub}`, active: true, role });
}

async function createUser(label, role) {
  const username = `smoke-${runId}-${label}`;
  const password = `Aa9!${randomBytes(30).toString('base64url')}`;
  const created = await cognito.send(new AdminCreateUserCommand({ UserPoolId: poolId, Username: username, MessageAction: 'SUPPRESS',
    UserAttributes: [{ Name: 'email', Value: `${username}@example.invalid` }, { Name: 'email_verified', Value: 'true' }] }));
  const user = { label, username, password, sub: created.User?.Attributes?.find((attribute) => attribute.Name === 'sub')?.Value };
  users.push(user); // Register immediately so a later password/permission failure still cleans the user.
  assert.ok(user.sub, 'Cognito did not return a synthetic subject.');
  await cognito.send(new AdminSetUserPasswordCommand({ UserPoolId: poolId, Username: username, Password: password, Permanent: true }));
  if (role) {
    await putAccess({ PK: tenantPK, SK: `MEMBER#${user.sub}`, active: true, orgId, orgName: 'Synthetic smoke agency', actor: user.sub });
    await permission(user, role);
  }
  return user;
}

async function browserPath() {
  for (const candidate of [process.env.LOGSOFCHANGE_BROWSER_PATH, 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].filter(Boolean)) {
    try { await access(candidate); return candidate; } catch {}
  }
  throw new Error('Installed Chromium browser was not found. Set LOGSOFCHANGE_BROWSER_PATH to an installed browser.');
}

async function authenticate(user, config) {
  report.oauthStep = 'validate-public-configuration';
  const state = randomBytes(24).toString('base64url');
  const verifier = randomBytes(48).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  const authDomain = new URL(config.auth.domain);
  assert.equal(authDomain.protocol, 'https:');
  assert.ok(authDomain.hostname.endsWith('.amazoncognito.com'));
  assert.equal(config.auth.clientId, clientId);
  assert.equal(config.auth.redirectUri, `${origin}/auth/callback`);
  const authorize = new URL('/oauth2/authorize', authDomain);
  authorize.search = new URLSearchParams({ client_id: clientId, response_type: 'code', scope: 'openid email profile', redirect_uri: config.auth.redirectUri,
    code_challenge_method: 'S256', code_challenge: challenge, state }).toString();
  const context = await browser.newContext();
  const page = await context.newPage();
  let callback;
  const isCallback = (url) => url.origin === new URL(origin).origin && url.pathname === '/auth/callback';
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (request.isNavigationRequest() && isCallback(url)) callback = url;
  });
  await context.route(isCallback, async (route) => {
    callback = new URL(route.request().url());
    await route.fulfill({ status: 200, contentType: 'text/plain', body: 'Synthetic OAuth callback captured.' });
  });
  try {
    report.oauthStep = 'open-cognito-login';
    await page.goto(authorize.href, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.locator('input[name="username"]:visible').first().fill(user.username);
    await page.locator('input[name="password"]:visible').first().fill(user.password);
    report.oauthStep = 'submit-cognito-login';
    await Promise.all([
      page.waitForURL(isCallback, { timeout: 45000 }),
      page.locator('input[type="submit"]:visible, button[type="submit"]:visible').first().click(),
    ]);
    report.oauthStep = 'validate-authorization-callback';
    report.callbackDiagnostic = { user: user.label, captured: Boolean(callback), keys: callback ? [...callback.searchParams.keys()] : [], stateMatches: callback?.searchParams.get('state') === state, hasCode: Boolean(callback?.searchParams.get('code')), error: callback?.searchParams.get('error') };
    assert.ok(callback, 'OAuth callback was not captured.');
    assert.equal(callback.searchParams.get('state'), state);
    assert.ok(!callback.searchParams.has('error'), 'Cognito rejected the authorization request.');
    const code = callback.searchParams.get('code');
    assert.ok(code, 'OAuth callback did not contain an authorization code.');
    report.oauthStep = 'exchange-authorization-code';
    const response = await fetch(new URL('/oauth2/token', authDomain), { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(20000),
      headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'authorization_code', client_id: clientId,
        code, redirect_uri: config.auth.redirectUri, code_verifier: verifier }) });
    report.oauthHttpStatus = response.status;
    assert.equal(response.status, 200, 'OAuth token exchange failed.');
    user.tokens = await response.json();
    assert.ok(typeof user.tokens.access_token === 'string');
    report.oauthStep = 'validate-access-token-claims';
    const claims = JSON.parse(Buffer.from(user.tokens.access_token.split('.')[1], 'base64url').toString('utf8'));
    assert.equal(claims.sub, user.sub);
    assert.equal(claims.token_use, 'access');
    assert.ok(String(claims.scope).split(' ').includes('openid'));
    delete report.oauthStep; delete report.oauthHttpStatus; delete report.callbackDiagnostic;
  } finally { await context.close(); }
}

async function queryPartition(table, PK) {
  const items = [];
  let cursor;
  do {
    const result = await dynamo.send(new QueryCommand({ TableName: table, ConsistentRead: true, KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: { ':pk': PK }, ...(cursor ? { ExclusiveStartKey: cursor } : {}) }));
    items.push(...(result.Items ?? [])); cursor = result.LastEvaluatedKey;
  } while (cursor);
  return items;
}

async function openWebWorkspace(user) {
  report.browserStep = `login-${user.label}`;
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  try {
    await page.goto(origin, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Iniciar sesión', exact: false }).click();
    await page.locator('input[name="username"]:visible').first().fill(user.username);
    await page.locator('input[name="password"]:visible').first().fill(user.password);
    await page.locator('input[type="submit"]:visible, button[type="submit"]:visible').first().click();
    await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).waitFor({ timeout: 45000 });
    assert.equal(await page.locator('#project').inputValue(), `${orgId}/${projectId}`);
    return { context, page };
  } catch (error) { await context.close(); throw error; }
}

async function closeWebWorkspace({ context, page }) {
  try {
    await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
    await page.getByRole('button', { name: 'Iniciar sesión', exact: false }).waitFor({ timeout: 45000 });
  } finally { await context.close(); }
}

async function downloadWebActa(page, revision) {
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: /Descargar acta/ }).nth(revision - 1).click();
  const download = await downloaded;
  assert.match(download.suggestedFilename(), /^logsofchange-[A-Za-z0-9_-]+-r[1-9]\d*\.json$/);
  const file = await download.path();
  assert.ok(file, 'The browser did not produce the synthetic acta download.');
  const acta = JSON.parse(await readFile(file, 'utf8'));
  assert.ok(verifyActa(acta));
  assert.equal(acta.schema, 'logsofchange.acta.v1');
  assert.equal(acta.orgId, orgId); assert.equal(acta.projectId, projectId);
  assert.equal(acta.revision.number, revision);
  return acta;
}

async function checkWebWorkspace(editor, reviewer) {
  const title = 'Synthetic UI milestone';
  let uiReleaseId;
  let revisionOne;
  let editorWorkspace = await openWebWorkspace(editor);
  try {
    report.browserStep = 'editor-create-and-submit';
    const { page } = editorWorkspace;
    await page.getByRole('button', { name: /Nueva entrega/ }).click();
    await page.locator('#title').fill(title);
    await page.locator('#summary').fill('Created from the real Angular workspace with synthetic data.');
    await page.locator('#changes').fill('Synthetic browser form');
    const createdResponse = page.waitForResponse((response) => response.request().method() === 'POST' && new URL(response.url()).pathname === base);
    await page.getByRole('button', { name: 'Guardar borrador', exact: true }).click();
    const created = await createdResponse;
    assert.equal(created.status(), 201);
    uiReleaseId = (await created.json()).release.id;
    await page.getByText('Borrador guardado.', { exact: false }).waitFor();
    await page.getByRole('button', { name: /Presentar entrega/ }).click();
    await page.getByText('Entrega presentada.', { exact: false }).waitFor();
    assert.ok(await page.locator('.badge.pending_review').isVisible());
    const refreshStored = await page.evaluate(() => Object.entries(sessionStorage).some(([key, value]) => key.startsWith('logsofchange.user.') && Boolean(JSON.parse(value).refresh_token)));
    assert.equal(refreshStored, false);
    await page.screenshot({ path: resolve(directory, 'authenticated-workspace.png'), fullPage: true });
  } finally { await closeWebWorkspace(editorWorkspace); }

  let reviewWorkspace = await openWebWorkspace(reviewer);
  try {
    report.browserStep = 'reviewer-requests-changes-and-downloads-acta';
    const { page } = reviewWorkspace;
    await page.getByRole('button', { name: new RegExp(title) }).click();
    await page.locator('#reason').fill('Synthetic UI change requested.');
    await page.getByRole('button', { name: 'Pedir cambios', exact: true }).click();
    await page.getByText('Decisión registrada: cambios solicitados.', { exact: false }).waitFor();
    assert.ok(await page.locator('.badge.changes_requested').isVisible());
    revisionOne = await downloadWebActa(page, 1);
    assert.equal(revisionOne.decision.outcome, 'changes_requested');
    assert.equal(revisionOne.releaseId, uiReleaseId);
    await page.screenshot({ path: resolve(directory, 'reviewer-changes-requested.png'), fullPage: true });
  } finally { await closeWebWorkspace(reviewWorkspace); }

  editorWorkspace = await openWebWorkspace(editor);
  try {
    report.browserStep = 'editor-revises-and-resubmits';
    const { page } = editorWorkspace;
    await page.getByRole('button', { name: new RegExp(title) }).click();
    await page.getByRole('button', { name: /Crear nueva revisión/ }).click();
    await page.locator('#changes').fill('Synthetic browser change resolved.');
    await page.getByRole('button', { name: 'Guardar borrador', exact: true }).click();
    await page.getByText('Nueva revisión preparada.', { exact: false }).waitFor();
    await page.getByRole('button', { name: /Presentar entrega/ }).click();
    await page.getByText('Entrega presentada.', { exact: false }).waitFor();
    assert.ok(await page.locator('.badge.pending_review').isVisible());
  } finally { await closeWebWorkspace(editorWorkspace); }

  reviewWorkspace = await openWebWorkspace(reviewer);
  try {
    report.browserStep = 'reviewer-accepts-and-verifies-actas';
    const { page } = reviewWorkspace;
    await page.getByRole('button', { name: new RegExp(title) }).click();
    await page.locator('#reason').fill('Synthetic UI milestone accepted.');
    await page.getByRole('button', { name: /Aceptar entrega/ }).click();
    await page.getByText('Decisión registrada: entrega aceptada.', { exact: false }).waitFor();
    assert.ok(await page.locator('.badge.accepted').isVisible());
    const finalActa = await downloadWebActa(page, 2);
    assert.equal(finalActa.releaseId, uiReleaseId);
    assert.equal(finalActa.decision.outcome, 'accepted');
    assert.equal(finalActa.decision.actor, reviewer.sub);
    const previous = await downloadWebActa(page, 1);
    assert.deepEqual(previous.revision, revisionOne.revision);
    assert.deepEqual(previous.decision, revisionOne.decision);
    await page.screenshot({ path: resolve(directory, 'reviewer-accepted.png'), fullPage: true });
  } finally { await closeWebWorkspace(reviewWorkspace); }
  report.browserApproval = { created: true, submitted: true, changesRequested: true, revised: true, accepted: true, actaDownloadedAndVerified: true, priorEvidencePreserved: true };
  delete report.browserStep;
}

async function cleanup() {
  const removePartition = async (table, PK, countKey) => {
    // Every cleanup key is derived from this process's random synthetic tenant.
    assert.ok(PK === tenantPK || PK === projectPK || PK.startsWith(`${projectPK}#RELEASE#`));
    const items = await queryPartition(table, PK);
    for (const item of items) {
      assert.equal(item.PK, PK);
      await dynamo.send(new DeleteCommand({ TableName: table, Key: { PK, SK: item.SK } }));
      report.cleanup[countKey]++;
    }
    return items;
  };
  // Revoke all synthetic grants first, so remaining short-lived tokens lose application access.
  for (const PK of [projectPK, tenantPK]) {
    try { await removePartition(accessTable, PK, 'deletedAccessRows'); }
    catch (error) { report.cleanup.failures.push({ area: 'access', name: error.name }); }
  }
  await cleanupProductSmoke({ scope: productScope, dynamo, report });
  try {
    const projectItems = await queryPartition(releasesTable, projectPK);
    for (const item of projectItems.filter((entry) => entry.SK.startsWith('RELEASE#'))) {
      await removePartition(releasesTable, `${projectPK}#RELEASE#${item.SK.slice('RELEASE#'.length)}`, 'deletedReleaseRows');
    }
    await removePartition(releasesTable, projectPK, 'deletedReleaseRows');
  } catch (error) { report.cleanup.failures.push({ area: 'releases', name: error.name }); }
  for (const user of users) {
    try { await cognito.send(new AdminDeleteUserCommand({ UserPoolId: poolId, Username: user.username })); report.cleanup.deletedUsers++; }
    catch (error) { if (error.name !== 'UserNotFoundException') report.cleanup.failures.push({ area: 'synthetic-user', name: error.name }); }
    user.password = undefined; user.tokens = undefined;
  }
  if (restorationStarted) {
    try {
      assertOwnRestoreTarget();
      await waitUntilTableExists({ client: dynamoClient, maxWaitTime: 1200, minDelay: 10, maxDelay: 20 }, { TableName: restoredTableName });
      const restored = (await dynamoClient.send(new DescribeTableCommand({ TableName: restoredTableName }))).Table;
      restoredTableArn = restored.TableArn;
      assertOwnRestoreTarget();
      if (restored.DeletionProtectionEnabled) {
        await dynamoClient.send(new UpdateTableCommand({ TableName: restoredTableName, DeletionProtectionEnabled: false }));
      }
      await dynamoClient.send(new DeleteTableCommand({ TableName: restoredTableName }));
      await waitUntilTableNotExists({ client: dynamoClient, maxWaitTime: 600, minDelay: 5, maxDelay: 15 }, { TableName: restoredTableName });
      report.cleanup.deletedRestoreTable = true;
    } catch (error) {
      if (error.name === 'ResourceNotFoundException') report.cleanup.deletedRestoreTable = true;
      else report.cleanup.failures.push({ area: 'restore-table', name: error.name });
    }
  }
  if (backupArn) {
    try {
      assert.ok(backupArn.startsWith(`${deployment.releases.ReleasesTableArn}/backup/`));
      await dynamoClient.send(new DeleteBackupCommand({ BackupArn: backupArn }));
      report.cleanup.deletedBackup = true;
    } catch (error) { report.cleanup.failures.push({ area: 'synthetic-backup', name: error.name }); }
  }
  if (browser) { try { await browser.close(); } catch {} }
}

let failed;
try {
  let config;
  await check('public health, runtime configuration and unauthenticated protection', async () => {
    const health = await api(null, '/api/v1/health');
    assert.equal(health.body.service, 'logsofchange');
    assert.equal(health.headers.get('cache-control'), 'no-store');
    config = (await api(null, '/api/v1/config')).body;
    assert.equal(config.product, 'Logs of Change');
    assert.equal(config.environment, environment);
    await api(null, base, { accepted: [401] });
  });
  browser = await chromium.launch({ executablePath: await browserPath(), headless: true });
  await check('synthetic identities without email delivery and OAuth authorization code PKCE', async () => {
    await putAccess({ PK: tenantPK, SK: `PROJECT#${projectId}`, projectId, name: 'Synthetic approval pilot', active: true });
    const editor = await createUser('editor', 'editor');
    const reviewer = await createUser('reviewer', 'reviewer');
    const competitor = await createUser('competitor', 'reviewer');
    const outsider = await createUser('outsider');
    for (const user of [editor, reviewer, competitor, outsider]) await authenticate(user, config);
  });
  const [editor, reviewer, competitor, outsider] = users;
  await check('membership discovery is scoped to the authenticated subject', async () => {
    let found = false;
    for (let attempt = 0; attempt < 10; attempt++) {
      const me = (await api(editor, '/api/v1/identity/me')).body;
      assert.equal(me.sub, editor.sub);
      if (me.memberships.some((member) => member.orgId === orgId && member.projects.some((project) => project.projectId === projectId && project.role === 'editor'))) { found = true; break; }
      await new Promise((accept) => setTimeout(accept, 1000));
    }
    assert.ok(found, 'Synthetic membership was not discoverable after bounded GSI propagation wait.');
    assert.deepEqual((await api(outsider, '/api/v1/identity/me')).body.memberships, []);
  });
  await check('real Angular approval journey with change request, revision and downloaded actas', async () => {
    await checkWebWorkspace(editor, reviewer);
  });
  const draftBody = { title: 'Synthetic milestone', summary: 'Disposable acceptance check; no customer data.', changes: ['Synthetic accessible form'] };
  const createKey = randomUUID();
  let draft;
  await check('draft creation and exact idempotent replay through CloudFront', async () => {
    draft = (await api(editor, base, { method: 'POST', body: draftBody, key: createKey, accepted: [201] })).body;
    assert.equal(draft.release.status, 'draft');
    const replay = await api(editor, base, { method: 'POST', body: draftBody, key: createKey, accepted: [201] });
    assert.deepEqual(replay.body, draft);
    await api(editor, base, { method: 'POST', body: { ...draftBody, title: 'Different content' }, key: createKey, accepted: [409] });
  });
  const releaseId = draft.release.id;
  const resource = `${base}/${releaseId}`;
  await check('organization, project, outsider and identity-token isolation', async () => {
    await api(editor, `/api/v1/orgs/foreign-${runId}/projects/${projectId}/releases/${releaseId}`, { accepted: [403] });
    await api(editor, `/api/v1/orgs/${orgId}/projects/foreign/releases/${releaseId}`, { accepted: [403] });
    await api(outsider, resource, { accepted: [403] });
    await api(null, resource, { rawToken: editor.tokens.id_token, accepted: [401, 403] });
    const listing = (await api(editor, `${base}?limit=50`)).body;
    assert.ok(listing.releases.some((release) => release.id === releaseId));
  });
  let firstRevision;
  await check('submission freezes a version and self-review is blocked even for administrator', async () => {
    firstRevision = (await api(editor, `${resource}/submit`, { method: 'POST', body: { expectedRevision: 1 }, key: randomUUID() })).body.revision;
    assert.equal(firstRevision.number, 1);
    await api(editor, `${resource}/decisions`, { method: 'POST', body: { expectedRevision: 1, outcome: 'accepted' }, key: randomUUID(), accepted: [403] });
    await permission(editor, 'administrator');
    const self = await api(editor, `${resource}/decisions`, { method: 'POST', body: { expectedRevision: 1, outcome: 'accepted' }, key: randomUUID(), accepted: [403] });
    assert.equal(self.body.error.code, 'SELF_REVIEW');
    await permission(editor, 'editor');
  });
  let firstDecision;
  await check('two real reviewers race for one final decision', async () => {
    const results = await Promise.all([reviewer, competitor].map((user) => api(user, `${resource}/decisions`, { method: 'POST',
      body: { expectedRevision: 1, outcome: 'changes_requested', reason: `Synthetic requested change from ${user.label}` }, key: randomUUID(), accepted: [200, 409] })));
    assert.deepEqual(results.map((result) => result.status).sort(), [200, 409]);
    firstDecision = results.find((result) => result.status === 200).body.decision;
    assert.equal((await api(editor, resource)).body.decisions.length, 1);
  });
  const evidencePath = (number) => `/api/v1/evidence/orgs/${orgId}/projects/${projectId}/releases/${releaseId}/revisions/${number}/acta`;
  await check('downloaded acta verifies content integrity and detects tampering', async () => {
    const acta = (await api(editor, evidencePath(1))).body;
    assert.ok(verifyActa(acta));
    assert.deepEqual(acta.revision, firstRevision);
    assert.deepEqual(acta.decision, firstDecision);
    const tampered = structuredClone(acta); tampered.revision.manifest.title = 'Tampered';
    assert.equal(verifyActa(tampered), false);
    await api(outsider, evidencePath(1), { accepted: [403] });
  });
  await check('new revision requires a new decision and preserves prior evidence', async () => {
    const second = (await api(editor, `${resource}/revisions`, { method: 'POST', body: { ...draftBody, changes: ['Synthetic change resolved'], expectedRevision: 1 }, key: randomUUID(), accepted: [201] })).body;
    assert.equal(second.release.revision, 2);
    await api(editor, `${resource}/submit`, { method: 'POST', body: { expectedRevision: 2 }, key: randomUUID() });
    await api(reviewer, `${resource}/decisions`, { method: 'POST', body: { expectedRevision: 2, outcome: 'accepted' }, key: randomUUID() });
    const original = (await api(editor, `${resource}/revisions/1`)).body;
    assert.deepEqual(original.revision, firstRevision); assert.deepEqual(original.decision, firstDecision);
    const detail = (await api(editor, resource)).body;
    assert.equal(detail.release.status, 'accepted'); assert.equal(detail.revisions.length, 2); assert.equal(detail.decisions.length, 2);
    const acta = (await api(editor, evidencePath(2))).body;
    assert.ok(verifyActa(acta)); assert.equal(acta.decision.outcome, 'accepted');
    if (restoreRequested) await check('synthetic backup restores the accepted revision and its digest to a new table', async () => {
      await restoreAndVerify(releaseId, acta.revision, acta.decision);
    });
    await api(editor, `${resource}/submit`, { method: 'POST', body: { expectedRevision: 1 }, key: randomUUID(), accepted: [409] });
    assert.deepEqual((await api(editor, base, { method: 'POST', body: draftBody, key: createKey, accepted: [201] })).body, draft);
  });
  await runProductSmoke({ scope: productScope, deployment, root, directory, editor, reviewer, api, check, permission, putAccess, dynamo, browser, report, openWebWorkspace, closeWebWorkspace });
  await check('project write freeze blocks commands and replays while retaining authorized reads', async () => {
    await putAccess({ PK: tenantPK, SK: `PROJECT#${projectId}`, projectId, name: 'Synthetic approval pilot', active: true, writesFrozen: true });
    await api(editor, resource);
    await api(editor, evidencePath(2));
    const blocked = await api(editor, base, { method: 'POST', body: draftBody, key: createKey, accepted: [423] });
    assert.equal(blocked.body.error.code, 'WRITES_FROZEN');
    await putAccess({ PK: tenantPK, SK: `PROJECT#${projectId}`, projectId, name: 'Synthetic approval pilot', active: true, writesFrozen: false });
    assert.deepEqual((await api(editor, base, { method: 'POST', body: draftBody, key: createKey, accepted: [201] })).body, draft);
  });
  await check('revoked membership prevents replay of a previously successful receipt', async () => {
    await putAccess({ PK: tenantPK, SK: `MEMBER#${editor.sub}`, active: false, orgId, orgName: 'Synthetic smoke agency', actor: editor.sub });
    await api(editor, base, { method: 'POST', body: draftBody, key: createKey, accepted: [403] });
    await api(editor, resource, { accepted: [403] });
  });
  report.status = 'passed';
} catch (error) {
  failed = error;
  report.status = 'failed';
  report.failure = safeFailure(error);
} finally {
  await cleanup();
  if (report.cleanup.failures.length) report.status = 'failed';
  report.finishedAt = new Date().toISOString();
  delete report.currentStage;
  await mkdir(directory, { recursive: true });
  await writeFile(resolve(directory, reportName), JSON.stringify(report, null, 2));
}
if (report.status !== 'passed') {
  console.error(`Synthetic smoke failed at ${report.failure?.stage || 'cleanup'} (${failed?.name || 'CleanupError'}). See the sanitized smoke report.`);
  process.exitCode = 1;
} else console.log(`Synthetic smoke passed ${report.checks.length} checks; all synthetic users and rows were cleaned.`);
