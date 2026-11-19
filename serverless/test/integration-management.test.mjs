import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { ApiError } from '../src/releases/domain.mjs';
import { createIntegrationManagementHandler } from '../src/identity/integrations.mjs';

const epoch = 1800000000;
const prefix = '/api/v1/identity/orgs/agency/projects/pilot';
const event = (method, path, body, key = 'attempt') => ({ rawPath: `${prefix}/${path}`, requestContext: { http: { method }, authorizer: { jwt: { claims: { sub: 'admin', token_use: 'access', scope: 'openid' } } } }, headers: { 'idempotency-key': key }, ...(body ? { body: JSON.stringify(body) } : {}) });
function setup() {
  const repository = {
    access: { membership: { active: true }, project: { active: true }, permission: { active: true, role: 'administrator' }, plan: { plan: 'plus', active: true, expiresAt: epoch + 600 } },
    keys: new Map(), receipts: new Map(),
    async getAccess(org, project) { return org === 'agency' && project === 'pilot' ? structuredClone(this.access) : {}; },
    async listIntegrationKeys() { return [...this.keys.values()]; },
    async getIntegrationKey(_org, _project, id) { return this.keys.get(id); },
    async getKeyRequest(_org, _project, key) { return this.receipts.get(key); },
    async createIntegrationKey(_context, row, receipt) { await this.beforeWrite?.(); this.keys.set(row.id, row); this.receipts.set(receipt.key, receipt); },
    async revokeIntegrationKey(_context, id, receipt) { const row = this.keys.get(id); row.active = false; this.receipts.set(receipt.key, receipt); },
  };
  return { repository, handler: createIntegrationManagementHandler(repository, { now: () => epoch * 1000 }) };
}

test('Plus administrator creates a hashed expiring portable key, lists safe metadata and cannot recover a secret on replay', async () => {
  const { handler, repository } = setup();
  const request = event('POST', 'integration-keys', { name: 'Build pipeline', expiresInDays: 30 });
  const response = await handler(request);
  assert.equal(response.statusCode, 201);
  const body = JSON.parse(response.body);
  assert.match(body.token, /^loc_[a-f0-9]{32}_[A-Za-z0-9_-]{43}$/);
  const [, id, secret] = body.token.split('_');
  // Token secrets may contain underscores; derive from the fixed-width public id.
  const stored = repository.keys.get(id);
  assert.equal(stored.secretHash, createHash('sha256').update(body.token.slice(37)).digest('hex'));
  assert.equal(stored.expiresAt, epoch + 30 * 86400);
  assert.equal(stored.scope, 'releases:create');
  assert.equal(JSON.stringify([...repository.keys.values(), ...repository.receipts.values()]).includes(body.token), false);
  const listed = await handler(event('GET', 'integration-keys'));
  assert.deepEqual(JSON.parse(listed.body).keys, [body.key]);
  assert.equal(listed.body.includes('secretHash'), false);
  const replay = await handler(request);
  assert.equal(replay.statusCode, 409);
  assert.equal(JSON.parse(replay.body).error.code, 'KEY_ALREADY_CREATED');
  assert.equal(replay.body.includes(body.token), false);
  assert.equal(repository.keys.size, 1);
});

test('capabilities fail closed without active Plus and key management requires current personal administrator access', async () => {
  const { repository, handler } = setup();
  for (const plan of [undefined, { plan: 'plus', active: 'true' }, { plan: 'plus', active: true, expiresAt: epoch }, { plan: 'plus', active: true, expiresAt: 'future' }, { plan: 'free', active: true }]) {
    repository.access.plan = plan;
    assert.deepEqual(JSON.parse((await handler(event('GET', 'capabilities'))).body), { plan: 'free', integrations: false, publicPublishing: false, role: 'administrator' });
    assert.equal((await handler(event('POST', 'integration-keys', { name: 'CI', expiresInDays: 1 }))).statusCode, 403);
  }
  repository.access.plan = { plan: 'plus', active: true };
  repository.access.permission.role = 'editor';
  assert.equal((await handler(event('GET', 'capabilities'))).statusCode, 200);
  assert.equal((await handler(event('GET', 'integration-keys'))).statusCode, 403);
  repository.access.permission.active = false;
  assert.equal((await handler(event('GET', 'capabilities'))).statusCode, 403);
  assert.equal((await handler({ ...event('GET', 'capabilities'), rawPath: prefix.replace('agency', 'foreign') + '/capabilities' })).statusCode, 403);
  const idToken = event('GET', 'capabilities'); idToken.requestContext.authorizer.jwt.claims.token_use = 'id';
  assert.equal((await handler(idToken)).statusCode, 401);
});

test('revocation is idempotent and remains available after plan expiration and project freeze', async () => {
  const { repository, handler } = setup();
  const body = JSON.parse((await handler(event('POST', 'integration-keys', { name: 'CI', expiresInDays: 1 }))).body);
  repository.access.plan = undefined;
  repository.access.project.writesFrozen = true;
  const request = event('DELETE', `integration-keys/${body.key.id}`, undefined, 'revoke');
  const revoked = await handler(request);
  assert.equal(revoked.statusCode, 200);
  assert.equal(JSON.parse(revoked.body).key.active, false);
  assert.deepEqual(await handler(request), revoked);
  repository.access.membership.active = false;
  assert.equal((await handler(request)).statusCode, 403);
});

test('key creation rejects invalid lifetime, unknown fields and missing idempotency before storing credentials', async () => {
  const { repository, handler } = setup();
  for (const body of [{ name: 'CI', expiresInDays: 0 }, { name: 'CI', expiresInDays: 91 }, { name: 'CI', expiresInDays: 1.5 }, { name: '', expiresInDays: 1 }, { name: 'CI', expiresInDays: 1, plan: 'plus' }]) assert.equal((await handler(event('POST', 'integration-keys', body))).statusCode, 400);
  const request = event('POST', 'integration-keys', { name: 'CI', expiresInDays: 1 }); request.headers = {};
  assert.equal((await handler(request)).statusCode, 400);
  assert.equal(repository.keys.size, 0);
});

test('key mutation authorization races fail closed and replays never bypass revoked administration', async () => {
  for (const modify of [access => { access.permission.active = false; }, access => { access.plan.active = false; }, access => { access.project.writesFrozen = true; }]) {
    const { handler, repository } = setup();
    repository.beforeWrite = async () => { modify(repository.access); throw new ApiError(403, 'FORBIDDEN', 'Synthetic failed condition'); };
    const response = await handler(event('POST', 'integration-keys', { name: 'CI', expiresInDays: 30 }));
    assert.ok([403, 423].includes(response.statusCode));
    assert.equal(repository.keys.size, 0);
  }
  const { handler, repository } = setup();
  const request = event('POST', 'integration-keys', { name: 'CI', expiresInDays: 30 });
  await handler(request);
  repository.access.membership.active = false;
  assert.equal((await handler(request)).statusCode, 403);
});
