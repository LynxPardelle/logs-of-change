import assert from 'node:assert/strict';
import test from 'node:test';
import { createReleasesHandler } from '../src/releases/http.mjs';

const base = '/api/v1/orgs/acme/projects/pilot/releases';
const event = (method, path = base, body) => ({ rawPath: path, body: body === undefined ? undefined : JSON.stringify(body),
  headers: { 'idempotency-key': 'attempt-1' }, requestContext: { http: { method }, authorizer: { jwt: { claims: { sub: 'editor', token_use: 'access', scope: 'openid profile' } } } } });

test('maps a verified access token and route to the service without trusting request actor', async () => {
  let received;
  const handler = createReleasesHandler({ create: async (...args) => { received = args; return { release: { id: 'r1' } }; } });
  const result = await handler(event('POST', base, { title: 'Hito', summary: '', changes: [] }));
  assert.equal(result.statusCode, 201);
  assert.deepEqual(received[0], { orgId: 'acme', projectId: 'pilot', sub: 'editor' });
  assert.equal(received[2], 'attempt-1');
  assert.equal(result.headers['cache-control'], 'no-store');
});

test('rejects identity tokens, missing scopes and unauthenticated requests', async () => {
  const handler = createReleasesHandler({});
  for (const claims of [{ sub: 'user', token_use: 'id', scope: 'openid' }, { sub: 'user', token_use: 'access', scope: '' }, {}]) {
    const request = event('GET'); request.requestContext.authorizer.jwt.claims = claims;
    assert.equal((await handler(request)).statusCode, 401);
  }
});

test('rejects malformed and oversized JSON and hides unexpected server error details', async (t) => {
  t.mock.method(console, 'error', () => {});
  const handler = createReleasesHandler({ create: async () => { throw new Error('private-database-message'); } });
  const malformed = event('POST'); malformed.body = '{broken';
  assert.equal((await handler(malformed)).statusCode, 400);
  const large = event('POST'); large.body = 'x'.repeat(66000);
  assert.equal((await handler(large)).statusCode, 413);
  const result = await handler(event('POST', base, {}));
  assert.equal(result.statusCode, 500);
  assert.equal(result.body.includes('private-database-message'), false);
});

test('routes a versioned revision read and paginated list', async () => {
  const calls = [];
  const handler = createReleasesHandler({ revision: async (...args) => { calls.push(args); return { revision: { number: 2 }, decision: null }; },
    list: async (...args) => { calls.push(args); return { releases: [], nextCursor: null }; } });
  assert.equal((await handler(event('GET', `${base}/r1/revisions/2`))).statusCode, 200);
  assert.equal(calls[0][1], 'r1'); assert.equal(calls[0][2], '2');
  const list = event('GET'); list.queryStringParameters = { cursor: 'cursor', limit: '10' };
  assert.equal((await handler(list)).statusCode, 200);
  assert.deepEqual(calls[1].slice(1), ['cursor', '10']);
});
