import assert from 'node:assert/strict';
import test from 'node:test';
import { readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

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

test('a customer can download the portable CLI without login and without a stale static cache', artifactRequired, async () => {
  const result = await handler(event('/downloads/logsofchange.mjs'), {});
  assert.equal(result.statusCode, 200);
  assert.match(result.headers['content-type'], /javascript/);
  assert.match(result.headers['content-disposition'], /attachment/);
  assert.equal(result.headers['cache-control'], 'no-store');
  assert.match(body(result), /export async function submitDraft/);
  assert.doesNotMatch(body(result), /from ['"]@/);
});

test('public Lambda SSR renders only its anonymous projection through a trusted canonical origin', artifactRequired, () => {
  const script = `
    import assert from 'node:assert/strict';
    process.env.NG_ALLOWED_HOSTS = 'localhost';
    process.env.NG_TRUST_PROXY_HEADERS = 'x-forwarded-proto';
    process.env.PUBLIC_ORIGIN = 'https://dev.logsofchange.lynxpardelle.com';
    let calls = 0;
    globalThis.fetch = async (input, init) => {
      calls++;
      const url = typeof input === 'string' ? input : input.url || input.href;
      assert.equal(url, 'https://dev.logsofchange.lynxpardelle.com/api/v1/public/projects/public-check?limit=20');
      assert.equal(new Headers(init?.headers || input.headers).has('authorization'), false);
      return Response.json({project:{slug:'public-check',name:'Public check'},releases:[{id:'11111111-1111-4111-8111-111111111111',revision:1,title:'Public check milestone',summary:'<img src=x onerror=alert(1)>',acceptedAt:'2026-11-19T00:00:00.000Z',publishedAt:'2026-11-19T00:00:00.000Z'}],nextCursor:null});
    };
    const {handler} = await import(${JSON.stringify(artifact.href)});
    const response = await handler(${JSON.stringify(event('/p/public-check'))},{});
    const html = response.isBase64Encoded ? Buffer.from(response.body,'base64').toString('utf8') : response.body;
    assert.equal(response.statusCode,200);
    assert.equal(calls,1);
    assert.match(html,/Public check milestone/);
    assert.match(html,/ng-server-context="ssr"/);
    assert.match(html,/&lt;img/);
    assert.doesNotMatch(html,/<img src=x onerror/);
    process.stdout.write('public-ssr-ok');
  `;
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8', timeout: 30000 });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /public-ssr-ok/);
});
