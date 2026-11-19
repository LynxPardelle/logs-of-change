// Platform-only operation. Customer JWTs/API keys cannot assign product plans.
// Preview: node serverless/scripts/set-product-plan.mjs --environment=development --org=agency --project=pilot --plan=plus
// Apply adds --apply=true; production also requires main and --approve-production=true.
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { readEnvironment as discoverEnvironment } from './environment-status.mjs';
import { assertDeploymentBranch } from './deploy.mjs';
import { validId } from '../src/integrations/access.mjs';

const region = 'us-east-1';

export function parsePlanArguments(args) {
  const options = { apply: false, approveProduction: false };
  const seen = new Set();
  for (const argument of args) {
    const match = /^--(environment|org|project|plan|expires-at|apply|approve-production)=(.+)$/.exec(argument);
    if (!match || seen.has(match[1])) throw new Error('Unsupported or duplicate product-plan argument.');
    const [, name, value] = match;
    seen.add(name);
    if (name === 'apply' || name === 'approve-production') {
      if (value !== 'true') throw new Error('Operational approval must be explicit true.');
      options[name === 'apply' ? 'apply' : 'approveProduction'] = true;
    } else if (name === 'expires-at') {
      if (!/^[1-9]\d{0,15}$/.test(value) || !Number.isSafeInteger(Number(value))) throw new Error('Expiry must be a positive epoch second.');
      options.expiresAt = Number(value);
    } else options[name] = value;
  }
  if (!['development', 'testing', 'production'].includes(options.environment) || !validId(options.org) || !validId(options.project) || !['free', 'plus'].includes(options.plan)) throw new Error('Explicit environment, org, project and plan=free|plus are required.');
  if (options.plan === 'free' && options.expiresAt !== undefined) throw new Error('Free disables Plus and cannot have a Plus expiry.');
  return options;
}

async function runCommand(command, args) {
  return new Promise((accept, reject) => {
    const child = spawn(command, args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, AWS_PAGER: '' } });
    let output = '';
    child.stdout.on('data', chunk => { output += chunk; });
    child.stderr.on('data', () => {});
    child.on('error', () => reject(new Error(`Cannot execute platform command ${command}.`)));
    child.on('exit', code => code === 0 ? accept(output.trim()) : reject(new Error(`Platform command ${command} failed (${code}); no automatic retry was performed.`)));
  });
}

const encode = value => typeof value === 'string' ? { S: value } : typeof value === 'boolean' ? { BOOL: value } : { N: String(value) };
const encodeRow = row => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, encode(value)]));

function decodeProduct(item) {
  if (!item) return null;
  if (Object.keys(item).some(key => !['PK', 'SK', 'plan', 'active', 'expiresAt', 'version', 'updatedAt'].includes(key))) throw new Error('Existing product row has unsupported metadata; refusing to replace it.');
  const row = { plan: item.plan?.S, active: item.active?.BOOL };
  if (item.expiresAt !== undefined) row.expiresAt = item.expiresAt.N === undefined ? NaN : Number(item.expiresAt.N);
  if (item.version !== undefined) row.version = item.version.N === undefined ? NaN : Number(item.version.N);
  if (!['free', 'plus'].includes(row.plan) || typeof row.active !== 'boolean' || (row.expiresAt !== undefined && (!Number.isSafeInteger(row.expiresAt) || row.expiresAt <= 0)) || (row.version !== undefined && (!Number.isSafeInteger(row.version) || row.version < 1 || row.version >= Number.MAX_SAFE_INTEGER))) throw new Error('Existing product plan is malformed.');
  return row;
}

function casCondition(previous) {
  if (!previous) return { ConditionExpression: 'attribute_not_exists(PK)' };
  const names = { '#plan': 'plan', '#active': 'active', '#expiresAt': 'expiresAt', '#version': 'version' };
  const values = { ':oldPlan': encode(previous.plan), ':oldActive': encode(previous.active) };
  const conditions = ['#plan = :oldPlan', '#active = :oldActive'];
  if (previous.expiresAt === undefined) conditions.push('attribute_not_exists(#expiresAt)');
  else { conditions.push('#expiresAt = :oldExpiry'); values[':oldExpiry'] = encode(previous.expiresAt); }
  if (previous.version === undefined) conditions.push('attribute_not_exists(#version)');
  else { conditions.push('#version = :oldVersion'); values[':oldVersion'] = encode(previous.version); }
  return { ConditionExpression: conditions.join(' AND '), ExpressionAttributeNames: names, ExpressionAttributeValues: values };
}

