import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { canonicalJson, ApiError } from '../src/releases/domain.mjs';

const implementation = await import('../src/publications/domain.mjs').catch(() => ({}));
const orgId = 'agency', projectId = 'pilot';
const context = { orgId, projectId, sub: 'admin', authorization: 'Bearer verified.access.token' };
const when = '2026-11-19T12:00:00.000Z';
const epoch = Math.floor(Date.parse(when) / 1000);
const input = { revision: 1, slug: 'public-project', projectName: 'Proyecto público', fields: ['title'] };
const keyFor = c => `${c.orgId}/${c.projectId}`;
const clone = value => value === undefined ? undefined : structuredClone(value);
const code = expected => error => error.code === expected;

function acta(c = context, releaseId = 'release-1', revision = 1, outcome = 'accepted') {
  const manifest = { orgId: c.orgId, projectId: c.projectId, releaseId, revision, title: 'Hito aceptado', summary: 'Resumen seleccionado', changes: ['Cambio seleccionado'], createdBy: 'private-author', submittedBy: 'private-submitter', attachments: [] };
  const digest = createHash('sha256').update(canonicalJson(manifest)).digest('hex');
  return { schema: 'logsofchange.acta.v1', orgId: c.orgId, projectId: c.projectId, releaseId,
    revision: { number: revision, manifest, digest }, decision: { revision, outcome, actor: 'private-reviewer', reason: 'private-reason', decidedAt: when, manifestDigest: digest } };
}

class MemoryRepository {
  access = new Map([[keyFor(context), { membership: { active: true }, project: { active: true }, permission: { active: true, role: 'administrator' }, plan: { plan: 'plus', active: true } }]]);
  publications = new Map(); configs = new Map(); receipts = new Map(); claims = new Map(); projects = new Map(); rows = new Map(); beforeTx; afterReceipt;
  async getAccess(o, p, sub) { return sub === 'admin' ? clone(this.access.get(`${o}/${p}`) ?? {}) : {}; }
  async getPublication(o, p, id) { return clone(this.publications.get(`${o}/${p}/${id}`)); }
  async getProject(o, p) { return clone(this.configs.get(`${o}/${p}`)); }
  async getReceipt(o, p, key) { const value = clone(this.receipts.get(`${o}/${p}/${key}`)); if (value && this.afterReceipt) { const hook = this.afterReceipt; this.afterReceipt = undefined; await hook(); } return value; }
  async list(o, p, cursor, limit) {
    const values = [...this.publications.values()].filter(value => value.owner === `${o}/${p}`).sort((a, b) => a.releaseId.localeCompare(b.releaseId));
    const start = cursor ? values.findIndex(value => `PUBLICATION#${value.releaseId}` === cursor.SK) + 1 : 0;
    const page = values.slice(start, start + limit);
    return { publications: clone(page), nextCursor: start + limit < values.length ? { PK: `TENANT#${o}#PROJECT#${p}`, SK: `PUBLICATION#${page.at(-1).releaseId}` } : null };
  }
  async getPublicProject(slug) { return clone(this.projects.get(slug)); }
  async listPublic(slug, cursor, limit) {
    const values = [...this.rows.values()].filter(row => row.slug === slug).sort((a, b) => a.data.id.localeCompare(b.data.id));
    const start = cursor ? values.findIndex(row => `RELEASE#${row.data.id}` === cursor.SK) + 1 : 0;
    const page = values.slice(start, start + limit);
    return { releases: clone(page.map(value => value.data)), nextCursor: start + limit < values.length ? { PK: `PROJECT#${slug}`, SK: `RELEASE#${page.at(-1).data.id}` } : null };
  }
  async transact(command) {
    if (this.beforeTx) { const hook = this.beforeTx; this.beforeTx = undefined; await hook(); }
    const { context: c, publication, previousVersion, config, previousConfigVersion, publicRelease, receipt, operation, nowEpoch } = command;
    const owner = keyFor(c), access = this.access.get(owner);
    if (access?.membership?.active !== true || access?.project?.active !== true || access?.permission?.active !== true || access.permission.role !== 'administrator') throw new ApiError(403, 'FORBIDDEN', 'Acceso revocado.');
    if (operation === 'publish') {
      if (Object.hasOwn(access.project, 'writesFrozen') && access.project.writesFrozen !== false) throw new ApiError(403, 'FORBIDDEN', 'Proyecto modificado.');
      const plan = access.plan;
      if (plan?.active !== true || plan.plan !== 'plus' || (Object.hasOwn(plan, 'expiresAt') && (typeof plan.expiresAt !== 'number' || plan.expiresAt <= nowEpoch))) throw new ApiError(403, 'FORBIDDEN', 'Plan modificado.');
    }
    const resource = `${owner}/${publication.releaseId}`, saved = this.publications.get(resource), receiptKey = `${owner}/${receipt.key}`;
    if (this.receipts.has(receiptKey) || (previousVersion === null ? saved !== undefined : saved?.version !== previousVersion)) throw new ApiError(409, 'CONFLICT', 'Conflicto.');
    if (operation === 'publish') {
      const stored = this.configs.get(owner);
      if ((previousConfigVersion === null ? stored !== undefined : stored?.version !== previousConfigVersion) || (this.claims.has(config.slug) && this.claims.get(config.slug) !== owner)) throw new ApiError(409, 'CONFLICT', 'Slug o proyecto modificado.');
      this.claims.set(config.slug, owner); this.configs.set(owner, clone(config)); this.projects.set(config.slug, { slug: config.slug, name: config.name });
      this.rows.set(`${config.slug}/${publicRelease.id}`, { slug: config.slug, data: clone(publicRelease) });
    } else this.rows.delete(`${publication.slug}/${publication.publicId}`);
    this.publications.set(resource, { ...clone(publication), owner }); this.receipts.set(receiptKey, clone(receipt));
  }
}

