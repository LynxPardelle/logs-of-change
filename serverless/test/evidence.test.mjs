import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { canonical, createEvidenceHandler, verifyActa } from '../src/evidence/index.mjs';

const path = '/api/v1/evidence/orgs/agency/projects/pilot/releases/delivery/revisions/1/acta';
const event = { rawPath: path, headers: { authorization: 'Bearer test' }, requestContext: { authorizer: { jwt: { claims: { sub: 'reviewer' } } } } };

test('evidence propagates current authorization denial instead of exporting old evidence', async () => {
  const handler = createEvidenceHandler({ releasesOrigin: 'https://example.execute-api.us-east-1.amazonaws.com', fetcher: async () => new Response('{}', { status: 403 }) });
  assert.equal((await handler(event)).statusCode, 403);
});

test('verification detects modified evidence', () => {
  assert.equal(verifyActa({ revision: { manifest: { title: 'tampered' }, digest: '0'.repeat(64) } }), false);
});

test('restoring the brand preserves verification of previously exported actas', () => {
  const previous = validActa();
  previous.schema = 'logs-of-change.acta.v1';
  assert.equal(verifyActa(previous), true);
  previous.schema = 'unrecognized.acta.v1';
  assert.equal(verifyActa(previous), false);
});

test('evidence requires a verified subject and never accepts unbounded paths', async () => {
  const handler = createEvidenceHandler({ releasesOrigin: 'https://example.execute-api.us-east-1.amazonaws.com', fetcher: () => { throw new Error('unexpected request'); } });
  assert.equal((await handler({ rawPath: path, headers: {} })).statusCode, 401);
  assert.equal((await handler({ ...event, rawPath: '/api/v1/evidence/../../private' })).statusCode, 404);
});

function validActa(orgId = 'agency') {
  const manifest = { orgId, projectId: 'pilot', releaseId: 'delivery', revision: 1, title: 'Milestone' };
  const digest = createHash('sha256').update(canonical(manifest)).digest('hex');
  return { schema: 'logsofchange.acta.v1', orgId, projectId: 'pilot', releaseId: 'delivery', revision: { number: 1, manifest, digest }, decision: { revision: 1, manifestDigest: digest, actor: 'reviewer', outcome: 'accepted', decidedAt: '2026-11-19T00:00:00.000Z' } };
}

test('acta verification binds route identifiers, revision and decision to the hashed content', () => {
  const original = validActa();
  assert.equal(verifyActa(original), true);
  for (const mutate of [
    (copy) => { copy.orgId = 'other'; },
    (copy) => { copy.decision.revision = 2; },
    (copy) => { copy.decision.manifestDigest = '0'.repeat(64); },
    (copy) => { copy.revision.number = 2; },
  ]) {
    const copy = structuredClone(original); mutate(copy);
    assert.equal(verifyActa(copy), false);
  }
});

test('acta accepts every valid release identifier and rejects an unrelated upstream decision', async () => {
  const original = validActa('a'.repeat(128));
  const handler = createEvidenceHandler({ releasesOrigin: 'https://example.execute-api.us-east-1.amazonaws.com', fetcher: async () => Response.json(original) });
  assert.equal((await handler({ ...event, rawPath: path.replace('agency', original.orgId) })).statusCode, 200);
  const invalid = validActa(); invalid.decision.revision = 2;
  const invalidHandler = createEvidenceHandler({ releasesOrigin: 'https://example.execute-api.us-east-1.amazonaws.com', fetcher: async () => Response.json(invalid) });
  assert.equal((await invalidHandler(event)).statusCode, 502);
});
