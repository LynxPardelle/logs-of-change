import { createHash } from 'node:crypto';
import { ApiError, canonicalJson } from '../releases/domain.mjs';
import { validId, planIsPlus } from '../integrations/access.mjs';
import { createIntegrationKey, integrationMetadata } from '../integrations/keys.mjs';

const json = (statusCode, data) => ({ statusCode, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' }, body: JSON.stringify(data) });
const fail = (status, code, message) => { throw new ApiError(status, code, message); };
const hash = value => createHash('sha256').update(canonicalJson(value)).digest('hex');

export function createIntegrationManagementHandler(repository, { now = Date.now } = {}) {
  return async event => {
    try {
      const claims = event.requestContext?.authorizer?.jwt?.claims;
      if (!claims?.sub || claims.token_use !== 'access' || !String(claims.scope ?? '').split(' ').includes('openid')) fail(401, 'UNAUTHORIZED', 'Inicia sesión para continuar.');
      const match = /^\/api\/v1\/identity\/orgs\/([^/]+)\/projects\/([^/]+)\/(capabilities|integration-keys)(?:\/([a-f0-9]{32}))?\/?$/.exec(event.rawPath || '');
      if (!match) fail(404, 'NOT_FOUND', 'La ruta no existe.');
      const [, orgId, projectId, operation, keyId] = match;
      if (!validId(orgId) || !validId(projectId)) fail(400, 'VALIDATION_ERROR', 'El proyecto no es válido.');
      const context = { orgId, projectId, sub: claims.sub };
      const method = event.requestContext?.http?.method;
      const epoch = () => Math.floor(now() / 1000);
      async function authorize({ plus = false, writes = false } = {}) {
        const access = await repository.getAccess(orgId, projectId, context.sub);
        if (access.membership?.active !== true || access.project?.active !== true || access.permission?.active !== true || !['administrator', 'editor', 'reviewer'].includes(access.permission.role)) fail(403, 'FORBIDDEN', 'No tienes acceso vigente a este proyecto.');
        if (operation !== 'capabilities' && access.permission.role !== 'administrator') fail(403, 'FORBIDDEN', 'Se requiere administración del proyecto.');
        if (plus && !planIsPlus(access.plan, epoch())) fail(403, 'PLUS_REQUIRED', 'Esta capacidad requiere Plus activo.');
        if (writes && Object.hasOwn(access.project, 'writesFrozen') && access.project.writesFrozen !== false) fail(423, 'WRITES_FROZEN', 'Las escrituras del proyecto están congeladas.');
        return access;
      }
      const creating = operation === 'integration-keys' && method === 'POST' && !keyId;
      const access = await authorize({ plus: creating, writes: creating });
      if (operation === 'capabilities' && method === 'GET' && !keyId) {
        const enabled = planIsPlus(access.plan, epoch());
        return json(200, { plan: enabled ? 'plus' : 'free', integrations: enabled, publicPublishing: enabled, role: access.permission.role });
      }
      if (operation === 'integration-keys' && method === 'GET' && !keyId) return json(200, { keys: (await repository.listIntegrationKeys(orgId, projectId)).map(integrationMetadata) });
      if (!creating && !(operation === 'integration-keys' && method === 'DELETE' && keyId)) fail(405, 'METHOD_NOT_ALLOWED', 'La operación no está disponible.');
      const idempotencyKey = event.headers?.['idempotency-key'] ?? event.headers?.['Idempotency-Key'];
      if (typeof idempotencyKey !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(idempotencyKey)) fail(400, 'VALIDATION_ERROR', 'Incluye una Idempotency-Key válida.');
      let body = {};
      if (creating) {
        const raw = event.isBase64Encoded ? Buffer.from(event.body || '', 'base64').toString('utf8') : event.body || '';
        if (Buffer.byteLength(raw, 'utf8') > 4096) fail(413, 'PAYLOAD_TOO_LARGE', 'El cuerpo excede el límite.');
        try { body = JSON.parse(raw); } catch { fail(400, 'VALIDATION_ERROR', 'El cuerpo JSON no es válido.'); }
        if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => !['name', 'expiresInDays'].includes(key)) || typeof body.name !== 'string' || !body.name.trim() || body.name.length > 80 || !Number.isInteger(body.expiresInDays) || body.expiresInDays < 1 || body.expiresInDays > 90) fail(400, 'VALIDATION_ERROR', 'Indica nombre y vigencia de 1 a 90 días.');
        body = { name: body.name.trim(), expiresInDays: body.expiresInDays };
      }
      const requestKey = hash({ actor: context.sub, operation: creating ? 'key-create' : `key-revoke/${keyId}`, idempotencyKey });
      const requestDigest = hash(body);
      async function replay(receipt) {
        await authorize({ plus: creating, writes: creating });
        if (receipt.digest !== requestDigest) fail(409, 'IDEMPOTENCY_CONFLICT', 'La clave de idempotencia ya se usó con otro contenido.');
        if (creating) fail(409, 'KEY_ALREADY_CREATED', 'La clave ya fue creada. Su secreto sólo se muestra una vez; revócala si no lo conservaste.');
        return json(200, receipt.response);
      }
      const saved = await repository.getKeyRequest(orgId, projectId, requestKey);
      if (saved) return await replay(saved);
      const receipt = { key: requestKey, digest: requestDigest, actor: context.sub, createdAt: new Date(now()).toISOString() };
      try {
        if (creating) {
          const created = createIntegrationKey(body.name, body.expiresInDays, epoch(), context.sub);
          receipt.response = { key: integrationMetadata(created.row) };
          await repository.createIntegrationKey(context, created.row, receipt, epoch());
          return json(201, { ...receipt.response, token: created.token });
        }
        const stored = await repository.getIntegrationKey(orgId, projectId, keyId);
        if (!stored) fail(404, 'NOT_FOUND', 'La clave no existe en este proyecto.');
        receipt.response = { key: integrationMetadata({ ...stored, active: false }) };
        await repository.revokeIntegrationKey(context, keyId, receipt, epoch());
        return json(200, receipt.response);
      } catch (error) {
        if (![403, 409].includes(error.statusCode)) throw error;
        await authorize({ plus: creating, writes: creating });
        const winner = await repository.getKeyRequest(orgId, projectId, requestKey);
        if (winner) return await replay(winner);
        throw error;
      }
    } catch (error) {
      if (error instanceof ApiError) return json(error.statusCode, { error: { code: error.code, message: error.message } });
      return json(503, { error: { code: 'IDENTITY_UNAVAILABLE', message: 'No se pudo completar la gestión de claves.' } });
    }
  };
}
