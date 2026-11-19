import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { createReleasesService, canonicalJson, ApiError } from '../src/releases/domain.mjs';

const orgId = 'agency';
const projectId = 'pilot';
const editor = { orgId, projectId, sub: 'editor' };
const reviewer = { orgId, projectId, sub: 'reviewer' };
const content = { title: 'Primer hito', summary: 'Entrega para revisar', changes: ['Formulario accesible'] };

class MemoryRepository {
  access = new Map(['editor', 'reviewer', 'other-reviewer', 'administrator'].map((sub) => [sub, {
    membership: { active: true }, project: { active: true },
    permission: { active: true, role: sub === 'editor' ? 'editor' : sub === 'administrator' ? 'administrator' : 'reviewer' },
  }]));
  releases = new Map(); revisions = new Map(); decisions = new Map(); receipts = new Map();
  async getAccess(o, p, sub) { return o === orgId && p === projectId ? structuredClone(this.access.get(sub) ?? {}) : {}; }
  async getRelease(o, p, id) { return structuredClone(this.releases.get(`${o}/${p}/${id}`)); }
  async list(o, p, cursor, limit) {
    const all = [...this.releases.values()].filter((r) => r.orgId === o && r.projectId === p).sort((a, b) => a.id.localeCompare(b.id));
    const start = cursor ? all.findIndex((r) => r.id === cursor.id) + 1 : 0;
    const releases = all.slice(start, start + limit);
    return { releases: structuredClone(releases), nextCursor: start + limit < all.length ? { id: releases.at(-1).id } : null };
  }
  async getReceipt(o, p, key) { return structuredClone(this.receipts.get(`${o}/${p}/${key}`)); }
  async getRevision(o, p, id, n) { return structuredClone(this.revisions.get(`${o}/${p}/${id}/${n}`)); }
  async getDecision(o, p, id, n) { return structuredClone(this.decisions.get(`${o}/${p}/${id}/${n}`)); }
  async getHistory(o, p, id) {
    const prefix = `${o}/${p}/${id}/`;
    return { revisions: [...this.revisions.entries()].filter(([k]) => k.startsWith(prefix)).map(([, v]) => structuredClone(v)),
      decisions: [...this.decisions.entries()].filter(([k]) => k.startsWith(prefix)).map(([, v]) => structuredClone(v)) };
  }
  async transact(command) {
    const { context, roles, previousVersion, release, revision, decision, receipt } = command;
    const access = this.access.get(context.sub);
    const resource = `${context.orgId}/${context.projectId}/${release.id}`;
    const receiptKey = `${context.orgId}/${context.projectId}/${receipt.key}`;
    const stored = this.releases.get(resource);
    if (!access?.membership?.active || !access?.project?.active || !access?.permission?.active || !roles.includes(access.permission.role)) {
      throw new ApiError(403, 'FORBIDDEN', 'Acceso revocado.');
    }
    if (Object.hasOwn(access.project, 'writesFrozen') && access.project.writesFrozen !== false) {
      // A failed project ConditionCheck is reclassified after a fresh authorization read.
      throw new ApiError(403, 'FORBIDDEN', 'La condición de proyecto cambió.');
    }
    if (this.receipts.has(receiptKey) || (previousVersion === null ? stored !== undefined : stored?.version !== previousVersion)
      || (revision && this.revisions.has(`${resource}/${revision.number}`)) || (decision && this.decisions.has(`${resource}/${decision.revision}`))) {
      throw new ApiError(409, 'CONFLICT', 'El estado cambió.');
    }
    this.releases.set(resource, structuredClone(release));
    if (revision) this.revisions.set(`${resource}/${revision.number}`, structuredClone(revision));
    if (decision) this.decisions.set(`${resource}/${decision.revision}`, structuredClone(decision));
    this.receipts.set(receiptKey, structuredClone(receipt));
  }
}

