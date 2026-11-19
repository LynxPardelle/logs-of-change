// Retire a verified empty development environment after its replacement passes checks.
// All source identifiers come from an explicit local inventory; no legacy prefix is embedded here.
import { spawn } from 'node:child_process';
import { readFile, mkdir, realpath, rename, rm, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const workspace = fileURLToPath(new URL('../../', import.meta.url));
const inventoryDirectory = resolve(workspace, 'serverless/.deployment/migration-logsofchange');
const components = ['edge', 'evidence', 'releases', 'identity', 'artifacts'];
const region = 'us-east-1';
const absent = /ResourceNotFoundException|NoSuchBucket|NoSuchEntity|does not exist|not found/i;

export function validateInventories(source, replacement) {
  if (source?.environment !== 'development' || source.region !== region || !/^[a-z][a-z0-9-]{2,30}$/.test(source.prefix || '') || source.prefix === 'logsofchange') throw new Error('Invalid source environment, region or prefix.');
  if (!/^\d{12}$/.test(source.accountId || '') || !/^Z[A-Z0-9]+$/.test(source.hostedZoneId || '')) throw new Error('Invalid source account or hosted zone.');
  if (source.domain !== `dev.${source.prefix}.lynxpardelle.com`) throw new Error('Source domain is outside its exact development prefix.');
  if (replacement?.environment !== 'development' || replacement.region !== region || replacement.domain !== 'dev.logsofchange.lynxpardelle.com' || replacement.edge?.PublicUrl !== 'https://dev.logsofchange.lynxpardelle.com') throw new Error('Replacement must be the new development environment.');
  for (const component of components) {
    const stack = source.stacks?.[component];
    const expected = `${source.prefix}-development-${component}`;
    const arnPrefix = `arn:aws:cloudformation:${region}:${source.accountId}:stack/${expected}/`;
    if (stack?.name !== expected || !stack.arn?.startsWith(arnPrefix) || !/^[a-f0-9-]+$/i.test(stack.arn.slice(arnPrefix.length))) throw new Error(`Invalid source stack inventory: ${component}.`);
  }
  for (const [label, component, logical] of [['accessTable', 'identity', 'AccessTable'], ['releasesTable', 'releases', 'ReleasesTable']]) {
    const table = source[label];
    if (!table?.name?.startsWith(`${source.prefix}-development-${component}-${logical}-`) || table.arn !== `arn:aws:dynamodb:${region}:${source.accountId}:table/${table.name}`) throw new Error(`Invalid owned table: ${label}.`);
  }
  if (!/^us-east-1_[A-Za-z0-9]+$/.test(source.userPoolId || '')) throw new Error('Invalid source user pool.');
  if (!source.evidenceBucket?.startsWith(`${source.prefix}-development-releases-evidencebucket-`) || source.artifactBucket !== `${source.prefix}-development-artifacts-${source.accountId}`) throw new Error('Invalid owned bucket inventory.');
  const allowedLogs = new Set([`/${source.prefix}/development/edge`, `/${source.prefix}/development/frontend`, `/${source.prefix}/development/identity`, `/${source.prefix}/development/evidence`, `/aws/lambda/${source.prefix}-development-releases`]);
  if (!Array.isArray(source.logGroups) || source.logGroups.some((name) => !allowedLogs.has(name)) || new Set(source.logGroups).size !== source.logGroups.length) throw new Error('Invalid owned log group inventory.');
  if (!Array.isArray(source.validationRecords)) throw new Error('Missing validation record inventory.');
  for (const record of source.validationRecords) {
    if (record.Type !== 'CNAME' || !record.Name?.endsWith(`.${source.domain}.`) || !record.Name.startsWith('_') || !Number.isInteger(record.TTL) || !Array.isArray(record.ResourceRecords) || record.ResourceRecords.length !== 1 || !/^[a-z0-9_.-]+\.acm-validations\.aws\.$/i.test(record.ResourceRecords[0]?.Value || '')) throw new Error('Invalid source DNS validation record.');
  }
  return source;
}

async function runAwsCli(args) {
  return new Promise((accept, reject) => {
    const child = spawn('aws', args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, AWS_PAGER: '' } });
    let output = '', error = '';
    child.stdout.on('data', (chunk) => { output += chunk; });
    child.stderr.on('data', (chunk) => { error += chunk; });
    child.on('error', reject);
    child.on('exit', (code) => code === 0 ? accept(output.trim()) : reject(new Error(error)));
  });
}

