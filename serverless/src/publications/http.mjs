import { ApiError } from '../releases/domain.mjs';

const headers = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' };
const respond = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });
// The projection contains only explicitly published DTOs and never uses cookies.
// Keep wildcard CORS out of every private publication/key-management response.
const publicCors = response => ({ ...response, headers: { ...response.headers, 'access-control-allow-origin': '*' } });
function failure(error) {
  return error instanceof ApiError ? respond(error.statusCode, { error: { code: error.code, message: error.message } }) : respond(500, { error: { code: 'INTERNAL_ERROR', message: 'No se pudo completar la operación.' } });
}
function parseBody(event) {
  const raw = event.isBase64Encoded ? Buffer.from(event.body ?? '', 'base64').toString('utf8') : event.body ?? '';
  if (Buffer.byteLength(raw, 'utf8') > 65536) throw new ApiError(413, 'PAYLOAD_TOO_LARGE', 'El cuerpo excede el tamaño permitido.');
  try { return JSON.parse(raw); } catch { throw new ApiError(400, 'VALIDATION_ERROR', 'El cuerpo JSON no es válido.'); }
}
export function createPublicationsHandler(service) {
  return async event => {
    try {
      const claims = event.requestContext?.authorizer?.jwt?.claims;
      if (!claims?.sub || claims.token_use !== 'access' || !String(claims.scope ?? '').split(' ').includes('openid')) throw new ApiError(401, 'UNAUTHORIZED', 'Inicia sesión para continuar.');
      const match = /^\/api\/v1\/publications\/orgs\/([^/]+)\/projects\/([^/]+)\/releases(?:\/([^/]+))?\/?$/.exec(event.rawPath ?? '');
      if (!match) throw new ApiError(404, 'NOT_FOUND', 'La ruta no existe.');
      const [, orgId, projectId, releaseId] = match;
      const context = { orgId, projectId, sub: claims.sub, authorization: event.headers?.authorization ?? event.headers?.Authorization };
      const method = event.requestContext?.http?.method;
      const key = event.headers?.['idempotency-key'] ?? event.headers?.['Idempotency-Key'];
      if (method === 'GET' && !releaseId) return respond(200, await service.list(context, event.queryStringParameters?.cursor, event.queryStringParameters?.limit ?? 20));
      if (method === 'POST' && releaseId) return respond(200, await service.publish(context, releaseId, parseBody(event), key));
      if (method === 'DELETE' && releaseId) {
        if (event.body) throw new ApiError(400, 'VALIDATION_ERROR', 'La despublicación no recibe un cuerpo.');
        return respond(200, await service.unpublish(context, releaseId, key));
      }
      throw new ApiError(405, 'METHOD_NOT_ALLOWED', 'La operación no está disponible.');
    } catch (error) { return failure(error); }
  };
}
export function createPublicHandler(service) {
  return async event => {
    try {
      const match = /^\/api\/v1\/public\/projects\/([^/]+)\/?$/.exec(event.rawPath ?? '');
      if (!match) throw new ApiError(404, 'NOT_FOUND', 'La ruta no existe.');
      if (event.requestContext?.http?.method !== 'GET') throw new ApiError(405, 'METHOD_NOT_ALLOWED', 'La consulta pública sólo permite GET.');
      return publicCors(respond(200, await service.publicProject(match[1], event.queryStringParameters?.cursor, event.queryStringParameters?.limit ?? 20)));
    } catch (error) { return publicCors(failure(error)); }
  };
}