function setup() {
  const repository = new MemoryRepository();
  let id = 0;
  const service = createReleasesService(repository, { id: () => `release-${++id}`, now: () => '2026-11-19T12:00:00.000Z' });
  return { service, repository };
}
const code = (value) => (error) => error.code === value;

test('creates a draft and denies another organization or project every read', async () => {
  const { service } = setup();
  const { release } = await service.create(editor, content, 'draft-1');
  assert.equal(release.status, 'draft');
  assert.equal(release.revision, 1);
  assert.equal((await service.list(editor)).releases.length, 1);
  for (const context of [{ ...editor, orgId: 'foreign' }, { ...editor, projectId: 'foreign' }]) {
    await assert.rejects(service.detail(context, release.id), code('FORBIDDEN'));
    await assert.rejects(service.list(context), code('FORBIDDEN'));
  }
});

test('requires an active project grant and editor role for drafts', async () => {
  const { service, repository } = setup();
  await assert.rejects(service.create(reviewer, content, 'draft-1'), code('FORBIDDEN'));
  repository.access.get('editor').permission.active = false;
  await assert.rejects(service.create(editor, content, 'draft-2'), code('FORBIDDEN'));
});

test('replays the original result after status changes but rejects a changed payload', async () => {
  const { service } = setup();
  const draft = await service.create(editor, content, 'draft-1');
  await service.submit(editor, draft.release.id, { expectedRevision: 1 }, 'submit-1');
  assert.deepEqual(await service.create(editor, content, 'draft-1'), draft);
  await assert.rejects(service.create(editor, { ...content, title: 'Otra entrega' }, 'draft-1'), code('IDEMPOTENCY_CONFLICT'));
});

test('checks authorization before replaying an idempotent response', async () => {
  const { service, repository } = setup();
  await service.create(editor, content, 'draft-1');
  repository.access.get('editor').membership.active = false;
  await assert.rejects(service.create(editor, content, 'draft-1'), code('FORBIDDEN'));
});

test('submission freezes a canonical manifest and digest for its exact revision', async () => {
  const { service } = setup();
  const { release } = await service.create(editor, content, 'draft-1');
  const result = await service.submit(editor, release.id, { expectedRevision: 1 }, 'submit-1');
  assert.equal(result.release.status, 'pending_review');
  assert.equal(result.revision.number, 1);
  assert.equal(result.revision.digest, createHash('sha256').update(canonicalJson(result.revision.manifest)).digest('hex'));
  assert.equal(result.revision.manifest.title, content.title);
  assert.deepEqual(await service.submit(editor, release.id, { expectedRevision: 1 }, 'submit-1'), result);
});

test('only a separate authorized reviewer can decide and change requests need a reason', async () => {
  const { service, repository } = setup();
  const { release } = await service.create(editor, content, 'draft-1');
  await service.submit(editor, release.id, { expectedRevision: 1 }, 'submit-1');
  await assert.rejects(service.decide(editor, release.id, { expectedRevision: 1, outcome: 'accepted' }, 'decision-1'), code('FORBIDDEN'));
  repository.access.get('editor').permission.role = 'administrator';
  await assert.rejects(service.decide(editor, release.id, { expectedRevision: 1, outcome: 'accepted' }, 'decision-2'), code('SELF_REVIEW'));
  await assert.rejects(service.decide(reviewer, release.id, { expectedRevision: 1, outcome: 'changes_requested' }, 'decision-3'), code('VALIDATION_ERROR'));
  const { decision } = await service.decide(reviewer, release.id, { expectedRevision: 1, outcome: 'accepted' }, 'decision-4');
  assert.equal(decision.actor, 'reviewer');
  assert.equal(decision.revision, 1);
});