function setup() {
  assert.equal(typeof implementation.createPublicationsService, 'function');
  const repository = new MemoryRepository(); let sequence = 0, fetched = 0;
  const evidence = async (c, id, revision) => { fetched++; return acta(c, id, revision); };
  const service = implementation.createPublicationsService(repository, { evidence, now: () => when, id: () => `00000000-0000-4000-8000-${String(++sequence).padStart(12, '0')}` });
  return { repository, service, fetched: () => fetched };
}

test('publishes only explicitly selected fields from a verified accepted revision and never private metadata', async () => {
  const { repository, service } = setup();
  const { publication } = await service.publish(context, 'release-1', input, 'publish-1');
  assert.equal(publication.releaseId, 'release-1'); assert.notEqual(publication.publicId, 'release-1');
  const result = await service.publicProject(input.slug);
  assert.deepEqual(result.project, { slug: input.slug, name: input.projectName });
  assert.deepEqual(Object.keys(result.releases[0]).sort(), ['id', 'revision', 'title', 'acceptedAt', 'publishedAt'].sort());
  assert.ok(!JSON.stringify(result).includes('private-')); assert.ok(!JSON.stringify(result).includes('release-1')); assert.ok(!JSON.stringify(result).includes(orgId));
  assert.equal(repository.rows.size, 1);
});

test('summary and changes are opt-in, title is mandatory and all unexpected body fields are rejected', async () => {
  const { service } = setup();
  for (const body of [{ ...input, fields: ['summary'] }, { ...input, fields: ['title', 'reason'] }, { ...input, fields: ['title', 'title'] }, { ...input, actor: 'attacker' }, { ...input, slug: 'AA' }, { ...input, revision: 0 }]) await assert.rejects(service.publish(context, 'release-1', body, 'invalid'), code('VALIDATION_ERROR'));
  await service.publish(context, 'release-1', { ...input, fields: ['title', 'summary', 'changes'] }, 'publish-full');
  const result = await service.publicProject(input.slug);
  assert.equal(result.releases[0].summary, 'Resumen seleccionado'); assert.deepEqual(result.releases[0].changes, ['Cambio seleccionado']);
});

