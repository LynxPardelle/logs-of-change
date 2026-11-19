#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const origins = Object.freeze({ development: 'https://dev.logsofchange.lynxpardelle.com', testing: 'https://test.logsofchange.lynxpardelle.com', production: 'https://logsofchange.lynxpardelle.com' });
const validId = value => /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(value);
export const usage = 'logsofchange --environment=production --org=ORG --project=PROJECT --file=release.json --idempotency-key=BUILD_ID\nSet LOGSOFCHANGE_API_KEY in the process environment. A key can only create private drafts. Node.js 24 is required.';

export function parseArguments(args) {
  const options = { environment: 'production' };
  const seen = new Set();
  for (const argument of args) {
    const match = /^--(environment|org|project|file|idempotency-key)=(.+)$/.exec(argument);
    if (!match || seen.has(match[1])) throw new Error('Unsupported or repeated CLI argument. Use --help.');
    seen.add(match[1]); options[match[1]] = match[2];
  }
  if (!Object.hasOwn(origins, options.environment)) throw new Error('Choose development, testing or production.');
  if (!validId(options.org || '') || !validId(options.project || '')) throw new Error('A valid organization and project are required.');
  if (!options.file || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(options['idempotency-key'] || '')) throw new Error('An input file and a stable Idempotency-Key are required.');
  return options;
}

function validatePayload(raw) {
  if (Buffer.byteLength(raw, 'utf8') > 65536) throw new Error('The input JSON exceeds 64 KiB.');
  let body;
  try { body = JSON.parse(raw); } catch { throw new Error('The input file must contain valid JSON.'); }
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => !['title', 'summary', 'changes', 'source'].includes(key))) throw new Error('Only title, summary, changes and optional source are allowed.');
  if (typeof body.title !== 'string' || !body.title.trim() || body.title.length > 160 || (body.summary !== undefined && (typeof body.summary !== 'string' || body.summary.length > 8000)) || !Array.isArray(body.changes) || body.changes.length > 30 || body.changes.some(item => typeof item !== 'string' || !item.trim() || item.length > 700)) throw new Error('The draft content is invalid.');
  if (body.source !== undefined) {
    if (!body.source || typeof body.source !== 'object' || Array.isArray(body.source) || Object.keys(body.source).some(key => !['system', 'externalId', 'revision'].includes(key)) || Object.entries(body.source).some(([key, value]) => typeof value !== 'string' || !value.trim() || value.length > ({ system: 80, externalId: 200, revision: 160 })[key])) throw new Error('The optional source must contain bounded text fields.');
  }
  return body;
}

export async function submitDraft(args, { env = process.env, readInput = path => readFile(path, 'utf8'), fetchImpl = fetch } = {}) {
  const options = parseArguments(args);
  const token = env.LOGSOFCHANGE_API_KEY;
  if (typeof token !== 'string' || !/^loc_[a-f0-9]{32}_[A-Za-z0-9_-]{43}$/.test(token)) throw new Error('Set a valid LOGSOFCHANGE_API_KEY in the process environment.');
  let raw;
  try { raw = await readInput(options.file); } catch { throw new Error('Cannot read the explicitly supplied JSON file.'); }
  const body = validatePayload(raw);
  const url = `${origins[options.environment]}/api/v1/ingestions/orgs/${options.org}/projects/${options.project}/releases`;
  let response;
  try {
    response = await fetchImpl(url, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(30000), headers: { 'content-type': 'application/json', 'x-logsofchange-key': token, 'idempotency-key': options['idempotency-key'] }, body: JSON.stringify(body) });
  } catch { throw new Error('The HTTPS request failed. Retry with the same Idempotency-Key and content.'); }
  if (![200, 201].includes(response.status)) {
    // Never print a remote response body: even an upstream error could echo credentials.
    throw new Error(`Logs of Change rejected the draft (HTTP ${Number(response.status)}). Keep the same Idempotency-Key when retrying the same content.`);
  }
  let result;
  try { result = await response.json(); } catch { throw new Error('The API returned an invalid response.'); }
  if (!validId(result?.release?.id || '') || result.release.status !== 'draft' || !Number.isSafeInteger(result.release.revision) || result.release.revision !== 1) throw new Error('The API did not confirm a private draft.');
  return { environment: options.environment, releaseId: result.release.id, revision: result.release.revision, status: result.release.status };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (process.argv.length === 3 && process.argv[2] === '--help') console.log(usage);
  else {
    try { console.log(JSON.stringify(await submitDraft(process.argv.slice(2)))); }
    catch (error) { console.error(error.message); process.exitCode = 1; }
  }
}