test('two competing reviewers produce exactly one final decision', async () => {
  const { service } = setup();
  const { release } = await service.create(editor, content, 'draft-1');
  await service.submit(editor, release.id, { expectedRevision: 1 }, 'submit-1');
  const results = await Promise.allSettled([
    service.decide(reviewer, release.id, { expectedRevision: 1, outcome: 'accepted' }, 'decision-1'),
    service.decide({ ...reviewer, sub: 'other-reviewer' }, release.id, { expectedRevision: 1, outcome: 'changes_requested', reason: 'Revisar texto' }, 'decision-2'),
  ]);
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal(results.filter((result) => result.status === 'rejected' && result.reason.statusCode === 409).length, 1);
  assert.equal((await service.detail(editor, release.id)).decisions.length, 1);
});

test('a new revision preserves old decisions and requires a new decision', async () => {
  const { service } = setup();
  const { release } = await service.create(editor, content, 'draft-1');
  const first = await service.submit(editor, release.id, { expectedRevision: 1 }, 'submit-1');
  await service.decide(reviewer, release.id, { expectedRevision: 1, outcome: 'changes_requested', reason: 'Agregar ayuda' }, 'decision-1');
  const next = await service.revise(editor, release.id, { ...content, changes: ['Ayuda agregada'], expectedRevision: 1 }, 'revision-2');
  assert.equal(next.release.revision, 2);
  assert.equal(next.release.status, 'draft');
  await assert.rejects(service.decide(reviewer, release.id, { expectedRevision: 1, outcome: 'accepted' }, 'decision-stale'), code('CONFLICT'));
  await service.submit(editor, release.id, { expectedRevision: 2 }, 'submit-2');
  await service.decide(reviewer, release.id, { expectedRevision: 2, outcome: 'accepted' }, 'decision-2');
  const history = await service.detail(editor, release.id);
  assert.equal(history.revisions.length, 2);
  assert.equal(history.decisions.length, 2);
  assert.deepEqual(history.revisions[0], first.revision);
  assert.equal((await service.revision(editor, release.id, 1)).decision.outcome, 'changes_requested');
});

test('authorization revoked between read and write also blocks the transaction', async () => {
  const { service, repository } = setup();
  const transaction = repository.transact.bind(repository);
  repository.transact = async (command) => {
    repository.access.get('editor').permission.active = false;
    return transaction(command);
  };
  await assert.rejects(service.create(editor, content, 'draft-1'), code('FORBIDDEN'));
  assert.equal(repository.releases.size, 0);
});

test('rejects unverified attachments, unknown fields, missing idempotency key and stale revision', async () => {
  const { service } = setup();
  await assert.rejects(service.create(editor, { ...content, attachments: [{ key: 'arbitrary' }] }, 'draft-1'), code('ATTACHMENTS_UNAVAILABLE'));
  await assert.rejects(service.create(editor, { ...content, approved: true }, 'draft-1'), code('VALIDATION_ERROR'));
  await assert.rejects(service.create(editor, content), code('VALIDATION_ERROR'));
  const { release } = await service.create(editor, content, 'draft-2');
  await assert.rejects(service.submit(editor, release.id, { expectedRevision: 2 }, 'submit-1'), code('CONFLICT'));
});

test('simultaneous retries with one key return one original draft', async () => {
  const { service, repository } = setup();
  const [first, second] = await Promise.all([
    service.create(editor, content, 'one-attempt'),
    service.create(editor, content, 'one-attempt'),
  ]);
  assert.deepEqual(first, second);
  assert.equal(repository.releases.size, 1);
  assert.equal(repository.receipts.size, 1);
});

test('pagination is bounded and a cursor cannot cross projects', async () => {
  const { service } = setup();
  await service.create(editor, content, 'draft-1');
  await service.create(editor, content, 'draft-2');
  const first = await service.list(editor, undefined, 1);
  assert.equal(first.releases.length, 1);
  assert.ok(first.nextCursor);
  const second = await service.list(editor, first.nextCursor, 1);
  assert.equal(second.releases.length, 1);
  assert.notEqual(second.releases[0].id, first.releases[0].id);
  assert.equal(second.nextCursor, null);
  const foreign = Buffer.from(JSON.stringify({ orgId: 'other', projectId, key: { id: 'release-1' } })).toString('base64url');
  await assert.rejects(service.list(editor, foreign), code('VALIDATION_ERROR'));
  await assert.rejects(service.list(editor, undefined, 1000), code('VALIDATION_ERROR'));
});