test('authorization, Plus expiry and project freeze are checked before idempotent replay', async () => {
  for (const scenario of ['role', 'member', 'project', 'permission', 'plan', 'expiry', 'malformed-expiry', 'frozen']) {
    const { repository, service } = setup(); await service.publish(context, 'release-1', input, 'publish-1');
    const access = repository.access.get(keyFor(context));
    if (scenario === 'role') access.permission.role = 'editor';
    if (scenario === 'member') access.membership.active = false;
    if (scenario === 'project') access.project.active = false;
    if (scenario === 'permission') access.permission.active = false;
    if (scenario === 'plan') access.plan.active = false;
    if (scenario === 'expiry') access.plan.expiresAt = epoch;
    if (scenario === 'malformed-expiry') access.plan.expiresAt = 'future';
    if (scenario === 'frozen') access.project.writesFrozen = true;
    await assert.rejects(service.publish(context, 'release-1', input, 'publish-1'), error => [403, 423].includes(error.statusCode));
  }
});

test('publishing verifies route and revision binding, acceptance and manifest digest', async () => {
  for (const mutate of [value => { value.decision.outcome = 'changes_requested'; }, value => { value.revision.manifest.title = 'Tampered'; }, value => { value.orgId = 'foreign'; }, value => { value.decision.decidedAt = 'invalid'; }]) {
    const { repository } = setup();
    const service = implementation.createPublicationsService(repository, { evidence: async () => { const value = acta(); mutate(value); return value; }, now: () => when });
    await assert.rejects(service.publish(context, 'release-1', input, 'publish-invalid'), error => [409, 502].includes(error.statusCode));
    assert.equal(repository.rows.size, 0);
  }
});

test('publishing replays an exact receipt, rejects changed bodies and does not fetch evidence on replay', async () => {
  const { service, fetched } = setup();
  const initial = await service.publish(context, 'release-1', input, 'publish-1');
  assert.deepEqual(await service.publish(context, 'release-1', input, 'publish-1'), initial); assert.equal(fetched(), 1);
  await assert.rejects(service.publish(context, 'release-1', { ...input, fields: ['title', 'summary'] }, 'publish-1'), code('IDEMPOTENCY_CONFLICT'));
  await assert.rejects(service.publish(context, 'release-1', input, ''), code('VALIDATION_ERROR'));
});

test('revocation and plan expiry arriving before transaction block the public write', async () => {
  for (const mutate of [access => { access.membership.active = false; }, access => { access.plan.active = false; }, access => { access.project.writesFrozen = true; }]) {
    const { service, repository } = setup(); repository.beforeTx = () => mutate(repository.access.get(keyFor(context)));
    await assert.rejects(service.publish(context, 'release-1', input, 'publish-race'), error => [403, 423].includes(error.statusCode));
    assert.equal(repository.rows.size, 0);
  }
});

test('concurrent publishers commit one projection and same-key retries return one stable public id', async () => {
  const first = setup();
  const result = await Promise.allSettled([first.service.publish(context, 'release-1', input, 'race-1'), first.service.publish(context, 'release-1', input, 'race-2')]);
  assert.equal(result.filter(value => value.status === 'fulfilled').length, 1); assert.equal(first.repository.rows.size, 1);
  const second = setup();
  const [a, b] = await Promise.all([second.service.publish(context, 'release-1', input, 'same-key'), second.service.publish(context, 'release-1', input, 'same-key')]);
  assert.deepEqual(a, b); assert.equal(second.repository.rows.size, 1);
});

test('slug is globally unique and fixed for a project even after every publication is removed', async () => {
  const { repository, service } = setup(); await service.publish(context, 'release-1', input, 'publish-1');
  const other = { ...context, orgId: 'other' }; repository.access.set(keyFor(other), clone(repository.access.get(keyFor(context))));
  await assert.rejects(service.publish(other, 'release-1', input, 'other-key'), code('CONFLICT'));
  await service.unpublish(context, 'release-1', 'unpublish-1');
  await assert.rejects(service.publicProject(input.slug), code('NOT_FOUND'));
  const listing = await service.list(context);
  assert.deepEqual(listing.project, { slug: input.slug, name: input.projectName }); assert.deepEqual(listing.publications, []);
  await assert.rejects(service.publish(context, 'release-1', { ...input, slug: 'different-slug' }, 'new-slug'), code('SLUG_FIXED'));
});