export async function setProductPlan(input, { runner = runCommand, readEnvironment = discoverEnvironment, now = Date.now } = {}) {
  if (!input || Object.keys(input).some(key => !['environment', 'org', 'project', 'plan', 'expiresAt', 'apply', 'approveProduction'].includes(key))) throw new Error('Invalid product-plan options.');
  const options = parsePlanArguments([
    `--environment=${input.environment}`, `--org=${input.org}`, `--project=${input.project}`, `--plan=${input.plan}`,
    ...(input.expiresAt !== undefined ? [`--expires-at=${input.expiresAt}`] : []), ...(input.apply === true ? ['--apply=true'] : []), ...(input.approveProduction === true ? ['--approve-production=true'] : []),
  ]);
  const epoch = Math.floor(now() / 1000);
  if (options.expiresAt !== undefined && options.expiresAt <= epoch) throw new Error('Plus expiry must be in the future.');
  const branch = (await runner('git', ['branch', '--show-current'])).trim();
  if (options.apply || options.environment === 'production') assertDeploymentBranch(options.environment, branch, options.approveProduction);
  const environment = await readEnvironment(options.environment);
  const caller = JSON.parse(await runner('aws', ['sts', 'get-caller-identity', '--region', region, '--output', 'json']));
  const table = environment.identity?.AccessTableName;
  const tableArn = /^arn:aws:dynamodb:us-east-1:(\d{12}):table\/(.+)$/.exec(environment.identity?.AccessTableArn || '');
  if (environment.environment !== options.environment || environment.region !== region || !/^\d{12}$/.test(caller.Account || '') || !tableArn || tableArn[1] !== caller.Account || tableArn[2] !== table || !table.startsWith(`logsofchange-${options.environment}-`)) throw new Error('Product-plan target account, region or table does not match the discovered environment.');
  const get = async SK => JSON.parse(await runner('aws', ['dynamodb', 'get-item', '--table-name', table, '--key', JSON.stringify(encodeRow({ PK: `TENANT#${options.org}`, SK })), '--consistent-read', '--region', region, '--output', 'json'])).Item;
  const [project, previousItem] = await Promise.all([get(`PROJECT#${options.project}`), get('PRODUCT')]);
  if (project?.active?.BOOL !== true || project.projectId?.S !== options.project) throw new Error('The exact target project is missing or inactive.');
  const previous = decodeProduct(previousItem);
  const product = { plan: options.plan, active: options.plan === 'plus', ...(options.expiresAt !== undefined ? { expiresAt: options.expiresAt } : {}) };
  const preview = { applied: false, environment: options.environment, org: options.org, project: options.project, previous: previous ? { plan: previous.plan, active: previous.active, ...(previous.expiresAt !== undefined ? { expiresAt: previous.expiresAt } : {}) } : null, product };
  if (!options.apply) return preview;
  const transaction = [
    { ConditionCheck: { TableName: table, Key: encodeRow({ PK: `TENANT#${options.org}`, SK: `PROJECT#${options.project}` }), ConditionExpression: '#active = :active AND #projectId = :projectId', ExpressionAttributeNames: { '#active': 'active', '#projectId': 'projectId' }, ExpressionAttributeValues: { ':active': encode(true), ':projectId': encode(options.project) } } },
    { Put: { TableName: table, Item: encodeRow({ PK: `TENANT#${options.org}`, SK: 'PRODUCT', ...product, version: (previous?.version || 0) + 1, updatedAt: new Date(now()).toISOString() }), ...casCondition(previous) } },
  ];
  await runner('aws', ['dynamodb', 'transact-write-items', '--transact-items', JSON.stringify(transaction), '--region', region, '--output', 'json']);
  return { ...preview, applied: true };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { console.log(JSON.stringify(await setProductPlan(parsePlanArguments(process.argv.slice(2))), null, 2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
