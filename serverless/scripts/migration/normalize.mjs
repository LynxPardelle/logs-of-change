import { createHash } from 'node:crypto';

const dates = ['createdAt', 'updatedAt'];
const presentation = ['cssClasses', 'cssStyles'];
const schemas = {
  projects: { required: ['name'], strings: ['name', 'description'], refs: { changeLog: ['changeLogs', false, true] } },
  changeLogs: {
    strings: ['logCssClassesDefault', 'logCssStylesDefault'],
    refs: { logs: ['logs', true], logSectionTypes: ['logSectionTypes', true], logCombosDefault: ['combos', true] },
  },
  logs: { required: ['date'], strings: presentation, dates: ['date'], refs: { logSections: ['logSections', true], combos: ['combos', true] } },
  logSections: {
    required: ['priority'], strings: presentation, numbers: ['priority'],
    refs: { type: ['logSectionTypes'], media: ['logMedia', true], texts: ['logTexts', true], titles: ['logTexts', true], combos: ['combos', true] },
  },
  logTexts: { required: ['text', 'position'], strings: ['text', ...presentation], numbers: ['position'], refs: { combos: ['combos', true] } },
  logMedia: { required: ['position'], strings: presentation, numbers: ['position'], refs: { file: ['files', false, true], combos: ['combos', true] } },
  logSectionTypes: {
    required: ['name'], strings: ['name', 'logSectionCssClassesDefault', 'logSectionCssStylesDefault', 'logTextCssClassesDefault', 'logTextCssStylesDefault', 'logMediaCssClassesDefault', 'logMediaCssStylesDefault'],
    numbers: ['priorityDefault', 'mediaPositionDefault', 'textPositionDefault'],
    refs: { logSectionCombosDefault: ['combos', true], logTextCombosDefault: ['combos', true], logMediaCombosDefault: ['combos', true] },
  },
  files: { required: ['name', 'type', 'location', 'size'], strings: ['name', 'type', 'location'], numbers: ['size'] },
  combos: { required: ['name'], strings: ['name'], stringArrays: ['cssClasses'] },
};

const identifier = (value) => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    if (Object.keys(value).length === 1 && '$oid' in value) value = value.$oid;
    else if ('_id' in value) return identifier(value._id);
    else return null;
  }
  if (Number.isSafeInteger(value) && value >= 0) value = String(value);
  if (typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value)) return null;
  return /^[a-f0-9]{24}$/i.test(value) ? value.toLowerCase() : value;
};

export function canonicalJson(value) {
  if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']';
  if (value !== null && typeof value === 'object') {
    return '{' + Object.keys(value).sort().map((key) => JSON.stringify(key) + ':' + canonicalJson(value[key])).join(',') + '}';
  }
  return JSON.stringify(value);
}

const digest = (value) => createHash('sha256').update(canonicalJson(value)).digest('hex');

function normalizedDate(value) {
  if (value && typeof value === 'object' && '$date' in value) value = value.$date;
  if (value && typeof value === 'object' && '$numberLong' in value && /^-?\d+$/.test(value.$numberLong)) value = Number(value.$numberLong);
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  if (typeof value !== 'string') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day, hour, minute, second] = match.map(Number);
  if (month < 1 || month > 12 || day < 1 || day > new Date(Date.UTC(year, month, 0)).getUTCDate() || hour > 23 || minute > 59 || second > 59) return null;
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : new Date(time).toISOString();
}

