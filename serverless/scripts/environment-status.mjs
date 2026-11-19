// Read-only discovery of the active Logs of Change environment. Legacy resource
// migration is handled separately; this reader never falls back to another stack.
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdir, realpath, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const serviceRoot = fileURLToPath(new URL('../', import.meta.url));
const region = 'us-east-1';
const domains = Object.freeze({ development: 'dev.logsofchange.lynxpardelle.com', testing: 'test.logsofchange.lynxpardelle.com', production: 'logsofchange.lynxpardelle.com' });
const required = Object.freeze({
  identity: ['UserPoolId', 'UserPoolClientId', 'Issuer', 'AuthDomain', 'AccessTableName', 'AccessTableArn', 'ApiEndpoint', 'ApiDomainName'],
  releases: ['ApiEndpoint', 'ApiDomainName', 'ReleasesTableName', 'ReleasesTableArn', 'EvidenceBucketName'],
  evidence: ['ApiEndpoint', 'ApiDomainName'],
  edge: ['PublicUrl', 'HealthUrl', 'DistributionId', 'FrontendFunctionName'],
});

function validateEnvironment(environment) {
  if (!Object.hasOwn(domains, environment)) throw new Error('Invalid environment. Choose development, testing or production explicitly.');
}

export function parseArguments(args) {
  const options = { environment: 'development', writeOutputs: false };
  let environmentSeen = false;
  for (const argument of args) {
    if (argument.startsWith('--environment=') && !environmentSeen) {
      options.environment = argument.slice('--environment='.length); environmentSeen = true;
    } else if (argument === '--write-outputs' && !options.writeOutputs) options.writeOutputs = true;
    else throw new Error(`Unsupported argument: ${argument}. Usage: node serverless/scripts/environment-status.mjs [--environment=development|testing|production] [--write-outputs]`);
  }
  validateEnvironment(options.environment);
  return options;
}

async function runAwsCli(args) {
  return new Promise((accept, reject) => {
    const child = spawn('aws', args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, AWS_PAGER: '' } });
    let output = '', errors = '';
    child.stdout.on('data', (chunk) => { output += chunk; });
    child.stderr.on('data', (chunk) => { errors += chunk; });
    child.on('error', reject);
    child.on('exit', (code) => code === 0 ? accept(output) : reject(new Error(`Read-only AWS discovery failed (${code}): ${errors.slice(0, 2000).trim()}`)));
  });
}

function publicSnapshot(environment, values) {
  validateEnvironment(environment);
  const stackNames = Object.fromEntries(Object.keys(required).map((service) => [service, `logsofchange-${environment}-${service}`]));
  if (values.region !== undefined && values.region !== region) throw new Error('Unexpected environment region.');
  if (values.stackNames !== undefined && Object.entries(stackNames).some(([service, name]) => values.stackNames[service] !== name)) throw new Error('Unexpected environment stack names.');
  const snapshot = { environment, region, domain: domains[environment], stackNames };
  for (const [service, keys] of Object.entries(required)) {
    snapshot[service] = {};
    for (const key of keys) {
      const value = values[service]?.[key];
      if (typeof value !== 'string' || !value.trim() || value.length > 2048 || /[\r\n]/.test(value)) throw new Error(`Missing or invalid public output: ${service}.${key}`);
      snapshot[service][key] = value;
    }
  }
  const expectedOrigin = `https://${domains[environment]}`;
  if (snapshot.edge.PublicUrl !== expectedOrigin) throw new Error(`Unexpected PublicUrl for ${environment}.`);
  if (snapshot.edge.HealthUrl !== `${expectedOrigin}/api/v1/health`) throw new Error(`Unexpected HealthUrl for ${environment}.`);
  for (const service of ['identity', 'releases', 'evidence']) {
    const api = snapshot[service];
    if (!/^https:\/\/[a-z0-9]+\.execute-api\.us-east-1\.amazonaws\.com$/.test(api.ApiEndpoint) || new URL(api.ApiEndpoint).hostname !== api.ApiDomainName) {
      throw new Error(`Unexpected API endpoint/domain outputs for ${service}.`);
    }
  }
  if (snapshot.identity.Issuer !== `https://cognito-idp.us-east-1.amazonaws.com/${snapshot.identity.UserPoolId}`) throw new Error('Unexpected identity issuer.');
  const auth = new URL(snapshot.identity.AuthDomain);
  if (auth.protocol !== 'https:' || auth.username || auth.password || auth.port || auth.search || auth.hash || auth.pathname !== '/' || !auth.hostname.endsWith('.auth.us-east-1.amazoncognito.com')) {
    throw new Error('Unexpected public authentication domain.');
  }
  return snapshot;
}

export async function readEnvironment(environment = 'development', { runAws = runAwsCli } = {}) {
  validateEnvironment(environment);
  const entries = await Promise.all(Object.keys(required).map(async (service) => {
    const stackName = `logsofchange-${environment}-${service}`;
    const response = JSON.parse(await runAws(['cloudformation', 'describe-stacks', '--stack-name', stackName, '--region', 'us-east-1', '--output', 'json']));
    const stack = response.Stacks?.[0];
    if (response.Stacks?.length !== 1 || stack.StackName !== stackName || !['CREATE_COMPLETE', 'UPDATE_COMPLETE', 'UPDATE_ROLLBACK_COMPLETE'].includes(stack.StackStatus)) {
      throw new Error(`Stack ${stackName} is missing or not in a stable completed state.`);
    }
    return [service, Object.fromEntries((stack.Outputs || []).map(({ OutputKey, OutputValue }) => [OutputKey, OutputValue]))];
  }));
  return publicSnapshot(environment, Object.fromEntries(entries));
}

export async function writeEnvironmentOutputs(snapshot, { serviceRoot: targetRoot = serviceRoot } = {}) {
  const clean = publicSnapshot(snapshot.environment, snapshot);
  const canonicalRoot = await realpath(targetRoot);
  const deploymentRoot = join(canonicalRoot, '.deployment');
  await mkdir(deploymentRoot, { recursive: true });
  if (await realpath(deploymentRoot) !== deploymentRoot) throw new Error('Refusing a redirected deployment directory.');
  const directory = join(deploymentRoot, clean.environment);
  await mkdir(directory, { recursive: true });
  if (await realpath(directory) !== directory) throw new Error('Refusing a redirected environment directory.');
  const output = join(directory, 'outputs.json');
  if (dirname(output) !== directory) throw new Error('Output escaped the fixed environment directory.');
  const temporary = join(directory, `.outputs-${randomUUID()}.tmp`);
  try {
    await writeFile(temporary, JSON.stringify(clean, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    await rename(temporary, output);
  } finally { await rm(temporary, { force: true }); }
  return output;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const options = parseArguments(process.argv.slice(2));
    const snapshot = await readEnvironment(options.environment);
    if (options.writeOutputs) await writeEnvironmentOutputs(snapshot);
    console.log(JSON.stringify(snapshot, null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
