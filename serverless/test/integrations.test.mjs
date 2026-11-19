import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { createReleasesService, ApiError } from '../src/releases/domain.mjs';
import { createReleasesHandler, createIngestionHandler } from '../src/releases/http.mjs';

const epoch = 1800000000;
const keyId = 'a'.repeat(32);
const secret = 'b'.repeat(43);
const secretHash = createHash('sha256').update(secret).digest('hex');
const token = `loc_${keyId}_${secret}`;
const context = { orgId: 'agency', projectId: 'pilot', kind: 'integration', sub: `integration:${keyId}`, keyId, secretHash };
const input = { title: 'Release from CI', summary: 'Private draft', changes: ['A change'], source: { system: 'github', externalId: 'run-123', revision: 'abc123' } };

function setup() {
  const repository = {
    access: { project: { active: true }, plan: { active: true, plan: 'plus', expiresAt: epoch + 600 }, integrationKey: { id: keyId, scope: 'releases:create', active: true, expiresAt: epoch + 300, secretHash } },
    receipts: new Map(), releases: new Map(), writes: 0,
    async getIntegrationAccess(org, project, id) { return org === 'agency' && project === 'pilot' && id === keyId ? structuredClone(this.access) : {}; },
    async getAccess() { throw new Error('A machine must never inherit human authorization.'); },
    async getReceipt(_org, _project, key) { const value = this.receipts.get(key); await this.onReceipt?.(); return structuredClone(value); },
    async transact(command) {
      await this.onTransact?.();
      const current = this.access;
      if (!current.project.active || !current.integrationKey.active || current.integrationKey.expiresAt <= command.integrationAuthorization.nowEpoch || current.integrationKey.secretHash !== command.integrationAuthorization.secretHash || !current.plan.active || current.plan.plan !== 'plus' || current.plan.expiresAt <= command.integrationAuthorization.nowEpoch) throw new ApiError(403, 'FORBIDDEN', 'Authorization changed.');
      if (current.project.writesFrozen) throw new ApiError(403, 'FORBIDDEN', 'Project changed.');
      if (this.receipts.has(command.receipt.key)) throw new ApiError(409, 'CONFLICT', 'A replay won.');
      this.writes++;
      this.releases.set(command.release.id, structuredClone(command.release));
      this.receipts.set(command.receipt.key, structuredClone(command.receipt));
    },
  };
  let sequence = 0;
  return { repository, service: createReleasesService(repository, { now: () => new Date(epoch * 1000).toISOString(), id: () => `r${++sequence}` }) };
}

test('integration creates only a private draft with server provenance and exact idempotent replay', async () => {
  const { service, repository } = setup();
  const first = await service.ingest(context, input, 'ci-run-123');
  assert.equal(first.release.status, 'draft');
  assert.equal(first.release.createdBy, `integration:${keyId}`);
  assert.deepEqual(first.release.provenance, { kind: 'integration', keyId, ...input.source });
  assert.deepEqual(await service.ingest(context, input, 'ci-run-123'), first);
  assert.equal(repository.writes, 1);
  assert.equal(JSON.stringify([...repository.receipts.values()]).includes(secretHash), false);
  assert.equal(JSON.stringify(first).includes(secretHash), false);
  await assert.rejects(service.ingest(context, { ...input, title: 'Different' }, 'ci-run-123'), error => error.code === 'IDEMPOTENCY_CONFLICT');
});

test('integration checks current plan, key, project and freeze before replay', async () => {
  for (const modify of [a => { a.plan.active = false; }, a => { a.plan.expiresAt = epoch; }, a => { a.plan.plan = 'free'; }, a => { a.integrationKey.active = false; }, a => { a.integrationKey.expiresAt = epoch; }, a => { a.integrationKey.secretHash = 'f'.repeat(64); }, a => { a.project.active = false; }, a => { a.project.writesFrozen = true; }]) {
    const { service, repository } = setup();
    await service.ingest(context, input, 'attempt');
    modify(repository.access);
    await assert.rejects(service.ingest(context, input, 'attempt'), error => [401, 403, 423].includes(error.statusCode));
    assert.equal(repository.writes, 1);
  }
});