test('an accepted delivery cannot be changed or submitted again with another key', async () => {
  const { service } = setup();
  const { release } = await service.create(editor, content, 'draft-1');
  await service.submit(editor, release.id, { expectedRevision: 1 }, 'submit-1');
  await service.decide(reviewer, release.id, { expectedRevision: 1, outcome: 'accepted' }, 'decision-1');
  await assert.rejects(service.revise(editor, release.id, { ...content, expectedRevision: 1 }, 'revise-1'), code('CONFLICT'));
  await assert.rejects(service.submit(editor, release.id, { expectedRevision: 1 }, 'submit-2'), code('CONFLICT'));
});

test('project freeze keeps authorized history readable and blocks all commands including receipt replay', async () => {
  const { service, repository } = setup();
  const draft = await service.create(editor, content, 'draft-1');
  const presented = await service.submit(editor, draft.release.id, { expectedRevision: 1 }, 'submit-1');
  for (const access of repository.access.values()) access.project.writesFrozen = true;
  assert.equal((await service.list(editor)).releases.length, 1);
  assert.equal((await service.detail(reviewer, draft.release.id)).release.status, 'pending_review');
  assert.deepEqual((await service.revision(reviewer, draft.release.id, 1)).revision, presented.revision);
  for (const operation of [
    () => service.create(editor, content, 'draft-2'),
    () => service.create(editor, content, 'draft-1'),
    () => service.submit(editor, draft.release.id, { expectedRevision: 1 }, 'submit-1'),
    () => service.decide(reviewer, draft.release.id, { expectedRevision: 1, outcome: 'accepted' }, 'decision-1'),
    () => service.revise(editor, draft.release.id, { ...content, expectedRevision: 1 }, 'revision-2'),
  ]) await assert.rejects(operation(), (error) => error.statusCode === 423 && error.code === 'WRITES_FROZEN');
  assert.equal(repository.receipts.size, 2);
  assert.equal(repository.decisions.size, 0);
});

test('only a missing or explicitly false freeze flag permits a command', async () => {
  const { service, repository } = setup();
  for (const value of [true, null, 'false', 0, {}, undefined]) {
    repository.access.get('editor').project.writesFrozen = value;
    await assert.rejects(service.create(editor, content, 'draft-1'), code('WRITES_FROZEN'));
  }
  repository.access.get('editor').project.writesFrozen = false;
  assert.equal((await service.create(editor, content, 'draft-1')).release.status, 'draft');
  delete repository.access.get('editor').project.writesFrozen;
  assert.equal((await service.create(editor, content, 'draft-2')).release.status, 'draft');
});

test('freeze arriving between authorization and transaction is classified as 423 after a fresh read', async () => {
  const { service, repository } = setup();
  const transact = repository.transact.bind(repository);
  repository.transact = async (command) => {
    repository.access.get('editor').project.writesFrozen = true;
    return transact(command);
  };
  await assert.rejects(service.create(editor, content, 'draft-1'), (error) => error.statusCode === 423 && error.code === 'WRITES_FROZEN');
  assert.equal(repository.releases.size, 0);
});

test('revoked access still returns 403 even when project writes are frozen', async () => {
  const { service, repository } = setup();
  const transact = repository.transact.bind(repository);
  repository.transact = async (command) => {
    repository.access.get('editor').membership.active = false;
    repository.access.get('editor').project.writesFrozen = true;
    return transact(command);
  };
  await assert.rejects(service.create(editor, content, 'draft-1'), (error) => error.statusCode === 403 && error.code === 'FORBIDDEN');
  assert.equal(repository.releases.size, 0);
});
