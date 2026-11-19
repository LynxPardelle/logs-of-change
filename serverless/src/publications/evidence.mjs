import { ApiError } from '../releases/domain.mjs';

export function createEvidenceReader({ evidenceOrigin, fetcher = fetch }) {
  return async (context, releaseId, revision) => {
    try {
      if (typeof evidenceOrigin !== 'string' || !/^https:\/\/[a-z0-9]+\.execute-api\.us-east-1\.amazonaws\.com$/.test(evidenceOrigin)) throw new Error();
      const response = await fetcher(`${evidenceOrigin}/api/v1/evidence/orgs/${context.orgId}/projects/${context.projectId}/releases/${releaseId}/revisions/${revision}/acta`, {
        headers: { authorization: context.authorization }, redirect: 'error', signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) throw new ApiError([401, 403, 404, 409].includes(response.status) ? response.status : 503, 'EVIDENCE_UNAVAILABLE', 'No se pudo consultar la revisión autorizada.');
      const reader = response.body?.getReader();
      if (!reader) throw new Error();
      const chunks = []; let bytes = 0;
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          bytes += value.byteLength;
          if (bytes > 131072) { await reader.cancel(); throw new Error(); }
          chunks.push(value);
        }
      } finally { reader.releaseLock(); }
      const raw = Buffer.concat(chunks, bytes).toString('utf8');
      return JSON.parse(raw);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(503, 'EVIDENCE_UNAVAILABLE', 'No se pudo verificar la evidencia.');
    }
  };
}
