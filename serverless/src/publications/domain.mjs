import { createHash, randomUUID } from 'node:crypto';
import { ApiError, canonicalJson } from '../releases/domain.mjs';
import { verifyActa } from '../evidence/index.mjs';
import { planIsPlus, validId } from '../integrations/access.mjs';

const fail = (status, code, message) => { throw new ApiError(status, code, message); };
const hash = value => createHash('sha256').update(canonicalJson(value)).digest('hex');
export const validSlug = value => typeof value === 'string' && /^(?=.{3,64}$)[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
export const validPublicId = value => typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(value);
const validDate = value => typeof value === 'string' && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
const text = (value, max, required = true) => {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) fail(400, 'VALIDATION_ERROR', 'El texto seleccionado no es válido.');
  return value.trim();
};
const limitValue = value => {
  const limit = Number(value);
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) fail(400, 'VALIDATION_ERROR', 'limit debe estar entre 1 y 50.');
  return limit;
};
function cursorValue(encoded, scope) {
  if (!encoded) return undefined;
  try {
    if (typeof encoded !== 'string' || encoded.length > 2000 || !/^[A-Za-z0-9_-]+$/.test(encoded)) throw new Error();
    const decoded = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    if (!decoded || Array.isArray(decoded) || Object.keys(decoded).some(key => ![...Object.keys(scope), 'key'].includes(key)) || !decoded.key || Array.isArray(decoded.key)) throw new Error();
    if (Object.entries(scope).some(([key, value]) => decoded[key] !== value)) throw new Error();
    const key = decoded.key;
    if (Object.keys(key).length !== 2 || typeof key.PK !== 'string' || typeof key.SK !== 'string') throw new Error();
    if (scope.slug) {
      if (key.PK !== `PROJECT#${scope.slug}` || !key.SK.startsWith('RELEASE#') || !validPublicId(key.SK.slice(8))) throw new Error();
    } else if (key.PK !== `TENANT#${scope.orgId}#PROJECT#${scope.projectId}` || !key.SK.startsWith('PUBLICATION#') || !validId(key.SK.slice(12))) throw new Error();
    return key;
  } catch { fail(400, 'VALIDATION_ERROR', 'El cursor no corresponde a este proyecto.'); }
}
const encodeCursor = (key, scope) => key ? Buffer.from(JSON.stringify({ ...scope, key })).toString('base64url') : null;

export function publicReleaseDto(value) {
  if (!value || !validPublicId(value.id) || !Number.isSafeInteger(value.revision) || value.revision < 1 || !validDate(value.acceptedAt) || !validDate(value.publishedAt)) fail(503, 'PUBLICATION_UNAVAILABLE', 'La publicación no está disponible.');
  const result = { id: value.id, revision: value.revision, title: text(value.title, 160), acceptedAt: value.acceptedAt, publishedAt: value.publishedAt };
  if (Object.hasOwn(value, 'summary')) result.summary = text(value.summary, 8000, false);
  if (Object.hasOwn(value, 'changes')) {
    if (!Array.isArray(value.changes) || value.changes.length > 30) fail(503, 'PUBLICATION_UNAVAILABLE', 'La publicación no está disponible.');
    result.changes = value.changes.map(change => text(change, 700));
  }
  return result;
}

function publicationDto(value) {
  return { releaseId: value.releaseId, revision: value.revision, slug: value.slug, publicId: value.publicId, projectName: value.projectName,
    fields: [...value.fields], publishedAt: value.publishedAt, acceptedAt: value.acceptedAt, active: value.active };
}

function publishBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => !['revision', 'slug', 'projectName', 'fields'].includes(key))) fail(400, 'VALIDATION_ERROR', 'Hay campos no permitidos.');
  if (!Number.isSafeInteger(body.revision) || body.revision < 1 || body.revision > 999999 || !validSlug(body.slug)) fail(400, 'VALIDATION_ERROR', 'La revisión o el slug no es válido.');
  if (!Array.isArray(body.fields) || !body.fields.includes('title') || body.fields.length > 3 || new Set(body.fields).size !== body.fields.length || body.fields.some(field => !['title', 'summary', 'changes'].includes(field))) fail(400, 'VALIDATION_ERROR', 'Selecciona únicamente title, summary y changes, incluyendo title.');
  return { revision: body.revision, slug: body.slug, projectName: text(body.projectName, 160), fields: ['title', 'summary', 'changes'].filter(field => body.fields.includes(field)) };
}

export function createPublicReader(repository) {
  return {
    async publicProject(slug, encodedCursor, requestedLimit = 20) {
      if (!validSlug(slug)) fail(400, 'VALIDATION_ERROR', 'El slug no es válido.');
      const limit = limitValue(requestedLimit), cursor = cursorValue(encodedCursor, { slug });
      const project = await repository.getPublicProject(slug);
      if (!project || project.slug !== slug) fail(404, 'NOT_FOUND', 'No hay publicaciones disponibles.');
      const result = await repository.listPublic(slug, cursor, limit);
      if (!result.releases.length && (!cursor || !(await repository.listPublic(slug, undefined, 1)).releases.length)) fail(404, 'NOT_FOUND', 'No hay publicaciones disponibles.');
      return { project: { slug, name: text(project.name, 160) }, releases: result.releases.map(publicReleaseDto), nextCursor: encodeCursor(result.nextCursor, { slug }) };
    },
  };
}

