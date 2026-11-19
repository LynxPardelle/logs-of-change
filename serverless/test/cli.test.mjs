import assert from 'node:assert/strict';
import test from 'node:test';

const args = ['--environment=testing', '--org=agency', '--project=portal', '--file=release.json', '--idempotency-key=build-42'];
const apiKey = `loc_${'a'.repeat(32)}_${'B'.repeat(43)}`;
const payload = { title: 'Portal', summary: 'A reviewed milestone', changes: ['New dashboard'], source: { system: 'ci', externalId: '42', revision: 'abc123' } };

test('portable CLI posts one private draft with a stable idempotency key and no credential in its result', async () => {
  const { submitDraft } = await import('../../cli/logsofchange.mjs');
  let calls = 0;
  const result = await submitDraft(args, {
    env: { LOGSOFCHANGE_API_KEY: apiKey },
    readInput: async path => { assert.equal(path, 'release.json'); return JSON.stringify(payload); },
    fetchImpl: async (url, options) => {
      calls++;
      assert.equal(url, 'https://test.logsofchange.lynxpardelle.com/api/v1/ingestions/orgs/agency/projects/portal/releases');
      assert.equal(options.redirect, 'error');
      assert.equal(options.headers['x-logsofchange-key'], apiKey);
      assert.equal(options.headers['idempotency-key'], 'build-42');
      assert.deepEqual(JSON.parse(options.body), payload);
      return Response.json({ release: { id: 'release-42', revision: 1, status: 'draft', summary: 'private' } }, { status: 201 });
    },
  });
  assert.equal(calls, 1);
  assert.deepEqual(result, { environment: 'testing', releaseId: 'release-42', revision: 1, status: 'draft' });
  assert.ok(!JSON.stringify(result).includes(apiKey));
});

test('CLI rejects unknown destinations and flags before reading a file or sending credentials', async () => {
  const { submitDraft } = await import('../../cli/logsofchange.mjs');
  for (const invalid of [args.concat('--url=https://attacker.example'), args.concat('--environment=production'), args.map(x => x === '--environment=testing' ? '--environment=attacker' : x), args.filter(x => !x.startsWith('--idempotency-key=')), args.map(x => x === '--org=agency' ? '--org=../other' : x), args.concat('--api-key=secret')]) {
    await assert.rejects(submitDraft(invalid, { env: { LOGSOFCHANGE_API_KEY: apiKey }, readInput: () => assert.fail('file read'), fetchImpl: () => assert.fail('network request') }));
  }
});

test('CLI fails closed without a valid key, on oversized or invalid JSON, and never echoes server content', async () => {
  const { submitDraft } = await import('../../cli/logsofchange.mjs');
  await assert.rejects(submitDraft(args, { env: {}, readInput: () => assert.fail('file read') }), /LOGSOFCHANGE_API_KEY/);
  for (const raw of ['not-json', '[]', JSON.stringify({ ...payload, actor: 'reviewer' }), ' '.repeat(65537)]) {
    await assert.rejects(submitDraft(args, { env: { LOGSOFCHANGE_API_KEY: apiKey }, readInput: async () => raw, fetchImpl: () => assert.fail('network request') }));
  }
  await assert.rejects(submitDraft(args, { env: { LOGSOFCHANGE_API_KEY: apiKey }, readInput: async () => JSON.stringify(payload), fetchImpl: async () => Response.json({ error: { code: 'FORBIDDEN', message: apiKey } }, { status: 403 }) }), error => !error.message.includes(apiKey) && /403/.test(error.message));
  await assert.rejects(submitDraft(args, { env: { LOGSOFCHANGE_API_KEY: apiKey }, readInput: async () => JSON.stringify(payload), fetchImpl: async () => { throw new Error(apiKey); } }), error => !error.message.includes(apiKey));
});
