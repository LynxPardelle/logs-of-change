import { createHash } from 'node:crypto';

export function canonical(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
}

export function verifyActa(acta) {
  const revision = acta?.revision;
  const manifest = revision?.manifest;
  const decision = acta?.decision;
  return Boolean(['logs-of-change.acta.v1', 'hitoclaro.acta.v1'].includes(acta?.schema) && manifest && revision.digest && decision &&
    acta.orgId === manifest.orgId && acta.projectId === manifest.projectId && acta.releaseId === manifest.releaseId &&
    revision.number === manifest.revision && decision.revision === revision.number && decision.manifestDigest === revision.digest &&
    ['accepted', 'changes_requested'].includes(decision.outcome) && typeof decision.actor === 'string' && decision.actor.length > 0 &&
    createHash('sha256').update(canonical(manifest)).digest('hex') === revision.digest);
}

const json = (statusCode, data) => ({ statusCode, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }, body: JSON.stringify(data) });

export function createEvidenceHandler({ releasesOrigin, fetcher = fetch }) {
  return async (event) => {
    if (!event.requestContext?.authorizer?.jwt?.claims?.sub) return json(401, { error: { code: 'UNAUTHENTICATED', message: 'Inicia sesión.' } });
    const match = /^\/api\/v1\/evidence\/orgs\/([A-Za-z0-9][A-Za-z0-9_-]{0,127})\/projects\/([A-Za-z0-9][A-Za-z0-9_-]{0,127})\/releases\/([A-Za-z0-9][A-Za-z0-9_-]{0,127})\/revisions\/([1-9]\d{0,5})\/acta$/.exec(event.rawPath || '');
    if (!match) return json(404, { error: { code: 'NOT_FOUND', message: 'Acta no encontrada.' } });
    try {
      const [, org, project, release, revisionNumber] = match;
      const origin = new URL(releasesOrigin);
      if (origin.protocol !== 'https:' || origin.username || origin.password || origin.search || origin.hash) throw new Error('Invalid releases origin');
      const response = await fetcher(new URL(`/api/v1/orgs/${org}/projects/${project}/releases/${release}/revisions/${revisionNumber}`, origin), {
        headers: { authorization: event.headers?.authorization || event.headers?.Authorization || '' }, signal: AbortSignal.timeout(5000), redirect: 'error',
      });
      if (!response.ok) return json([401, 403, 404].includes(response.status) ? response.status : 503, { error: { code: 'EVIDENCE_UNAVAILABLE', message: 'No se pudo consultar la revisión autorizada.' } });
      const { revision, decision } = await response.json();
      if (!revision || !decision) return json(409, { error: { code: 'DECISION_REQUIRED', message: 'La revisión aún no tiene una decisión.' } });
      const acta = { schema: 'logs-of-change.acta.v1', product: 'Logs of Change', orgId: org, projectId: project, releaseId: release, revision, decision, exportedAt: new Date().toISOString(), integrity: { algorithm: 'SHA-256', canonicalization: 'sorted-object-keys-json-v1', scope: 'revision.manifest' } };
      if (!verifyActa(acta)) return json(502, { error: { code: 'INTEGRITY_MISMATCH', message: 'La integridad de la revisión no pudo verificarse.' } });
      const result = json(200, acta);
      result.headers['content-disposition'] = `attachment; filename="logs-of-change-${release}-r${revisionNumber}.json"`;
      return result;
    } catch {
      return json(503, { error: { code: 'EVIDENCE_UNAVAILABLE', message: 'La evidencia no está disponible. Intenta nuevamente.' } });
    }
  };
}

export const handler = createEvidenceHandler({ releasesOrigin: process.env.RELEASES_API_ENDPOINT });