export function createPublicationsService(repository, { evidence, now = () => new Date().toISOString(), id = randomUUID } = {}) {
  const epoch = () => Math.floor(Date.parse(now()) / 1000);
  async function authorize(context, requiresPlus = false) {
    if (!context?.sub || typeof context.sub !== 'string' || context.sub.length > 256) fail(401, 'UNAUTHORIZED', 'Inicia sesión para continuar.');
    if (!validId(context.orgId) || !validId(context.projectId)) fail(400, 'VALIDATION_ERROR', 'La organización o el proyecto no es válido.');
    const access = await repository.getAccess(context.orgId, context.projectId, context.sub);
    if (access.membership?.active !== true || access.project?.active !== true || access.permission?.active !== true || access.permission.role !== 'administrator') fail(403, 'FORBIDDEN', 'Requiere un administrador vigente de este proyecto.');
    if (requiresPlus) {
      if (!planIsPlus(access.plan, epoch())) fail(403, 'PLUS_REQUIRED', 'La publicación requiere un plan Plus activo.');
      if (Object.hasOwn(access.project, 'writesFrozen') && access.project.writesFrozen !== false) fail(423, 'WRITES_FROZEN', 'Las escrituras del proyecto están congeladas.');
    }
    return access;
  }
  async function mutate(context, releaseId, operation, body, key, build) {
    if (!validId(releaseId)) fail(400, 'VALIDATION_ERROR', 'La entrega no es válida.');
    await authorize(context, operation === 'publish');
    if (typeof key !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(key)) fail(400, 'VALIDATION_ERROR', 'Incluye una Idempotency-Key válida.');
    const receiptKey = hash({ actor: context.sub, operation, releaseId, key }), digest = hash({ operation, releaseId, body });
    const replay = receipt => {
      if (receipt.digest !== digest) fail(409, 'IDEMPOTENCY_CONFLICT', 'La misma clave ya se usó con otro contenido.');
      return receipt.response;
    };
    const saved = await repository.getReceipt(context.orgId, context.projectId, receiptKey);
    if (saved) { await authorize(context, operation === 'publish'); return replay(saved); }
    try {
      const change = await build(now());
      const receipt = { key: receiptKey, digest, actor: context.sub, operation, response: change.response, createdAt: now() };
      await repository.transact({ ...change, context, operation, receipt, nowEpoch: epoch() });
      return change.response;
    } catch (error) {
      if (![403, 409, 423].includes(error.statusCode)) throw error;
      await authorize(context, operation === 'publish');
      if (error.statusCode === 409) {
        const winner = await repository.getReceipt(context.orgId, context.projectId, receiptKey);
        if (winner) { await authorize(context, operation === 'publish'); return replay(winner); }
      }
      throw error;
    }
  }
  return {
    ...createPublicReader(repository),
    async list(context, encodedCursor, requestedLimit = 20) {
      await authorize(context);
      const limit = limitValue(requestedLimit), cursor = cursorValue(encodedCursor, { orgId: context.orgId, projectId: context.projectId });
      const [result, config] = await Promise.all([repository.list(context.orgId, context.projectId, cursor, limit), repository.getProject(context.orgId, context.projectId)]);
      return { project: config ? { slug: config.slug, name: config.name } : null, publications: result.publications.filter(value => value.active === true).map(publicationDto), nextCursor: encodeCursor(result.nextCursor, { orgId: context.orgId, projectId: context.projectId }) };
    },
    async publish(context, releaseId, value, key) {
      const body = publishBody(value);
      return mutate(context, releaseId, 'publish', body, key, async time => {
        const [previous, previousConfig] = await Promise.all([repository.getPublication(context.orgId, context.projectId, releaseId), repository.getProject(context.orgId, context.projectId)]);
        if (previousConfig && previousConfig.slug !== body.slug) fail(409, 'SLUG_FIXED', 'Este proyecto ya tiene un slug reservado.');
        if (typeof context.authorization !== 'string' || !/^Bearer [A-Za-z0-9._~-]{1,16384}$/.test(context.authorization)) fail(401, 'UNAUTHORIZED', 'Se requiere el access token original.');
        const acta = await evidence(context, releaseId, body.revision);
        if (!verifyActa(acta) || acta.orgId !== context.orgId || acta.projectId !== context.projectId || acta.releaseId !== releaseId || acta.revision.number !== body.revision || !validDate(acta.decision.decidedAt)) fail(502, 'INTEGRITY_MISMATCH', 'La revisión aceptada no pudo verificarse.');
        if (acta.decision.outcome !== 'accepted') fail(409, 'ACCEPTANCE_REQUIRED', 'Sólo se publica una revisión aceptada.');
        const manifest = acta.revision.manifest;
        const publicId = previous?.publicId ?? id();
        if (!validPublicId(publicId)) throw new Error('Invalid generated public identifier.');
        const publicRelease = publicReleaseDto({ id: publicId, revision: body.revision, title: manifest.title,
          ...(body.fields.includes('summary') ? { summary: manifest.summary } : {}), ...(body.fields.includes('changes') ? { changes: manifest.changes } : {}),
          acceptedAt: acta.decision.decidedAt, publishedAt: time });
        const config = { slug: body.slug, name: body.projectName, version: (previousConfig?.version ?? 0) + 1 };
        const publication = { releaseId, revision: body.revision, slug: body.slug, publicId, projectName: body.projectName, fields: body.fields,
          acceptedAt: publicRelease.acceptedAt, publishedAt: time, active: true, version: (previous?.version ?? 0) + 1 };
        return { publication, publicRelease, config, previousVersion: previous?.version ?? null, previousConfigVersion: previousConfig?.version ?? null, response: { publication: publicationDto(publication) } };
      });
    },
    async unpublish(context, releaseId, key) {
      return mutate(context, releaseId, 'unpublish', {}, key, async () => {
        const previous = await repository.getPublication(context.orgId, context.projectId, releaseId);
        if (!previous) fail(404, 'NOT_FOUND', 'No se encontró la publicación.');
        const publication = { ...previous, active: false, version: previous.version + 1 };
        return { publication, previousVersion: previous.version, response: { publication: publicationDto(publication) } };
      });
    },
  };
}
