import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { normalizeExport, compareProjection } from '../scripts/migration/normalize.mjs';

const fixtureUrl = new URL('../scripts/migration/fixtures/synthetic-export.json', import.meta.url);
const cli = fileURLToPath(new URL('../scripts/migration/cli.mjs', import.meta.url));
const fixture = JSON.parse(await readFile(fixtureUrl, 'utf8'));
const copy = () => structuredClone(fixture);

test('creates deterministic historical evidence without approval or excluded secrets', () => {
  const report = normalizeExport(copy());
  assert.equal(report.valid, true);
  assert.equal(report.projection.history.length, 1);
  const history = report.projection.history[0];
  assert.equal(history.status, 'historical');
  assert.equal(history.approved, false);
  assert.equal(history.revision, null);
  assert.deepEqual(history.decisions, []);
  assert.equal(history.provenance.legacyLogId, 'log-1');
  assert.match(history.contentDigest, /^[a-f0-9]{64}$/);
  const serialized = JSON.stringify(report);
  assert.doesNotMatch(serialized, /synthetic-secret|synthetic-person|synthetic-url-secret|apiKeys|members/);
  assert.equal(report.projection.records.files[0].location, 'https://example.invalid/legacy/ejemplo.svg');
  assert.equal(normalizeExport(copy()).projectionDigest, report.projectionDigest);
});

test('keeps collection order out of the digest but preserves meaningful reference order', () => {
  const original = normalizeExport(copy());
  const reordered = copy();
  reordered.collections.logTexts.reverse();
  assert.equal(normalizeExport(reordered).projectionDigest, original.projectionDigest);
  reordered.collections.logSections[0].texts.push('text-title');
  assert.notEqual(normalizeExport(reordered).projectionDigest, original.projectionDigest);
});

test('normalizes Mongo ObjectId and Extended JSON dates', () => {
  const input = copy();
  input.collections.logs[0]._id = { $oid: 'ABCDEF0123456789ABCDEF01' };
  input.collections.changeLogs[0].logs = [{ $oid: 'abcdef0123456789abcdef01' }];
  input.collections.logs[0].date = { $date: '2026-11-18T12:00:00Z' };
  const report = normalizeExport(input);
  assert.equal(report.valid, true);
  assert.equal(report.projection.records.logs[0].id, 'abcdef0123456789abcdef01');
  assert.equal(report.projection.records.logs[0].date, '2026-11-18T12:00:00.000Z');
});

test('blocks colliding normalized IDs, dangling references and invalid dates', () => {
  const input = copy();
  input.collections.logTexts.push({ _id: 'text-body', text: 'conflicting record', position: 3 });
  input.collections.logSections[0].media.push('missing-media');
  input.collections.logs[0].date = '2026-02-30T12:00:00Z';
  const report = normalizeExport(input);
  assert.equal(report.valid, false);
  assert.equal(report.projection, null);
  assert(report.issues.some((issue) => issue.code === 'DUPLICATE_ID'));
  assert(report.issues.some((issue) => issue.code === 'ORPHAN_REFERENCE'));
  assert(report.issues.some((issue) => issue.code === 'INVALID_DATE'));
});

test('refuses unmapped projects and unreachable records instead of mixing tenants', () => {
  const input = copy();
  input.collections.projects.push({ _id: 'other-project', name: 'Another tenant', changeLog: 'changelog-1' });
  input.collections.logs.push({ _id: 'unrelated-log', logSections: [] });
  const report = normalizeExport(input);
  assert.equal(report.valid, false);
  assert(report.issues.some((issue) => issue.code === 'UNMAPPED_PROJECT'));
  assert(report.issues.some((issue) => issue.code === 'UNREACHABLE_RECORD'));
});

test('requires mapping and valid collection types and rejects malformed populated identifiers', () => {
  const input = copy();
  delete input.mapping.orgId;
  input.collections.logs = 'not an array';
  input.collections.projects[0].changeLog = { anything: 'unknown reference' };
  const report = normalizeExport(input);
  assert.equal(report.valid, false);
  assert(report.issues.some((issue) => issue.code === 'INVALID_MAPPING'));
  assert(report.issues.some((issue) => issue.code === 'INVALID_COLLECTION'));
  assert(report.issues.some((issue) => issue.code === 'INVALID_REFERENCE'));
});

test('blocks incomplete business records and reports IDs normalized from numeric DAO values', () => {
  const input = copy();
  delete input.collections.logTexts[0].text;
  input.collections.combos = [{ _id: 1, name: 'numeric' }, { _id: '1', name: 'string collision' }];
  input.collections.changeLogs[0].logCombosDefault = [1];
  input.collections.logTexts[1].combos = ['1'];
  const report = normalizeExport(input);
  assert.equal(report.valid, false);
  assert(report.issues.some((issue) => issue.code === 'MISSING_FIELD' && issue.collection === 'logTexts'));
  assert(report.issues.some((issue) => issue.code === 'DUPLICATE_ID' && issue.id === '1'));
});

test('requires target organization and project IDs compatible with the protected API', () => {
  const input = copy();
  input.mapping.orgId = 'agency.invalid';
  const report = normalizeExport(input);
  assert.equal(report.valid, false);
  assert(report.issues.some((issue) => issue.code === 'INVALID_MAPPING' && issue.path === 'orgId'));
});

test('parity detects modifications, omissions and invented historical decisions without echoing values', () => {
  const expected = normalizeExport(copy()).projection;
  assert.equal(compareProjection(expected, structuredClone(expected)).matches, true);
  const changed = structuredClone(expected);
  changed.history[0].decisions.push({ outcome: 'accepted', secret: 'must-not-echo' });
  changed.records.logTexts.pop();
  const parity = compareProjection(expected, changed);
  assert.equal(parity.matches, false);
  assert(parity.differences.length >= 2);
  assert.doesNotMatch(JSON.stringify(parity), /must-not-echo/);
});

test('CLI validates only the explicitly supplied JSON and never mutates it', async () => {
  const before = await readFile(fixtureUrl, 'utf8');
  const result = spawnSync(process.execPath, [cli, '--input', fileURLToPath(fixtureUrl)], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.mode, 'validate-only');
  assert.equal(report.valid, true);
  assert.equal(await readFile(fixtureUrl, 'utf8'), before);
  const unsupported = spawnSync(process.execPath, [cli, '--input', fileURLToPath(fixtureUrl), '--apply'], { encoding: 'utf8' });
  assert.equal(unsupported.status, 2);
  assert.equal(JSON.parse(unsupported.stdout).error.code, 'INVALID_ARGUMENTS');
});