export async function retireEmptyEnvironment(source, replacement, { apply = false, runAws = runAwsCli, writeProgress = async () => {} } = {}) {
  validateInventories(source, replacement);
  const report = { product: 'Logs of Change', environment: 'development', mode: apply ? 'apply' : 'plan', sourcePrefix: source.prefix, sourceDomain: source.domain, replacementDomain: replacement.domain, startedAt: new Date().toISOString(), status: 'checking', counts: {}, actions: [] };
  const aws = async (args, optional = false) => {
    try {
      const result = await runAws([...args, '--region', region, '--output', 'json']);
      return typeof result === 'string' ? (result ? JSON.parse(result) : {}) : result;
    } catch (error) { if (optional && absent.test(error.message || '')) return null; throw error; }
  };
  const owned = ['--expected-bucket-owner', source.accountId];
  const action = async (name, target, operation) => {
    const entry = { name, target, status: apply ? 'running' : 'planned' };
    report.actions.push(entry);
    if (!apply) return;
    await writeProgress(report);
    await operation();
    entry.status = 'completed';
    await writeProgress(report);
  };
  const ensureEmpty = async () => {
    const pool = await aws(['cognito-idp', 'describe-user-pool', '--user-pool-id', source.userPoolId], true);
    if (pool && (pool.UserPool?.Id !== source.userPoolId || pool.UserPool?.Name !== `${source.prefix}-development`)) throw new Error('Source user pool ownership mismatch.');
    const users = pool ? await aws(['cognito-idp', 'list-users', '--user-pool-id', source.userPoolId, '--limit', '1', '--no-paginate']) : { Users: [] };
    report.counts.users = users.Users?.length || 0;
    if (report.counts.users || users.PaginationToken) throw new Error('Source has users; retirement is blocked.');
    for (const [label, table] of [['accessRows', source.accessTable], ['releaseRows', source.releasesTable]]) {
      const description = await aws(['dynamodb', 'describe-table', '--table-name', table.name], true);
      if (description && description.Table?.TableArn !== table.arn) throw new Error('Source table ownership mismatch.');
      const result = description ? await aws(['dynamodb', 'scan', '--table-name', table.name, '--select', 'COUNT', '--consistent-read', '--no-paginate']) : { Count: 0 };
      if (!Number.isSafeInteger(result.Count) || result.Count < 0 || result.Count || result.LastEvaluatedKey) throw new Error('Source has data or an incomplete scan; retirement is blocked.');
      report.counts[label] = result.Count;
    }
    const bucket = await aws(['s3api', 'head-bucket', '--bucket', source.evidenceBucket, ...owned], true);
    const versions = bucket ? await aws(['s3api', 'list-object-versions', '--bucket', source.evidenceBucket, '--max-keys', '1', '--no-paginate', ...owned]) : {};
    report.counts.evidenceVersions = versions.Versions?.length || 0;
    report.counts.evidenceDeleteMarkers = versions.DeleteMarkers?.length || 0;
    if (report.counts.evidenceVersions || report.counts.evidenceDeleteMarkers || versions.IsTruncated) throw new Error('Source evidence bucket is not empty; retirement is blocked.');
  };
  try {
    const identity = await aws(['sts', 'get-caller-identity']);
    if (identity.Account !== source.accountId) throw new Error('Active AWS account does not match the source inventory.');
    for (const component of components) {
      const expected = `logsofchange-development-${component}`;
      const result = await aws(['cloudformation', 'describe-stacks', '--stack-name', expected]);
      const stack = result.Stacks?.[0];
      if (result.Stacks?.length !== 1 || stack.StackName !== expected || !stack.StackId?.startsWith(`arn:aws:cloudformation:${region}:${source.accountId}:stack/${expected}/`) || !['CREATE_COMPLETE', 'UPDATE_COMPLETE'].includes(stack.StackStatus)) throw new Error('Replacement stack is missing, mismatched or incomplete.');
    }
    for (const component of components) {
      const inventory = source.stacks[component];
      const result = await aws(['cloudformation', 'describe-stacks', '--stack-name', inventory.name], true);
      if (result && (result.Stacks?.length !== 1 || result.Stacks[0].StackId !== inventory.arn || !['CREATE_COMPLETE', 'UPDATE_COMPLETE', 'UPDATE_ROLLBACK_COMPLETE'].includes(result.Stacks[0].StackStatus))) throw new Error('Source stack state or ownership changed.');
    }
    await ensureEmpty();
    report.status = 'ready';
    if (apply) { await ensureEmpty(); await writeProgress(report); }
    for (const component of components) {
      const stack = source.stacks[component];
      await action('delete-stack', stack.name, async () => {
        const existing = await aws(['cloudformation', 'describe-stacks', '--stack-name', stack.name], true);
        if (!existing) return;
        if (existing.Stacks?.[0]?.StackId !== stack.arn) throw new Error('Stack ownership changed before deletion.');
        await aws(['cloudformation', 'delete-stack', '--stack-name', stack.arn]);
        await aws(['cloudformation', 'wait', 'stack-delete-complete', '--stack-name', stack.arn]);
      });
    }
    for (const table of [source.accessTable, source.releasesTable]) {
      await action('delete-retained-empty-table', table.name, async () => {
        const existing = await aws(['dynamodb', 'describe-table', '--table-name', table.name], true);
        if (!existing) return;
        if (existing.Table?.TableArn !== table.arn) throw new Error('Table ownership changed before deletion.');
        const count = await aws(['dynamodb', 'scan', '--table-name', table.name, '--select', 'COUNT', '--consistent-read', '--no-paginate']);
        if (count.Count !== 0 || count.LastEvaluatedKey) throw new Error('Table received data; deletion is blocked.');
        if (existing.Table.DeletionProtectionEnabled) {
          await aws(['dynamodb', 'update-table', '--table-name', table.name, '--no-deletion-protection-enabled']);
          await aws(['dynamodb', 'wait', 'table-exists', '--table-name', table.name]);
        }
        await aws(['dynamodb', 'delete-table', '--table-name', table.name]);
        await aws(['dynamodb', 'wait', 'table-not-exists', '--table-name', table.name]);
      });
    }
    await action('delete-retained-empty-pool', source.userPoolId, async () => {
      const pool = await aws(['cognito-idp', 'describe-user-pool', '--user-pool-id', source.userPoolId], true);
      if (!pool) return;
      if (pool.UserPool?.Id !== source.userPoolId || pool.UserPool?.Name !== `${source.prefix}-development`) throw new Error('Pool ownership changed before deletion.');
      const users = await aws(['cognito-idp', 'list-users', '--user-pool-id', source.userPoolId, '--limit', '1', '--no-paginate']);
      if (users.Users?.length || users.PaginationToken) throw new Error('Pool received a user; deletion is blocked.');
      await aws(['cognito-idp', 'delete-user-pool', '--user-pool-id', source.userPoolId]);
    });
    await action('delete-retained-empty-evidence-bucket', source.evidenceBucket, async () => {
      const exists = await aws(['s3api', 'head-bucket', '--bucket', source.evidenceBucket, ...owned], true);
      if (!exists) return;
      const result = await aws(['s3api', 'list-object-versions', '--bucket', source.evidenceBucket, '--max-keys', '1', '--no-paginate', ...owned]);
      if (result.Versions?.length || result.DeleteMarkers?.length || result.IsTruncated) throw new Error('Evidence appeared; deletion is blocked.');
      await aws(['s3api', 'delete-bucket', '--bucket', source.evidenceBucket, ...owned]);
    });
    await action('delete-owned-artifact-versions-and-bucket', source.artifactBucket, async () => {
      const exists = await aws(['s3api', 'head-bucket', '--bucket', source.artifactBucket, ...owned], true);
      if (!exists) return;
      for (let batch = 0; batch < 10000; batch++) {
        const page = await aws(['s3api', 'list-object-versions', '--bucket', source.artifactBucket, '--max-keys', '1000', '--no-paginate', ...owned]);
        const objects = [...(page.Versions || []), ...(page.DeleteMarkers || [])].map(({ Key, VersionId }) => ({ Key, VersionId }));
        if (!objects.length) {
          if (page.IsTruncated) throw new Error('Incomplete artifact listing.');
          await aws(['s3api', 'delete-bucket', '--bucket', source.artifactBucket, ...owned]);
          return;
        }
        if (objects.some((item) => typeof item.Key !== 'string' || typeof item.VersionId !== 'string')) throw new Error('Invalid artifact version listing.');
        const result = await aws(['s3api', 'delete-objects', '--bucket', source.artifactBucket, '--delete', JSON.stringify({ Objects: objects, Quiet: true }), ...owned]);
        if (result.Errors?.length) throw new Error('Some artifact versions could not be deleted.');
      }
      throw new Error('Artifact cleanup exceeded its bounded batch count.');
    });
    for (const name of source.logGroups) {
      await action('delete-owned-log-group', name, () => aws(['logs', 'delete-log-group', '--log-group-name', name], true));
    }
    for (const record of source.validationRecords) {
      await action('delete-owned-validation-record', record.Name, async () => {
        const result = await aws(['route53', 'list-resource-record-sets', '--hosted-zone-id', source.hostedZoneId, '--start-record-name', record.Name, '--start-record-type', record.Type, '--max-items', '1']);
        const current = result.ResourceRecordSets?.[0];
        if (!current || current.Name !== record.Name || current.Type !== record.Type) return;
        const canonical = (item) => JSON.stringify({ Name: item.Name, Type: item.Type, TTL: item.TTL, ResourceRecords: item.ResourceRecords });
        if (canonical(current) !== canonical(record)) throw new Error('Validation record changed; deletion is blocked.');
        await aws(['route53', 'change-resource-record-sets', '--hosted-zone-id', source.hostedZoneId, '--change-batch', JSON.stringify({ Changes: [{ Action: 'DELETE', ResourceRecordSet: record }] })]);
      });
    }
    report.status = apply ? 'retired' : 'ready';
  } catch (error) {
    report.status = apply && report.actions.length ? 'failed' : 'blocked';
    report.failure = { name: error.name, message: error.message.startsWith('Source') || error.message.includes('blocked') || error.message.includes('ownership') || error.message.includes('Replacement') ? error.message : 'AWS operation failed; inspect the current action and resource before retrying.' };
    report.finishedAt = new Date().toISOString();
    if (apply) await writeProgress(report);
    const failure = new Error(report.failure.message); failure.report = report; throw failure;
  }
  report.finishedAt = new Date().toISOString();
  if (apply) await writeProgress(report);
  return report;
}