test('unpublish and its replay remain available to active administrators when Plus expires or writes freeze', async () => {
  const { repository, service } = setup(); await service.publish(context, 'release-1', input, 'publish-1');
  const access = repository.access.get(keyFor(context)); access.plan.active = false; access.project.writesFrozen = true;
  const removed = await service.unpublish(context, 'release-1', 'unpublish-1'); assert.equal(removed.publication.active, false);
  assert.deepEqual(await service.unpublish(context, 'release-1', 'unpublish-1'), removed);
  await assert.rejects(service.publicProject(input.slug), code('NOT_FOUND'));
  access.permission.active = false;
  await assert.rejects(service.unpublish(context, 'release-1', 'unpublish-1'), code('FORBIDDEN'));
});

test('public and private pagination are bounded and reject cursors for another project or record type', async () => {
  const { service } = setup();
  await service.publish(context, 'release-1', input, 'publish-1'); await service.publish(context, 'release-2', input, 'publish-2');
  const first = await service.publicProject(input.slug, undefined, 1); assert.equal(first.releases.length, 1); assert.ok(first.nextCursor);
  const second = await service.publicProject(input.slug, first.nextCursor, 1); assert.equal(second.releases.length, 1); assert.notEqual(first.releases[0].id, second.releases[0].id);
  for (const limit of [0, 51, 1.5, 'NaN']) await assert.rejects(service.publicProject(input.slug, undefined, limit), code('VALIDATION_ERROR'));
  const foreign = Buffer.from(JSON.stringify({ slug: 'different', key: { PK: 'PROJECT#different', SK: 'RELEASE#00000000-0000-4000-8000-000000000001' } })).toString('base64url');
  await assert.rejects(service.publicProject(input.slug, foreign), code('VALIDATION_ERROR'));
  await assert.rejects(service.list({ ...context, orgId: 'foreign' }), code('FORBIDDEN'));
});

test('public reader reconstructs the exact DTO allowlist even if a repository item has extra private fields', async () => {
  const { repository, service } = setup(); await service.publish(context, 'release-1', { ...input, fields: ['title', 'summary', 'changes'] }, 'publish-1');
  repository.projects.get(input.slug).orgId = 'private-org';
  repository.rows.values().next().value.data.actor = 'private-actor'; repository.rows.values().next().value.data.releaseId = 'private-release';
  const result = await service.publicProject(input.slug);
  assert.deepEqual(Object.keys(result.project).sort(), ['name', 'slug']);
  assert.deepEqual(Object.keys(result.releases[0]).sort(), ['id', 'revision', 'title', 'summary', 'changes', 'acceptedAt', 'publishedAt'].sort());
});

test('a plan or permission revoked while reading an idempotency receipt also blocks its replay', async () => {
  const publish = setup(); await publish.service.publish(context, 'release-1', input, 'publish-1');
  publish.repository.afterReceipt = () => { publish.repository.access.get(keyFor(context)).plan.active = false; };
  await assert.rejects(publish.service.publish(context, 'release-1', input, 'publish-1'), code('PLUS_REQUIRED'));
  const unpublish = setup(); await unpublish.service.publish(context, 'release-1', input, 'publish-1'); await unpublish.service.unpublish(context, 'release-1', 'unpublish-1');
  unpublish.repository.afterReceipt = () => { unpublish.repository.access.get(keyFor(context)).permission.active = false; };
  await assert.rejects(unpublish.service.unpublish(context, 'release-1', 'unpublish-1'), code('FORBIDDEN'));
});

test('a concurrent winner receipt is recovered when building a retry observes a state conflict', async () => {
  const { repository, service } = setup(); const initial = await service.publish(context, 'release-1', input, 'publish-1');
  const originalGetReceipt = repository.getReceipt.bind(repository); let first = true;
  repository.getReceipt = (...args) => { if (first) { first = false; return undefined; } return originalGetReceipt(...args); };
  const retry = implementation.createPublicationsService(repository, { evidence: async () => { throw new ApiError(409, 'CONFLICT', 'Otra publicación ganó.'); }, now: () => when });
  assert.deepEqual(await retry.publish(context, 'release-1', input, 'publish-1'), initial);
  assert.equal(repository.rows.size, 1);
});