function safeLocation(value) {
  // Historical URLs are metadata, never download instructions or verified attachments.
  // Query strings, fragments and user-info may contain credentials and are discarded.
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) {
    try {
      const url = new URL(value);
      if (!['https:', 'http:'].includes(url.protocol)) return null;
      url.username = '';
      url.password = '';
      url.search = '';
      url.hash = '';
      return url.href;
    } catch { return null; }
  }
  if (/[?#]/.test(value) || value.includes('\\') || value.startsWith('/') || value.split('/').includes('..')) return null;
  return value;
}

export function normalizeExport(input) {
  const issues = [];
  const issue = (code, collection, id, path) => issues.push({ code, ...(collection && { collection }), ...(id && { id }), ...(path && { path }) });
  const source = {};
  const mapping = {};
  const records = {};
  const indexes = {};
  const counts = { input: {}, normalized: {} };
  if (!input || input.schemaVersion !== 'legacy-export-v1') issue('INVALID_SCHEMA_VERSION');
  for (const field of ['system', 'exportId']) {
    const value = identifier(input?.source?.[field]);
    if (!value) issue('INVALID_SOURCE', null, null, field);
    else source[field] = value;
  }
  for (const field of ['orgId', 'projectId', 'legacyProjectId']) {
    const value = identifier(input?.mapping?.[field]);
    if (!value || (field !== 'legacyProjectId' && !/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(value))) issue('INVALID_MAPPING', null, null, field);
    else mapping[field] = value;
  }
  if (!input?.collections || typeof input.collections !== 'object' || Array.isArray(input.collections)) issue('INVALID_COLLECTIONS');

  for (const [collection, schema] of Object.entries(schemas)) {
    records[collection] = [];
    indexes[collection] = new Map();
    const rows = input?.collections?.[collection] ?? [];
    counts.input[collection] = Array.isArray(rows) ? rows.length : 0;
    if (!Array.isArray(rows)) {
      issue('INVALID_COLLECTION', collection);
      counts.normalized[collection] = 0;
      continue;
    }
    for (const row of rows) {
      const id = identifier(row?._id);
      if (!id) { issue('INVALID_ID', collection); continue; }
      if (indexes[collection].has(id)) { issue('DUPLICATE_ID', collection, id); continue; }
      const normalized = { id };
      for (const field of schema.required ?? []) if (row[field] === undefined) issue('MISSING_FIELD', collection, id, field);
      for (const field of schema.strings ?? []) {
        if (row[field] === undefined) continue;
        if (typeof row[field] !== 'string' || row[field].length > 100000) { issue('INVALID_STRING', collection, id, field); continue; }
        const value = collection === 'files' && field === 'location' ? safeLocation(row[field]) : row[field];
        if (value === null) issue('UNSAFE_FILE_LOCATION', collection, id, field);
        else normalized[field] = value;
      }
      for (const field of schema.stringArrays ?? []) {
        if (row[field] === undefined) continue;
        if (!Array.isArray(row[field]) || row[field].some((value) => typeof value !== 'string' || value.length > 1000)) issue('INVALID_STRING_ARRAY', collection, id, field);
        else normalized[field] = [...row[field]];
      }
      for (const field of schema.numbers ?? []) {
        if (row[field] === undefined) continue;
        if (!Number.isSafeInteger(row[field]) || row[field] < 0) issue('INVALID_NUMBER', collection, id, field);
        else normalized[field] = row[field];
      }
      for (const field of [...dates, ...(schema.dates ?? [])]) {
        if (row[field] === undefined) continue;
        const value = normalizedDate(row[field]);
        if (!value) issue('INVALID_DATE', collection, id, field);
        else normalized[field] = value;
      }
      for (const [field, [, many, required]] of Object.entries(schema.refs ?? {})) {
        if (!many && row[field] === undefined) {
          if (required) issue('MISSING_REFERENCE', collection, id, field);
          continue;
        }
        const values = many ? row[field] ?? [] : [row[field]];
        if (!Array.isArray(values)) { issue('INVALID_REFERENCE_ARRAY', collection, id, field); continue; }
        const refs = [];
        for (const value of values) {
          const reference = identifier(value);
          if (!reference) issue('INVALID_REFERENCE', collection, id, field);
          else refs.push(reference);
        }
        normalized[field] = many ? refs : refs[0];
      }
      indexes[collection].set(id, normalized);
      records[collection].push(normalized);
    }
    records[collection].sort((left, right) => left.id < right.id ? -1 : left.id > right.id ? 1 : 0);
    counts.normalized[collection] = records[collection].length;
  }

  const adjacency = new Map();
  for (const [collection, schema] of Object.entries(schemas)) {
    for (const row of records[collection]) {
      const links = [];
      for (const [field, [target, many]] of Object.entries(schema.refs ?? {})) {
        for (const reference of many ? row[field] ?? [] : row[field] ? [row[field]] : []) {
          if (!indexes[target].has(reference)) issue('ORPHAN_REFERENCE', collection, row.id, field);
          else links.push(`${target}/${reference}`);
        }
      }
      adjacency.set(`${collection}/${row.id}`, links);
    }
  }
  const project = indexes.projects.get(mapping.legacyProjectId);
  if (!project) issue('MAPPED_PROJECT_NOT_FOUND', 'projects');
  for (const row of records.projects) if (row.id !== mapping.legacyProjectId) issue('UNMAPPED_PROJECT', 'projects', row.id);
  const reachable = new Set();
  const visit = (key) => {
    if (reachable.has(key)) return;
    reachable.add(key);
    for (const next of adjacency.get(key) ?? []) visit(next);
  };
  if (project) visit(`projects/${project.id}`);
  for (const [collection, rows] of Object.entries(records)) {
    if (collection === 'projects') continue;
    for (const row of rows) if (!reachable.has(`${collection}/${row.id}`)) issue('UNREACHABLE_RECORD', collection, row.id);
  }
  const report = { schemaVersion: 'logs-of-change-migration-report-v1', mode: 'validate-only', valid: issues.length === 0, source, mapping, counts, issues, projection: null };
  if (issues.length) return report;

  const sourceDigest = digest({ source, mapping, records });
  const changeLog = indexes.changeLogs.get(project.changeLog);
  const dereference = (collection, ids) => (ids ?? []).map((id) => indexes[collection].get(id));
  const history = dereference('logs', changeLog.logs).map((log) => {
    const content = {
      log,
      sections: dereference('logSections', log.logSections).map((section) => ({
        section,
        ...(section.type && { type: indexes.logSectionTypes.get(section.type) }),
        titles: dereference('logTexts', section.titles),
        texts: dereference('logTexts', section.texts),
        media: dereference('logMedia', section.media).map((media) => ({ media, file: indexes.files.get(media.file), verification: 'unverified-historical-reference' })),
      })),
    };
    return {
      id: `legacy-${digest({ system: source.system, project: project.id, log: log.id }).slice(0, 32)}`,
      status: 'historical', approved: false, revision: null, decisions: [], content,
      contentDigest: digest(content),
      provenance: { ...source, legacyProjectId: project.id, legacyChangeLogId: changeLog.id, legacyLogId: log.id, sourceDigest },
    };
  });
  report.projection = { schemaVersion: 'logs-of-change-historical-v1', source, mapping, sourceDigest, project, records, history };
  report.projectionDigest = digest(report.projection);
  report.digestAlgorithm = 'sha256';
  report.canonicalization = 'logs-of-change-canonical-json-v1';
  return report;
}

export function compareProjection(expected, actual) {
  if (!expected || !actual || typeof expected !== 'object' || typeof actual !== 'object') throw new TypeError('Projections must be JSON objects');
  const differences = [];
  const walk = (left, right, path) => {
    if (differences.length >= 100 || canonicalJson(left) === canonicalJson(right)) return;
    if (left === undefined || right === undefined) { differences.push({ path, kind: left === undefined ? 'unexpected' : 'missing' }); return; }
    if (left === null || right === null || typeof left !== typeof right || Array.isArray(left) !== Array.isArray(right)) { differences.push({ path, kind: 'changed' }); return; }
    if (typeof left !== 'object') { differences.push({ path, kind: 'changed' }); return; }
    for (const key of [...new Set([...Object.keys(left), ...Object.keys(right)])].sort()) walk(left[key], right[key], `${path}/${key.replaceAll('~', '~0').replaceAll('/', '~1')}`);
  };
  walk(expected, actual, '');
  const expectedDigest = digest(expected);
  const actualDigest = digest(actual);
  return { schemaVersion: 'logs-of-change-migration-parity-v1', matches: expectedDigest === actualDigest, expectedDigest, actualDigest, differences };
}
