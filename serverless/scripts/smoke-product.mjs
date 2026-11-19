// Synthetic product canary. No entry point, customer credentials or production opt-in.
// smoke.mjs validates its target and invokes this module with its own UUID tenant.
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { GetCommand, QueryCommand, DeleteCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { verifyActa } from '../src/evidence/index.mjs';

const origins = { development: 'https://dev.logsofchange.lynxpardelle.com', testing: 'https://test.logsofchange.lynxpardelle.com', production: 'https://logsofchange.lynxpardelle.com' };
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const validatedScopes = new WeakSet();

export function validateProductSmokeScope(deployment, { runId, orgId, projectId, origin }) {
  assert.match(runId, uuid, 'Product canary requires its own random UUID.');
  assert.equal(orgId, `smoke-${runId}`);
  assert.equal(projectId, 'synthetic-pilot');
  const environment = deployment.environment;
  assert.ok(Object.hasOwn(origins, environment));
  assert.equal(origin, origins[environment], 'Unexpected product canary origin.');
  assert.equal(deployment.edge.PublicUrl, origin);
  assert.equal(deployment.region, 'us-east-1');
  const source = /^arn:aws:dynamodb:us-east-1:(\d{12}):table\/(.+)$/.exec(deployment.releases?.ReleasesTableArn || '');
  assert.ok(source && source[2] === deployment.releases.ReleasesTableName && source[2].startsWith(`logsofchange-${environment}-`), 'Invalid product canary source table.');
  const accessTable = deployment.identity?.AccessTableName;
  assert.ok(typeof accessTable === 'string' && accessTable.startsWith(`logsofchange-${environment}-`));
  assert.equal(deployment.identity.AccessTableArn, `arn:aws:dynamodb:us-east-1:${source[1]}:table/${accessTable}`);
  const publications = deployment.publications;
  assert.ok(publications, 'Product canary requires deployed publications outputs.');
  for (const name of ['AdminTable', 'PublicTable']) {
    const table = publications[`${name}Name`];
    assert.ok(typeof table === 'string' && table.startsWith(`logsofchange-${environment}-publications-`));
    assert.equal(publications[`${name}Arn`], `arn:aws:dynamodb:us-east-1:${source[1]}:table/${table}`, 'Unexpected publication table account or region.');
  }
  assert.notEqual(publications.AdminTableName, publications.PublicTableName);
  assert.notEqual(publications.AdminTableName, source[2]);
  assert.notEqual(publications.PublicTableName, source[2]);
  assert.notEqual(publications.AdminTableName, accessTable);
  assert.notEqual(publications.PublicTableName, accessTable);
  const scope = Object.freeze({ environment, orgId, projectId, runId, origin, accessTable, adminTable: publications.AdminTableName, publicTable: publications.PublicTableName,
    tenantPK: `TENANT#${orgId}`, projectPK: `TENANT#${orgId}#PROJECT#${projectId}`, slug: `smoke-${runId}`, publicPK: `PROJECT#smoke-${runId}` });
  validatedScopes.add(scope);
  return scope;
}

export async function runPortableCli({ root, directory, environment, orgId, projectId, file, idempotencyKey, apiKey }, { spawnImpl = spawn } = {}) {
  assert.ok(Object.hasOwn(origins, environment));
  assert.match(apiKey, /^loc_[a-f0-9]{32}_[A-Za-z0-9_-]{43}$/);
  assert.equal(dirname(resolve(file)), resolve(directory));
  const args = ['--use-system-ca', resolve(root, 'cli/logsofchange.mjs'), `--environment=${environment}`, `--org=${orgId}`, `--project=${projectId}`, `--file=${file}`, `--idempotency-key=${idempotencyKey}`];
  return new Promise((accept, reject) => {
    const child = spawnImpl(process.execPath, args, { cwd: directory, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, LOGSOFCHANGE_API_KEY: apiKey } });
    let output = ''; let oversized = false;
    child.stdout.on('data', chunk => { output += chunk; if (Buffer.byteLength(output) > 8192) { oversized = true; child.kill?.(); } });
    child.stderr.on('data', () => {}); // Never echo child output that might contain credentials.
    child.on('error', () => reject(new Error('Portable CLI could not start.')));
    child.on('exit', code => {
      if (code !== 0 || oversized) return reject(new Error('Portable CLI failed; output was suppressed.'));
      try {
        const result = JSON.parse(output);
        assert.deepEqual(Object.keys(result).sort(), ['environment', 'releaseId', 'revision', 'status']);
        assert.equal(result.environment, environment); assert.equal(result.status, 'draft'); assert.equal(result.revision, 1);
        assert.match(result.releaseId, /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/);
        accept(result);
      } catch { reject(new Error('Portable CLI returned invalid receipt metadata.')); }
    });
  });
}

