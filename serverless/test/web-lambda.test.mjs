import assert from 'node:assert/strict';
import test from 'node:test';
import { readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';

process.env.NG_ALLOWED_HOSTS = 'localhost';
process.env.NG_TRUST_PROXY_HEADERS = 'x-forwarded-proto';
const artifact = new URL('../.build/web/index.mjs', import.meta.url);
const handler = existsSync(artifact) ? (await import(artifact.href)).handler : undefined;
const artifactRequired = { skip: !handler && 'Run the Angular production build and package-web.mjs to test the SSR artifact.' };
const event = (path) => ({
  version: '2.0', rawPath: path, rawQueryString: '', headers: { host: 'localhost', 'x-forwarded-proto': 'https' },
  requestContext: { domainName: 'localhost', http: { method: 'GET', path, protocol: 'HTTP/1.1', sourceIp: '127.0.0.1' } },
  isBase64Encoded: false,
});
const body = response => response.isBase64Encoded ? Buffer.from(response.body, 'base64').toString('utf8') : response.body;

test('Lambda renders Logs of Change HTML on the server without calling private APIs', artifactRequired, async () => {
  const result = await handler(event('/'), {});
  assert.equal(result.statusCode, 200);
  assert.match(body(result), /Logs of Change/);
  assert.match(body(result), /Cierra el hito/);
  assert.equal(result.headers['cache-control'], 'no-store');
  assert.match(body(result), /ng-server-context="ssr"/);
});

test('SSR handles a direct authentication callback route', artifactRequired, async () => {
  const result = await handler(event('/auth/callback'), {});
  assert.equal(result.statusCode, 200);
  assert.match(body(result), /Logs of Change/);
});

test('frontend never serves application HTML for an API request', artifactRequired, async () => {
  const result = await handler(event('/api/v1/unknown'), {});
  assert.equal(result.statusCode, 404);
  assert.match(result.headers['content-type'], /application\/json/);
});

test('Lambda serves the built browser JavaScript with a static cache policy', artifactRequired, async () => {
  const asset = (await readdir(new URL('../.build/web/browser/', import.meta.url))).find(name => name.startsWith('main-') && name.endsWith('.js'));
  assert.ok(asset);
  const result = await handler(event(`/${asset}`), {});
  assert.equal(result.statusCode, 200);
  assert.match(result.headers['content-type'], /javascript/);
  assert.match(result.headers['cache-control'], /max-age=31536000/);
});
