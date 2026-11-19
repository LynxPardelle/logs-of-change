import assert from 'node:assert/strict';
import test from 'node:test';
import { createIdentityHandler } from '../src/identity/index.mjs';

test('membership discovery rechecks active membership and project permissions', async () => {
  const handler = createIdentityHandler({
    findMemberships: async () => [{ orgId: 'one' }, { orgId: 'revoked' }],
    getMembership: async (org) => ({ active: org === 'one', orgName: 'Agency' }),
    listProjects: async () => [{ projectId: 'allowed', name: 'Pilot', active: true }, { projectId: 'hidden', active: true }],
    getPermission: async (_org, project) => ({ active: project === 'allowed', role: 'editor' }),
  });
  const response = await handler({ requestContext: { authorizer: { jwt: { claims: { sub: 'actor' } } } } });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(JSON.parse(response.body), { sub: 'actor', memberships: [{ orgId: 'one', orgName: 'Agency', projects: [{ projectId: 'allowed', name: 'Pilot', role: 'editor' }] }] });
  assert.equal(response.headers['cache-control'], 'no-store');
});

test('identity rejects requests without a gateway-verified identity', async () => {
  const handler = createIdentityHandler({ findMemberships: () => { throw new Error('must not query'); } });
  assert.equal((await handler({})).statusCode, 401);
});

test('malformed active flags never expose organization or project metadata', async () => {
  for (const stage of ['membership', 'project', 'permission']) {
    const handler = createIdentityHandler({
      findMemberships: async () => [{ orgId: 'private' }],
      getMembership: async () => ({ active: stage === 'membership' ? 'false' : true }),
      listProjects: async () => [{ projectId: 'hidden', active: stage === 'project' ? 1 : true }],
      getPermission: async () => ({ active: stage === 'permission' ? 'false' : true, role: 'editor' }),
    });
    const result = JSON.parse((await handler({ requestContext: { authorizer: { jwt: { claims: { sub: 'actor' } } } } })).body);
    assert.equal(result.memberships.flatMap((entry) => entry.projects).length, 0);
    if (stage === 'membership') assert.deepEqual(result.memberships, []);
  }
});
