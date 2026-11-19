import assert from 'node:assert/strict';
import test from 'node:test';

import { handler } from '../src/health/index.mjs';

test('returns the public API health contract', async () => {
  const response = await handler({
    requestContext: { http: { method: 'GET', path: '/api/v1/health' } },
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.headers['content-type'], 'application/json; charset=utf-8');
  assert.equal(response.headers['cache-control'], 'no-store');
  assert.deepEqual(JSON.parse(response.body), {
    status: 'ok',
    service: 'logsofchange',
  });
});
