import assert from 'node:assert/strict';
import test from 'node:test';

test('browser QA selects development by default and isolates testing reports', async () => {
  const { resolveQaTarget } = await import('../scripts/qa-web-target.mjs');
  assert.equal(resolveQaTarget().environment, 'development');
  const testing = resolveQaTarget('https://test.logsofchange.lynxpardelle.com');
  assert.equal(testing.environment, 'testing');
  assert.equal(testing.base.origin, 'https://test.logsofchange.lynxpardelle.com');
  assert.equal(resolveQaTarget('https://dev.logsofchange.lynxpardelle.com/').environment, 'development');
});

test('browser QA rejects production and noncanonical targets before browser or filesystem work', async () => {
  const { resolveQaTarget } = await import('../scripts/qa-web-target.mjs');
  for (const value of [
    'https://logsofchange.lynxpardelle.com',
    'https://attacker.example',
    'https://test.logsofchange.lynxpardelle.com.attacker.example',
    'http://test.logsofchange.lynxpardelle.com',
    'https://user:password@test.logsofchange.lynxpardelle.com',
    'https://test.logsofchange.lynxpardelle.com:444',
    'https://test.logsofchange.lynxpardelle.com/auth/callback',
    'https://test.logsofchange.lynxpardelle.com?environment=development',
    'https://test.logsofchange.lynxpardelle.com#development',
  ]) assert.throws(() => resolveQaTarget(value), undefined, value);
});
