import { createHash, randomUUID } from 'node:crypto';

export class ApiError extends Error {
  constructor(statusCode, code, message) { super(message); this.statusCode = statusCode; this.code = code; }
}

export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

const digest = (value) => createHash('sha256').update(canonicalJson(value)).digest('hex');
const writers = ['editor', 'administrator'];
const reviewers = ['reviewer', 'administrator'];
const readers = ['editor', 'reviewer', 'administrator'];
const fail = (status, code, message) => { throw new ApiError(status, code, message); };
const validId = (value) => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(value);

function validateContext(context) {
  if (!context?.sub || typeof context.sub !== 'string' || context.sub.length > 256) fail(401, 'UNAUTHORIZED', 'Inicia sesión para continuar.');
  if (!validId(context.orgId) || !validId(context.projectId)) fail(400, 'VALIDATION_ERROR', 'La organización o el proyecto no es válido.');
}

function validateBody(body, allowed) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) fail(400, 'VALIDATION_ERROR', 'El cuerpo debe ser un objeto JSON.');
  if (body.attachments !== undefined && (!Array.isArray(body.attachments) || body.attachments.length)) {
    fail(422, 'ATTACHMENTS_UNAVAILABLE', 'Los adjuntos requieren verificación de versiones y aún no están habilitados.');
  }
  if (Object.keys(body).some((key) => !allowed.includes(key) && key !== 'attachments')) fail(400, 'VALIDATION_ERROR', 'Hay campos no permitidos.');
}

function text(value, name, max, required = false) {
  if (value === undefined && !required) return '';
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) fail(400, 'VALIDATION_ERROR', `El campo ${name} no es válido.`);
  return value.trim();
}

function contentBody(body, revision = false) {
  validateBody(body, ['title', 'summary', 'changes', ...(revision ? ['expectedRevision'] : [])]);
  const title = text(body.title, 'title', 160, true);
  const summary = text(body.summary, 'summary', 8000);
  if (!Array.isArray(body.changes) || body.changes.length > 30) fail(400, 'VALIDATION_ERROR', 'changes debe ser una lista de hasta 30 cambios.');
  const changes = body.changes.map((change) => text(change, 'changes', 700, true));
  return { title, summary, changes };
}

function expectedRevision(body) {
  if (!Number.isSafeInteger(body.expectedRevision) || body.expectedRevision < 1) fail(400, 'VALIDATION_ERROR', 'expectedRevision debe ser un entero positivo.');
  return body.expectedRevision;
}

function assertWritesOpen(access) {
  if (Object.hasOwn(access.project, 'writesFrozen') && access.project.writesFrozen !== false) {
    fail(423, 'WRITES_FROZEN', 'Las escrituras de este proyecto están congeladas. Puedes consultar las entregas y descargar su evidencia.');
  }
}

