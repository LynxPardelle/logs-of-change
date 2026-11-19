import assert from 'node:assert/strict';

// Resolve the permitted target before browser launch or report-directory writes.
export function resolveQaTarget(value = 'https://dev.logsofchange.lynxpardelle.com') {
  const base = new URL(value);
  const environment = ({
    'dev.logsofchange.lynxpardelle.com': 'development',
    'test.logsofchange.lynxpardelle.com': 'testing',
  })[base.hostname];
  assert.ok(environment === 'development' || environment === 'testing', 'Browser QA is restricted to the development or testing deployment.');
  assert.equal(base.protocol, 'https:', 'Browser QA expects the HTTPS deployment URL.');
  assert.ok(!base.username && !base.password && !base.port && !base.search && !base.hash && base.pathname === '/', 'Browser QA expects only the canonical environment origin.');
  return { base, environment };
}
