import assert from 'node:assert/strict';
import test from 'node:test';

const implementation = await import('../src/publications/http.mjs').catch(() => ({}));
const evidenceImplementation = await import('../src/publications/evidence.mjs').catch(() => ({}));
const event = (method = 'POST', body = '{}') => ({ rawPath: '/api/v1/publications/orgs/agency/projects/pilot/releases/release-1', body,
  headers: { authorization: 'Bearer verified.access.token', 'idempotency-key': 'attempt' }, requestContext: { http: { method }, authorizer: { jwt: { claims: { sub: 'admin', token_use: 'access', scope: 'openid profile' } } } } });

test('private publication HTTP requires a gateway verified access JWT and preserves its original bearer for evidence', async () => {
  assert.equal(typeof implementation.createPublicationsHandler, 'function'); const calls = [];
  const handler = implementation.createPublicationsHandler({ publish: async (...args) => { calls.push(args); return { publication: { active: true } }; } });
  assert.equal((await handler(event())).statusCode, 200); assert.equal(calls[0][0].authorization, 'Bearer verified.access.token'); assert.equal(calls[0][3], 'attempt');
  for (const bad of [value => { delete value.requestContext.authorizer; }, value => { value.requestContext.authorizer.jwt.claims.token_use = 'id'; }, value => { value.requestContext.authorizer.jwt.claims.scope = 'email'; }]) { const value = event(); bad(value); assert.equal((await handler(value)).statusCode, 401); }
});

test('private HTTP rejects malformed or oversized JSON and sanitizes unexpected failures', async () => {
  assert.equal(typeof implementation.createPublicationsHandler, 'function');
  const handler = implementation.createPublicationsHandler({ publish: async () => { throw new Error('private-client-secret'); } });
  assert.equal((await handler(event('POST', '{'))).statusCode, 400);
  assert.equal((await handler(event('POST', ' '.repeat(65537)))).statusCode, 413);
  const result = await handler(event()); assert.equal(result.statusCode, 500); assert.ok(!result.body.includes('private-client-secret'));
  assert.equal(result.headers['cache-control'], 'no-store');
});

test('public HTTP exposes only the public route, uses no-store and forwards bounded selectors', async () => {
  assert.equal(typeof implementation.createPublicHandler, 'function'); const calls = [];
  const handler = implementation.createPublicHandler({ publicProject: async (...args) => { calls.push(args); return { project: { slug: 'public-project', name: 'Public' }, releases: [], nextCursor: null }; } });
  const value = { rawPath: '/api/v1/public/projects/public-project', queryStringParameters: { limit: '2', cursor: 'cursor' }, requestContext: { http: { method: 'GET' } } };
  const result = await handler(value); assert.equal(result.statusCode, 200); assert.equal(result.headers['cache-control'], 'no-store'); assert.deepEqual(calls[0], ['public-project', 'cursor', '2']);
  assert.equal((await handler({ ...value, rawPath: '/api/v1/publications/orgs/private/projects/private/releases' })).statusCode, 404);
  assert.equal((await handler({ ...value, requestContext: { http: { method: 'POST' } } })).statusCode, 405);
});

test('external browsers may read public JSON without credentials while private responses have no wildcard CORS', async () => {
  const publicHandler = implementation.createPublicHandler({ publicProject: async () => ({ project: { slug: 'public-project', name: 'Public' }, releases: [], nextCursor: null }) });
  const result = await publicHandler({ rawPath: '/api/v1/public/projects/public-project', headers: { origin: 'https://another-project.example' }, requestContext: { http: { method: 'GET' } } });
  assert.equal(result.statusCode, 200); assert.equal(result.headers['access-control-allow-origin'], '*'); assert.equal(result.headers['access-control-allow-credentials'], undefined);
  const privateHandler = implementation.createPublicationsHandler({ publish: async () => ({ publication: {} }) });
  const privateResponse = await privateHandler(event()); assert.equal(privateResponse.headers['access-control-allow-origin'], undefined);
  const error = await publicHandler({ rawPath: '/api/v1/public/no-such-route', requestContext: { http: { method: 'GET' } } });
  assert.equal(error.headers['access-control-allow-origin'], '*');
});

test('evidence reader forwards only the original JWT to its configured AWS API without redirects', async () => {
  assert.equal(typeof evidenceImplementation.createEvidenceReader, 'function'); const calls = [];
  const reader = evidenceImplementation.createEvidenceReader({ evidenceOrigin: 'https://evidence123.execute-api.us-east-1.amazonaws.com', fetcher: async (...args) => { calls.push(args); return new Response('{}', { status: 200 }); } });
  await reader({ orgId: 'agency', projectId: 'pilot', authorization: 'Bearer verified.access.token' }, 'release-1', 2);
  assert.equal(calls[0][0], 'https://evidence123.execute-api.us-east-1.amazonaws.com/api/v1/evidence/orgs/agency/projects/pilot/releases/release-1/revisions/2/acta');
  assert.deepEqual(calls[0][1].headers, { authorization: 'Bearer verified.access.token' }); assert.equal(calls[0][1].redirect, 'error');
  let fetched = false;
  const unsafe = evidenceImplementation.createEvidenceReader({ evidenceOrigin: 'https://attacker.example', fetcher: async () => { fetched = true; } });
  await assert.rejects(unsafe({}, 'release-1', 1), error => error.statusCode === 503); assert.equal(fetched, false);
});

test('evidence reader propagates authorization denial without exposing response bodies', async () => {
  const reader = evidenceImplementation.createEvidenceReader({ evidenceOrigin: 'https://evidence123.execute-api.us-east-1.amazonaws.com', fetcher: async () => new Response('private-secret', { status: 403 }) });
  await assert.rejects(reader(contextForEvidence(), 'release-1', 1), error => error.statusCode === 403 && !error.message.includes('private-secret'));
});

function contextForEvidence() { return { orgId: 'agency', projectId: 'pilot', authorization: 'Bearer verified.access.token' }; }

test('evidence reader cancels an oversized response while reading instead of buffering the complete body', async () => {
  let cancelled = false;
  const body = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(131073)); }, cancel() { cancelled = true; } });
  const reader = evidenceImplementation.createEvidenceReader({ evidenceOrigin: 'https://evidence123.execute-api.us-east-1.amazonaws.com', fetcher: async () => new Response(body, { status: 200 }) });
  let timeout;
  const deadline = new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('The reader did not bound its stream.')), 1000); });
  try { await assert.rejects(Promise.race([reader(contextForEvidence(), 'release-1', 1), deadline]), error => error.statusCode === 503); }
  finally { clearTimeout(timeout); }
  assert.equal(cancelled, true);
});