export function createReleasesService(repository, { now = () => new Date().toISOString(), id = randomUUID } = {}) {
  async function authorize(context, roles = readers) {
    validateContext(context);
    const access = await repository.getAccess(context.orgId, context.projectId, context.sub);
    if (access.membership?.active !== true || access.project?.active !== true || access.permission?.active !== true || !roles.includes(access.permission.role)) {
      fail(403, 'FORBIDDEN', 'No tienes acceso vigente a este proyecto.');
    }
    return access;
  }

  async function releaseFor(context, releaseId) {
    if (!validId(releaseId)) fail(400, 'VALIDATION_ERROR', 'La entrega no es válida.');
    const release = await repository.getRelease(context.orgId, context.projectId, releaseId);
    if (!release) fail(404, 'NOT_FOUND', 'No se encontró la entrega.');
    return release;
  }

  async function mutate(context, roles, operation, body, idempotencyKey, build) {
    assertWritesOpen(await authorize(context, roles));
    if (typeof idempotencyKey !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(idempotencyKey)) {
      fail(400, 'VALIDATION_ERROR', 'Incluye una Idempotency-Key de 1 a 128 caracteres.');
    }
    const key = digest({ actor: context.sub, operation, idempotencyKey });
    const requestDigest = digest({ operation, body });
    function replay(receipt) {
      if (receipt.digest !== requestDigest) fail(409, 'IDEMPOTENCY_CONFLICT', 'La misma clave ya se usó con otro contenido.');
      return receipt.response;
    }
    const saved = await repository.getReceipt(context.orgId, context.projectId, key);
    if (saved) return replay(saved);
    const change = await build(now());
    const receipt = { key, digest: requestDigest, actor: context.sub, operation, response: change.response, createdAt: now() };
    try {
      await repository.transact({ ...change, receipt, context, roles });
      return change.response;
    } catch (error) {
      if (![403, 409, 423].includes(error.statusCode)) throw error;
      // A project condition may fail because its active access or freeze flag changed.
      // Reauthorize first so a revoked actor cannot inspect a project's freeze state.
      assertWritesOpen(await authorize(context, roles));
      if (error.statusCode !== 409) throw error;
      const winner = await repository.getReceipt(context.orgId, context.projectId, key);
      if (winner) return replay(winner);
      throw error;
    }
  }

  return {
    async list(context, encodedCursor, requestedLimit = 20) {
      await authorize(context);
      const limit = Number(requestedLimit);
      if (!Number.isInteger(limit) || limit < 1 || limit > 50) fail(400, 'VALIDATION_ERROR', 'limit debe estar entre 1 y 50.');
      let cursor;
      if (encodedCursor) {
        try {
          if (encodedCursor.length > 2000) throw new Error();
          const decoded = JSON.parse(Buffer.from(encodedCursor, 'base64url').toString());
          if (decoded.orgId !== context.orgId || decoded.projectId !== context.projectId || !decoded.key || typeof decoded.key !== 'object') throw new Error();
          cursor = decoded.key;
        } catch { fail(400, 'VALIDATION_ERROR', 'El cursor no corresponde a este proyecto.'); }
      }
      const result = await repository.list(context.orgId, context.projectId, cursor, limit);
      return { releases: result.releases, nextCursor: result.nextCursor ? Buffer.from(JSON.stringify({ orgId: context.orgId, projectId: context.projectId, key: result.nextCursor })).toString('base64url') : null };
    },

    async detail(context, releaseId) {
      await authorize(context);
      const release = await releaseFor(context, releaseId);
      return { release, ...await repository.getHistory(context.orgId, context.projectId, releaseId) };
    },

    async revision(context, releaseId, number) {
      await authorize(context);
      await releaseFor(context, releaseId);
      const n = Number(number);
      if (!Number.isSafeInteger(n) || n < 1) fail(400, 'VALIDATION_ERROR', 'La revisión no es válida.');
      const revision = await repository.getRevision(context.orgId, context.projectId, releaseId, n);
      if (!revision) fail(404, 'NOT_FOUND', 'Esta revisión aún no se ha presentado.');
      const decision = await repository.getDecision(context.orgId, context.projectId, releaseId, n);
      return { revision, decision: decision ?? null };
    },

    async create(context, body, key) {
      const content = contentBody(body);
      return mutate(context, writers, 'create', content, key, async (time) => {
        const release = { id: id(), orgId: context.orgId, projectId: context.projectId, ...content, revision: 1, status: 'draft', createdBy: context.sub, authoredBy: context.sub, createdAt: time, updatedAt: time, version: 1 };
        return { release, previousVersion: null, response: { release } };
      });
    },

    async submit(context, releaseId, body, key) {
      validateBody(body, ['expectedRevision']);
      const number = expectedRevision(body);
      return mutate(context, writers, `submit/${releaseId}`, { expectedRevision: number }, key, async (time) => {
        const previous = await releaseFor(context, releaseId);
        if (previous.revision !== number || previous.status !== 'draft') fail(409, 'CONFLICT', 'La entrega ya cambió o ya fue presentada.');
        const manifest = { schema: 'logs-of-change.revision.v1', orgId: context.orgId, projectId: context.projectId, releaseId, revision: number,
          title: previous.title, summary: previous.summary, changes: previous.changes, attachments: [], createdBy: previous.authoredBy ?? previous.createdBy, submittedBy: context.sub, submittedAt: time, source: 'native' };
        const revision = { number, manifest, digest: digest(manifest), digestAlgorithm: 'SHA-256', canonicalization: 'sorted-json-v1', submittedAt: time };
        const release = { ...previous, status: 'pending_review', updatedAt: time, version: previous.version + 1 };
        return { release, revision, previousVersion: previous.version, response: { release, revision } };
      });
    },

    async decide(context, releaseId, body, key) {
      validateBody(body, ['expectedRevision', 'outcome', 'reason']);
      const number = expectedRevision(body);
      if (!['accepted', 'changes_requested'].includes(body.outcome)) fail(400, 'VALIDATION_ERROR', 'El resultado de la revisión no es válido.');
      const reason = text(body.reason, 'reason', 4000, body.outcome === 'changes_requested');
      return mutate(context, reviewers, `decide/${releaseId}`, { expectedRevision: number, outcome: body.outcome, reason }, key, async (time) => {
        const previous = await releaseFor(context, releaseId);
        if (previous.revision !== number || previous.status !== 'pending_review') fail(409, 'CONFLICT', 'La revisión ya tiene una decisión o cambió.');
        const revision = await repository.getRevision(context.orgId, context.projectId, releaseId, number);
        if (!revision) fail(409, 'CONFLICT', 'La revisión presentada no está disponible.');
        if (previous.createdBy === context.sub || revision.manifest.createdBy === context.sub || revision.manifest.submittedBy === context.sub) {
          fail(403, 'SELF_REVIEW', 'La persona que preparó o presentó la entrega no puede decidir sobre ella.');
        }
        const decision = { revision: number, outcome: body.outcome, reason, actor: context.sub, decidedAt: time, manifestDigest: revision.digest };
        const release = { ...previous, status: body.outcome, updatedAt: time, version: previous.version + 1 };
        return { release, decision, previousVersion: previous.version, response: { release, decision } };
      });
    },

    async revise(context, releaseId, body, key) {
      const content = contentBody(body, true);
      const number = expectedRevision(body);
      return mutate(context, writers, `revise/${releaseId}`, { ...content, expectedRevision: number }, key, async (time) => {
        const previous = await releaseFor(context, releaseId);
        if (previous.revision !== number || previous.status !== 'changes_requested') fail(409, 'CONFLICT', 'Solo se puede ajustar una revisión con cambios solicitados.');
        if (number >= 50) fail(409, 'REVISION_LIMIT', 'Esta entrega alcanzó el límite de 50 revisiones.');
        const release = { ...previous, ...content, authoredBy: context.sub, revision: number + 1, status: 'draft', updatedAt: time, version: previous.version + 1 };
        return { release, previousVersion: previous.version, response: { release } };
      });
    },
  };
}
