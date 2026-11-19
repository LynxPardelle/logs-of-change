import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';

export const hashSecret = value => createHash('sha256').update(value).digest('hex');

export function parseIntegrationToken(token) {
  if (typeof token !== 'string') return null;
  const match = /^loc_([a-f0-9]{32})_([A-Za-z0-9_-]{43})$/.exec(token);
  return match ? { keyId: match[1], secretHash: hashSecret(match[2]) } : null;
}

export function secretMatches(expected, actual) {
  return typeof expected === 'string' && typeof actual === 'string' && /^[a-f0-9]{64}$/.test(expected) && /^[a-f0-9]{64}$/.test(actual) && timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(actual, 'hex'));
}

export function createIntegrationKey(name, expiresInDays, nowEpoch, createdBy) {
  const id = randomBytes(16).toString('hex');
  const secret = randomBytes(32).toString('base64url');
  return {
    token: `loc_${id}_${secret}`,
    row: { id, name, active: true, expiresAt: nowEpoch + expiresInDays * 86400, createdAt: new Date(nowEpoch * 1000).toISOString(), createdBy, scope: 'releases:create', secretHash: hashSecret(secret) },
  };
}

export function integrationMetadata(row) {
  return { id: row.id, name: row.name, active: row.active === true, expiresAt: row.expiresAt, createdAt: row.createdAt };
}
