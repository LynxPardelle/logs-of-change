import { ApiError } from './domain.mjs';

const headers = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' };
const respond = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });

export function createReleasesHandler(service) {
  return async function handler(event) {
    try {
      const claims = event.requestContext?.authorizer?.jwt?.claims;
      if (!claims?.sub || claims.token_use !== 'access' || !String(claims.scope ?? '').split(' ').includes('openid')) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Inicia sesión para continuar.');
      }
      const method = event.requestContext?.http?.method;
      const path = event.rawPath ?? event.requestContext?.http?.path ?? '';
      const match = /^\/api\/v1\/orgs\/([^/]+)\/projects\/([^/]+)\/releases(?:\/([^/]+))?(?:\/(submit|decisions|revisions))?(?:\/(\d+))?\/?$/.exec(path);
      if (!match) throw new ApiError(404, 'NOT_FOUND', 'La ruta no existe.');
      const [, orgId, projectId, releaseId, operation, number] = match;
      const context = { orgId, projectId, sub: claims.sub };
      if (method === 'GET' && !releaseId) return respond(200, await service.list(context, event.queryStringParameters?.cursor, event.queryStringParameters?.limit ?? 20));
      if (method === 'GET' && releaseId && !operation) return respond(200, await service.detail(context, releaseId));
      if (method === 'GET' && operation === 'revisions' && number) return respond(200, await service.revision(context, releaseId, number));
      if (method !== 'POST' || number) throw new ApiError(405, 'METHOD_NOT_ALLOWED', 'La operación no está disponible.');
      let body;
      const raw = event.isBase64Encoded ? Buffer.from(event.body ?? '', 'base64').toString('utf8') : event.body ?? '';
      if (Buffer.byteLength(raw, 'utf8') > 65536) throw new ApiError(413, 'PAYLOAD_TOO_LARGE', 'La entrega excede el tamaño permitido.');
      try { body = JSON.parse(raw); } catch { throw new ApiError(400, 'VALIDATION_ERROR', 'El cuerpo JSON no es válido.'); }
      const key = event.headers?.['idempotency-key'] ?? event.headers?.['Idempotency-Key'];
      if (!releaseId) return respond(201, await service.create(context, body, key));
      if (operation === 'submit') return respond(200, await service.submit(context, releaseId, body, key));
      if (operation === 'decisions') return respond(200, await service.decide(context, releaseId, body, key));
      if (operation === 'revisions') return respond(201, await service.revise(context, releaseId, body, key));
      throw new ApiError(405, 'METHOD_NOT_ALLOWED', 'La operación no está disponible.');
    } catch (error) {
      if (error instanceof ApiError) return respond(error.statusCode, { error: { code: error.code, message: error.message } });
      console.error(JSON.stringify({ service: 'logsofchange-releases', error: error.name ?? 'Error', requestId: event.requestContext?.requestId }));
      return respond(500, { error: { code: 'INTERNAL_ERROR', message: 'No se pudo completar la operación. Intenta nuevamente.' } });
    }
  };
}