export function parseRetirementArguments(args) {
  const options = { apply: false };
  for (const argument of args) {
    if (argument === '--apply' && !options.apply) options.apply = true;
    else if (argument.startsWith('--source=') && !options.source) options.source = argument.slice('--source='.length);
    else if (argument.startsWith('--replacement=') && !options.replacement) options.replacement = argument.slice('--replacement='.length);
    else throw new Error('Unsupported or duplicate retirement argument.');
  }
  if (!options.source || !options.replacement) throw new Error('Explicit --source and --replacement inventory files are required.');
  return options;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const options = parseRetirementArguments(process.argv.slice(2));
    const directory = await realpath(inventoryDirectory);
    if (directory !== resolve(await realpath(workspace), 'serverless/.deployment/migration-logsofchange')) throw new Error('Refusing a redirected migration directory.');
    const inventory = async (filename) => {
      const path = await realpath(resolve(workspace, filename));
      if (dirname(path) !== directory || !path.endsWith('.json')) throw new Error('Inventory must be an explicit JSON in the fixed migration directory.');
      return JSON.parse(await readFile(path, 'utf8'));
    };
    const [source, replacement] = await Promise.all([inventory(options.source), inventory(options.replacement)]);
    const reportFile = resolve(directory, 'retirement-report.json');
    if (!reportFile.startsWith(directory + sep)) throw new Error('Report escaped the migration directory.');
    const writeProgress = async (report) => {
      await mkdir(directory, { recursive: true });
      const temporary = resolve(directory, `.retirement-${randomUUID()}.tmp`);
      try {
        await writeFile(temporary, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
        await rename(temporary, reportFile);
      } finally { await rm(temporary, { force: true }); }
    };
    const report = await retireEmptyEnvironment(source, replacement, { apply: options.apply, writeProgress });
    console.log(JSON.stringify(report, null, 2));
  } catch (error) { console.error(JSON.stringify(error.report || { status: 'blocked', message: error.message }, null, 2)); process.exitCode = 1; }
}