test('integration revocation during receipt lookup or transaction never succeeds', async () => {
  const saved = setup();
  await saved.service.ingest(context, input, 'attempt');
  saved.repository.onReceipt = async () => { saved.repository.access.integrationKey.active = false; };
  await assert.rejects(saved.service.ingest(context, input, 'attempt'), error => error.statusCode === 401);
  for (const modify of [a => { a.integrationKey.active = false; }, a => { a.plan.active = false; }, a => { a.project.writesFrozen = true; }]) {
    const { service, repository } = setup();
    repository.onTransact = async () => modify(repository.access);
    await assert.rejects(service.ingest(context, input, 'attempt'), error => [401, 403, 423].includes(error.statusCode));
    assert.equal(repository.writes, 0);
  }
});

test('revocation while reading a competing winning receipt blocks integration replay', async () => {
  const { service, repository } = setup();
  let reads = 0;
  const getReceipt = repository.getReceipt.bind(repository);
  repository.getReceipt = async (...args) => {
    const receipt = await getReceipt(...args);
    if (++reads === 2) repository.access.integrationKey.active = false;
    return receipt;
  };
  repository.transact = async command => {
    repository.receipts.set(command.receipt.key, structuredClone(command.receipt));
    throw new ApiError(409, 'CONFLICT', 'Another identical request won.');
  };
  await assert.rejects(service.ingest(context, input, 'same-attempt'), error => error.statusCode === 401);
});

test('integration scope cannot cross projects or perform human commands', async () => {
  const { service } = setup();
  for (const other of [{ ...context, orgId: 'other' }, { ...context, projectId: 'other' }]) await assert.rejects(service.ingest(other, input, 'attempt'), error => error.statusCode === 401);
  for (const operation of [() => service.list(context), () => service.create(context, { title: input.title, summary: input.summary, changes: input.changes }, 'attempt'), () => service.submit(context, 'r1', { expectedRevision: 1 }, 'attempt'), () => service.decide(context, 'r1', { expectedRevision: 1, outcome: 'accepted' }, 'attempt')]) await assert.rejects(operation(), error => [401, 403].includes(error.statusCode));
  for (const body of [{ ...input, status: 'accepted' }, { ...input, source: { url: 'https://private.example' } }, { ...input, source: { revision: 'a'.repeat(161) } }]) await assert.rejects(service.ingest(context, body, 'attempt'), error => error.statusCode === 400);
});

test('ingestion HTTP requires the portable key, exact POST route and bounded body; key never authenticates human routes', async () => {
  let received;
  const handler = createIngestionHandler({ ingest: async (...values) => { received = values; return { release: { status: 'draft' } }; } });
  const event = { rawPath: '/api/v1/ingestions/orgs/agency/projects/pilot/releases', requestContext: { http: { method: 'POST' } }, headers: { 'x-logsofchange-key': token, 'idempotency-key': 'run-1' }, body: JSON.stringify(input) };
  assert.equal((await handler(event)).statusCode, 201);
  assert.deepEqual(received[0], context);
  assert.equal(received[2], 'run-1');
  for (const invalid of ['', 'Bearer jwt', `loc_${keyId}_short`, `loc_${keyId}_${secret}suffix`]) assert.equal((await handler({ ...event, headers: { ...event.headers, 'x-logsofchange-key': invalid } })).statusCode, 401);
  assert.equal((await handler({ ...event, requestContext: { http: { method: 'GET' } } })).statusCode, 405);
  assert.equal((await handler({ ...event, body: 'x'.repeat(65537) })).statusCode, 413);
  assert.equal((await createReleasesHandler({})({ ...event, rawPath: '/api/v1/orgs/agency/projects/pilot/releases' })).statusCode, 401);
});