export async function cleanupProductSmoke({ scope, dynamo, report }) {
  assert.ok(validatedScopes.has(scope), 'Product cleanup requires a validated immutable scope.');
  report.cleanup.deletedPublicationAdminRows ??= 0;
  report.cleanup.deletedPublicationPublicRows ??= 0;
  const claimKey = { PK: `SLUG#${scope.slug}`, SK: 'CLAIM' };
  let claim; let claimChecked = false; let claimOwned = false; let publicCleared = false;
  try {
    claim = (await dynamo.send(new GetCommand({ TableName: scope.adminTable, Key: claimKey, ConsistentRead: true }))).Item;
    claimChecked = true;
    if (claim) { assert.equal(claim.owner, scope.projectPK, 'Refusing a slug claim owned by another project.'); claimOwned = true; }
  } catch (error) { report.cleanup.failures.push({ area: 'publications-slug', name: error.name }); }
  async function removePartition(table, PK, count, validSK, publicPartition = false) {
    let cursor;
    do {
      const response = await dynamo.send(new QueryCommand({ TableName: table, KeyConditionExpression: 'PK = :pk', ExpressionAttributeValues: { ':pk': PK }, ConsistentRead: true, ...(cursor ? { ExclusiveStartKey: cursor } : {}) }));
      if (publicPartition && !claimOwned) assert.equal((response.Items || []).length, 0, 'Public rows without an owned slug claim cannot be deleted.');
      for (const item of response.Items || []) {
        assert.equal(item.PK, PK); assert.ok(validSK(item.SK), 'Unexpected row in synthetic publication partition.');
        if (publicPartition) await dynamo.send(new TransactWriteCommand({ TransactItems: [
          { ConditionCheck: { TableName: scope.adminTable, Key: claimKey, ConditionExpression: '#owner = :owner', ExpressionAttributeNames: { '#owner': 'owner' }, ExpressionAttributeValues: { ':owner': scope.projectPK } } },
          { Delete: { TableName: table, Key: { PK, SK: item.SK } } },
        ] }));
        else await dynamo.send(new DeleteCommand({ TableName: table, Key: { PK, SK: item.SK } }));
        report.cleanup[count]++;
      }
      cursor = response.LastEvaluatedKey;
    } while (cursor);
  }
  for (const [area, action] of [
    ['publications-admin', () => removePartition(scope.adminTable, scope.projectPK, 'deletedPublicationAdminRows', SK => SK === 'CONFIG' || /^PUBLICATION#[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(SK) || /^IDEMP#[a-f0-9]{64}$/.test(SK))],
    ['publications-public', async () => {
      if (!claimChecked || (claim && !claimOwned)) return;
      await removePartition(scope.publicTable, scope.publicPK, 'deletedPublicationPublicRows', SK => SK === 'META' || (typeof SK === 'string' && SK.startsWith('RELEASE#') && uuid.test(SK.slice(8))), true);
      publicCleared = true;
    }],
    ['publications-slug', async () => {
      if (!claimOwned || !publicCleared) return;
      await dynamo.send(new DeleteCommand({ TableName: scope.adminTable, Key: claimKey, ConditionExpression: '#owner = :owner', ExpressionAttributeNames: { '#owner': 'owner' }, ExpressionAttributeValues: { ':owner': scope.projectPK } }));
      report.cleanup.deletedPublicationAdminRows++;
    }],
  ]) {
    try { await action(); }
    catch (error) { report.cleanup.failures.push({ area, name: error.name }); }
  }
}

export async function runProductSmoke({ scope, deployment, root, directory, editor, reviewer, api, check, permission, putAccess, dynamo, browser, report, openWebWorkspace, closeWebWorkspace }) {
  assert.ok(validatedScopes.has(scope));
  const { origin, environment, orgId, projectId, tenantPK, projectPK, runId, slug } = scope;
  const accessTable = scope.accessTable;
  const identityBase = `/api/v1/identity/orgs/${orgId}/projects/${projectId}`;
  const releasesBase = `/api/v1/orgs/${orgId}/projects/${projectId}/releases`;
  const ingestionBase = `/api/v1/ingestions/orgs/${orgId}/projects/${projectId}/releases`;
  const publicationsBase = `/api/v1/publications/orgs/${orgId}/projects/${projectId}/releases`;
  const publicPath = `/api/v1/public/projects/${slug}`;
  const plan = { PK: tenantPK, SK: 'PRODUCT', active: true, plan: 'plus', expiresAt: Math.floor(Date.now() / 1000) + 1800 };
  const projectKey = { PK: tenantPK, SK: `PROJECT#${projectId}` };
  const project = (await dynamo.send(new GetCommand({ TableName: accessTable, Key: projectKey, ConsistentRead: true }))).Item;
  assert.equal(project?.projectId, projectId); assert.equal(project.active, true);
  let apiKey; let keyId; let keyRow; let draft; let resource; let acta; let adminWorkspace;
  const body = { title: 'Synthetic portable release', summary: 'Private integration summary must never become public.', changes: ['Synthetic external change'], source: { system: 'synthetic-cli', externalId: `run-${runId}`, revision: 'synthetic-revision' } };
  const draftKey = randomUUID();
  const publishBody = { revision: 1, slug, projectName: 'Synthetic public changelog', fields: ['title', 'changes'] };
  const flags = report.productFlow = {};
  async function machine(path, { method = 'POST', body: payload, credential = apiKey, idempotencyKey = draftKey, accepted = [201] } = {}) {
    const requestBody = payload === undefined && method === 'POST' ? body : payload;
    const response = await fetch(`${origin}${path}`, { method, redirect: 'error', signal: AbortSignal.timeout(20000), headers: { 'x-logsofchange-key': credential, ...(requestBody !== undefined ? { 'content-type': 'application/json' } : {}), 'idempotency-key': idempotencyKey }, ...(requestBody !== undefined ? { body: JSON.stringify(requestBody) } : {}) });
    assert.ok(accepted.includes(response.status), `Unexpected synthetic credential HTTP ${response.status}.`);
    return { status: response.status, body: await response.json() };
  }
  try {
    await permission(editor, 'administrator');
    await check('Plus capability and one-time API key create a private draft through the portable CLI', async () => {
      assert.equal((await api(editor, `${identityBase}/capabilities`)).body.plan, 'free');
      await putAccess(plan);
      const capabilities = (await api(editor, `${identityBase}/capabilities`)).body;
      assert.deepEqual(capabilities, { plan: 'plus', integrations: true, publicPublishing: true, role: 'administrator' });
      const createKey = randomUUID(), createBody = { name: 'Synthetic portable pipeline', expiresInDays: 1 };
      const created = (await api(editor, `${identityBase}/integration-keys`, { method: 'POST', body: createBody, key: createKey, accepted: [201] })).body;
      apiKey = created.token; keyId = created.key.id;
      assert.match(apiKey, /^loc_[a-f0-9]{32}_[A-Za-z0-9_-]{43}$/);
      assert.equal(apiKey.slice(4, 36), keyId);
      const listed = (await api(editor, `${identityBase}/integration-keys`)).body;
      assert.deepEqual(listed.keys, [created.key]);
      assert.ok(!JSON.stringify(listed).includes(apiKey) && !JSON.stringify(listed).includes('secretHash'));
      const replay = await api(editor, `${identityBase}/integration-keys`, { method: 'POST', body: createBody, key: createKey, accepted: [409] });
      assert.equal(replay.body.error.code, 'KEY_ALREADY_CREATED'); assert.ok(!JSON.stringify(replay.body).includes(apiKey));
      keyRow = (await dynamo.send(new GetCommand({ TableName: accessTable, Key: { PK: projectPK, SK: `INTEGRATION#${keyId}` }, ConsistentRead: true }))).Item;
      assert.equal(keyRow.secretHash, createHash('sha256').update(apiKey.slice(37)).digest('hex'));
      assert.ok(!JSON.stringify(keyRow).includes(apiKey));
      await mkdir(directory, { recursive: true });
      const file = resolve(directory, 'product-cli-input.json');
      await writeFile(file, JSON.stringify(body, null, 2));
      const cliOptions = { root, directory, environment, orgId, projectId, file, idempotencyKey: draftKey, apiKey };
      const cli = await runPortableCli(cliOptions);
      assert.deepEqual(await runPortableCli(cliOptions), cli);
      resource = `${releasesBase}/${cli.releaseId}`;
      draft = (await api(editor, resource)).body.release;
      assert.equal(draft.status, 'draft'); assert.equal(draft.createdBy, `integration:${keyId}`);
      assert.deepEqual(draft.provenance, { kind: 'integration', keyId, ...body.source });
      Object.assign(flags, { plusCapability: true, oneTimeKey: true, hashOnlyStorage: true, safeKeyListing: true, cliPrivateDraft: true, exactCliReplay: true });
      adminWorkspace = await openWebWorkspace(editor);
      const page = adminWorkspace.page;
      await page.goto(`${origin}/integrations`, { waitUntil: 'networkidle' });
      await page.getByText('Plan Plus', { exact: true }).waitFor();
      assert.equal(await page.locator('#integration-project').inputValue(), `${orgId}/${projectId}`);
      await page.locator('#key-name').fill('Synthetic console pipeline');
      await page.locator('#key-expiry').fill('1');
      await page.getByRole('button', { name: 'Crear clave →', exact: true }).click();
      await page.locator('#new-key').waitFor();
      let uiToken = await page.locator('#new-key').inputValue();
      assert.match(uiToken, /^loc_[a-f0-9]{32}_[A-Za-z0-9_-]{43}$/);
      assert.ok(await page.evaluate(secret => !JSON.stringify({ ...sessionStorage, ...localStorage }).includes(secret), uiToken));
      await page.getByRole('button', { name: 'Ya guardé la clave', exact: true }).click();
      await page.locator('#new-key').waitFor({ state: 'detached' });
      await page.getByRole('button', { name: 'Revocar clave Synthetic console pipeline', exact: true }).click();
      await page.getByText('Clave revocada. Ya no permite enviar entregas.', { exact: true }).waitFor();
      await machine(ingestionBase, { credential: uiToken, idempotencyKey: randomUUID(), accepted: [401] });
      uiToken = undefined;
      await page.screenshot({ path: resolve(directory, 'integrations-console.png'), fullPage: true });
      Object.assign(flags, { uiKeyCreation: true, uiSecretMemoryOnly: true, uiSecretHidden: true, uiKeyRevocation: true });
    });
    await check('integration keys cannot read, approve, publish or cross projects and current plan expiry and freeze block replays', async () => {
      await machine(resource, { method: 'GET', body: undefined, accepted: [401, 403] });
      await api(null, resource, { rawToken: apiKey, accepted: [401, 403] });
      await machine(`${resource}/decisions`, { body: { expectedRevision: 1, outcome: 'accepted' }, accepted: [401, 403] });
      await machine(`${publicationsBase}/${draft.id}`, { body: publishBody, accepted: [401, 403] });
      await machine(`/api/v1/ingestions/orgs/${orgId}/projects/foreign/releases`, { accepted: [401, 403] });
      await putAccess({ ...plan, active: false });
      await machine(ingestionBase, { accepted: [403] });
      await putAccess({ ...plan, expiresAt: Math.floor(Date.now() / 1000) - 1 });
      await machine(ingestionBase, { accepted: [403] });
      await putAccess(plan);
      await putAccess({ ...keyRow, expiresAt: Math.floor(Date.now() / 1000) - 1 });
      await machine(ingestionBase, { accepted: [401] });
      await putAccess(keyRow);
      await putAccess({ ...project, writesFrozen: true });
      await machine(ingestionBase, { accepted: [423] });
      await putAccess({ ...project, writesFrozen: false });
      assert.equal((await machine(ingestionBase)).body.release.id, draft.id);
      Object.assign(flags, { machineCannotRead: true, machineCannotApprove: true, machineCannotPublish: true, crossProjectDenied: true, inactivePlusBlocksReplay: true, expiredPlusBlocksReplay: true, expiredKeyBlocksReplay: true, freezeBlocksReplay: true });
    });
    await check('an integration draft requires a human submission and decision before publication', async () => {
      await api(editor, `${resource}/submit`, { method: 'POST', body: { expectedRevision: 1 }, key: randomUUID() });
      await api(editor, `${publicationsBase}/${draft.id}`, { method: 'POST', body: publishBody, key: randomUUID(), accepted: [409] });
      await api(reviewer, `${resource}/decisions`, { method: 'POST', body: { expectedRevision: 1, outcome: 'accepted' }, key: randomUUID() });
      acta = (await api(editor, `/api/v1/evidence/orgs/${orgId}/projects/${projectId}/releases/${draft.id}/revisions/1/acta`)).body;
      assert.ok(verifyActa(acta)); assert.equal(acta.decision.actor, reviewer.sub); assert.equal(acta.decision.outcome, 'accepted');
      assert.deepEqual(acta.revision.manifest.provenance, draft.provenance);
      Object.assign(flags, { humanSubmission: true, humanAcceptance: true, unacceptedPublicationDenied: true, integrationActaVerified: true });
    });
    await check('explicit selected-field publication exposes a redacted anonymous API and SSR dashboard', async () => {
      const page = adminWorkspace.page;
      await page.getByRole('button', { name: 'Actualizar', exact: true }).click();
      await page.locator(`#accepted-release option[value="${draft.id}"]`).waitFor({ state: 'attached' });
      await page.locator('#accepted-release').selectOption(draft.id);
      await page.getByRole('heading', { name: body.title, exact: true }).waitFor();
      await page.locator('#public-name').fill(publishBody.projectName);
      await page.locator('#public-slug').fill(slug);
      await page.getByRole('checkbox', { name: 'Alcance / resumen', exact: true }).uncheck();
      await page.getByRole('checkbox', { name: 'Lista de cambios', exact: true }).check();
      assert.ok(!(await page.locator('.public-preview').innerText()).includes(body.summary));
      await page.screenshot({ path: resolve(directory, 'integrations-public-preview.png'), fullPage: true });
      await page.getByRole('button', { name: 'Publicar revisión →', exact: true }).click();
      await page.getByText('Revisión publicada. El dashboard ya puede consultarse sin iniciar sesión.', { exact: true }).waitFor();
      flags.uiExplicitPublication = true;
      const publishKey = randomUUID();
      const publication = await api(editor, `${publicationsBase}/${draft.id}`, { method: 'POST', body: publishBody, key: publishKey });
      assert.deepEqual((await api(editor, `${publicationsBase}/${draft.id}`, { method: 'POST', body: publishBody, key: publishKey })).body, publication.body);
      const publicResult = await api(null, publicPath);
      assert.equal(publicResult.headers.get('cache-control'), 'no-store');
      assert.equal(publicResult.headers.get('access-control-allow-origin'), '*');
      assert.deepEqual(Object.keys(publicResult.body).sort(), ['nextCursor', 'project', 'releases']);
      assert.deepEqual(publicResult.body.project, { slug, name: publishBody.projectName });
      assert.equal(publicResult.body.releases.length, 1);
      const item = publicResult.body.releases[0];
      assert.deepEqual(Object.keys(item).sort(), ['acceptedAt', 'changes', 'id', 'publishedAt', 'revision', 'title']);
      assert.notEqual(item.id, draft.id); assert.equal(item.title, body.title); assert.deepEqual(item.changes, body.changes);
      const publicRaw = JSON.stringify(item);
      for (const privateValue of [draft.id, editor.sub, reviewer.sub, body.summary, apiKey, keyRow.secretHash]) assert.ok(!publicRaw.includes(privateValue));
      for (const [name, viewport] of [['desktop', { width: 1280, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
        const context = await browser.newContext({ viewport, ...(name === 'mobile' ? { isMobile: true, hasTouch: true } : {}) });
        try {
          const page = await context.newPage();
          const errors = [];
          page.on('pageerror', () => errors.push('page'));
          page.on('console', message => { if (message.type() === 'error') errors.push('console'); });
          if (name === 'desktop') {
            const external = await page.evaluate(async url => { const response = await fetch(url, { credentials: 'omit', cache: 'no-store' }); return { status: response.status, body: await response.json() }; }, `${origin}${publicPath}`);
            assert.equal(external.status, 200); assert.deepEqual(external.body, publicResult.body);
            flags.externalAnonymousRead = true;
          }
          const response = await page.goto(`${origin}/p/${slug}`, { waitUntil: 'networkidle', timeout: 45000 });
          assert.equal(response.status(), 200);
          const html = await response.text();
          assert.ok(html.includes('ng-server-context="ssr"') && html.includes(publishBody.projectName) && html.includes(body.title), 'Public dashboard must render published content on the server.');
          await page.getByRole('heading', { name: publishBody.projectName, exact: true }).waitFor();
          await page.getByRole('heading', { name: body.title, exact: true }).waitFor();
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
          assert.equal(errors.length, 0);
          for (const privateValue of [editor.sub, reviewer.sub, body.summary, apiKey, keyRow.secretHash]) assert.ok(!html.includes(privateValue));
          assert.equal(await page.evaluate(() => sessionStorage.length), 0);
          await page.screenshot({ path: resolve(directory, `public-dashboard-${name}.png`), fullPage: true });
          flags[name === 'desktop' ? 'publicDesktop' : 'publicMobile'] = true;
        } finally { await context.close(); }
      }
      Object.assign(flags, { explicitPublication: true, selectedFieldsOnly: true, publicPrivateIdentifiersAbsent: true, publicSsr: true });
    });
    await check('unpublication and credential revocation remain available without Plus and deny future public reads and replays', async () => {
      await putAccess({ ...plan, active: false });
      await putAccess({ ...project, writesFrozen: true });
      const page = adminWorkspace.page;
      await page.getByRole('button', { name: 'Actualizar', exact: true }).click();
      await page.getByText('Plan Free', { exact: true }).waitFor();
      assert.ok(await page.getByRole('button', { name: 'Crear clave →', exact: true }).isDisabled());
      assert.ok(await page.getByRole('button', { name: 'Publicar revisión →', exact: true }).isDisabled());
      await page.getByRole('button', { name: 'Retirar publicación de revisión 1', exact: true }).click();
      await page.getByText('Publicación retirada de las consultas del dashboard.', { exact: true }).waitFor();
      await api(null, publicPath, { accepted: [404] });
      const unpublishKey = randomUUID();
      const removed = await api(editor, `${publicationsBase}/${draft.id}`, { method: 'DELETE', key: unpublishKey });
      assert.deepEqual((await api(editor, `${publicationsBase}/${draft.id}`, { method: 'DELETE', key: unpublishKey })).body, removed.body);
      await api(null, publicPath, { accepted: [404] });
      await page.getByRole('button', { name: 'Revocar clave Synthetic portable pipeline', exact: true }).click();
      await page.getByText('Clave revocada. Ya no permite enviar entregas.', { exact: true }).waitFor();
      const revokeKey = randomUUID();
      const revoked = await api(editor, `${identityBase}/integration-keys/${keyId}`, { method: 'DELETE', key: revokeKey });
      assert.equal(revoked.body.key.active, false);
      assert.deepEqual((await api(editor, `${identityBase}/integration-keys/${keyId}`, { method: 'DELETE', key: revokeKey })).body, revoked.body);
      await machine(ingestionBase, { accepted: [401] });
      await page.screenshot({ path: resolve(directory, 'integrations-free-cleanup.png'), fullPage: true });
      await putAccess({ ...project, writesFrozen: false });
      Object.assign(flags, { unpublishWithoutPlus: true, unpublishAnonymous404: true, revokeWithoutPlus: true, revokedKeyBlocksReplay: true, uiUnpublishWithoutPlus: true, uiRevokeWithoutPlus: true });
    });
  } finally {
    try { if (adminWorkspace) await closeWebWorkspace(adminWorkspace); }
    finally { apiKey = undefined; keyRow = undefined; await permission(editor, 'editor'); }
  }
}
