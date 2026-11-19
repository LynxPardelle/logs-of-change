import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../../', import.meta.url));
const region = 'us-east-1';
const domains = Object.freeze({
  development: 'dev.logsofchange.lynxpardelle.com',
  testing: 'test.logsofchange.lynxpardelle.com',
  production: 'logsofchange.lynxpardelle.com',
});
const services = ['identity', 'releases', 'evidence', 'edge'];

export function parseDeployArguments(args) {
  const options = { environment: 'development', service: 'all', approveProduction: false };
  const seen = new Set();
  for (const argument of args) {
    const match = /^--(environment|service|hosted-zone-id|approve-production)=(.+)$/.exec(argument);
    if (!match || seen.has(match[1])) throw new Error('Unsupported or duplicate deployment argument.');
    const [, name, value] = match;
    seen.add(name);
    if (name === 'environment') options.environment = value;
    else if (name === 'service') options.service = value;
    else if (name === 'hosted-zone-id') {
      if (!/^Z[A-Z0-9]+$/.test(value)) throw new Error('Invalid hosted zone ID.');
      options.hostedZoneId = value;
    } else {
      if (value !== 'true') throw new Error('Production approval must be explicit --approve-production=true.');
      options.approveProduction = true;
    }
  }
  if (!Object.hasOwn(domains, options.environment)) throw new Error('Unknown environment.');
  if (!['all', ...services].includes(options.service)) throw new Error('Unknown service.');
  return options;
}

export function assertDeploymentBranch(environment, branch, approveProduction = false) {
  if (!Object.hasOwn(domains, environment)) throw new Error('Unknown environment.');
  const expected = environment === 'production' ? 'main' : environment;
  if (branch !== expected) throw new Error(`Deployment of ${environment} requires branch ${expected}.`);
  if (environment === 'production' && approveProduction !== true) {
    throw new Error('Production requires main and an explicit --approve-production=true following human release review.');
  }
}

async function run(command, args, { capture = false } = {}) {
  return new Promise((accept, reject) => {
    const child = spawn(command, args, { cwd: root, stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit', windowsHide: true, env: { ...process.env, AWS_PAGER: '' } });
    let output = '', errors = '';
    if (capture) { child.stdout.on('data', (chunk) => { output += chunk; }); child.stderr.on('data', (chunk) => { errors += chunk; }); }
    child.on('error', reject);
    child.on('exit', (code) => code === 0 ? accept(output.trim()) : reject(new Error(`${command} failed (${code}): ${errors.slice(0, 2000)}`)));
  });
}

export async function deployEnvironment(options, { runner = run } = {}) {
  // Revalidate programmatic callers as well as CLI arguments before any side effect.
  const normalized = parseDeployArguments([
    `--environment=${options.environment}`,
    `--service=${options.service || 'all'}`,
    ...(options.hostedZoneId ? [`--hosted-zone-id=${options.hostedZoneId}`] : []),
    ...(options.approveProduction === true ? ['--approve-production=true'] : []),
  ]);
  const { environment } = normalized;
  const branch = await runner('git', ['branch', '--show-current'], { capture: true });
  assertDeploymentBranch(environment, branch, normalized.approveProduction);
  // Only validated environment/branch pairs may create local artifacts or call AWS.
  const domain = domains[environment];
  const directory = resolve(root, 'serverless/.deployment', environment);
  await mkdir(directory, { recursive: true });
  const aws = (args, capture = false) => runner('aws', [...args, '--region', region], { capture });
  const account = JSON.parse(await aws(['sts', 'get-caller-identity', '--output', 'json'], true));
  if (!/^\d{12}$/.test(account.Account)) throw new Error('Unexpected AWS account identity.');
  const bucket = `logsofchange-${environment}-artifacts-${account.Account}`;
  const stackNames = Object.fromEntries(services.map((service) => [service, `logsofchange-${environment}-${service}`]));
  const bucketTemplate = {
    AWSTemplateFormatVersion: '2010-09-09', Resources: { Artifacts: { Type: 'AWS::S3::Bucket', DeletionPolicy: 'Retain', UpdateReplacePolicy: 'Retain', Properties: {
      BucketName: bucket, PublicAccessBlockConfiguration: { BlockPublicAcls: true, IgnorePublicAcls: true, BlockPublicPolicy: true, RestrictPublicBuckets: true },
      BucketEncryption: { ServerSideEncryptionConfiguration: [{ ServerSideEncryptionByDefault: { SSEAlgorithm: 'AES256' } }] }, VersioningConfiguration: { Status: 'Enabled' },
    } } },
  };
  const bucketFile = resolve(directory, 'artifacts.json');
  await writeFile(bucketFile, JSON.stringify(bucketTemplate, null, 2));
  await aws(['cloudformation', 'deploy', '--stack-name', `logsofchange-${environment}-artifacts`, '--template-file', bucketFile, '--no-fail-on-empty-changeset', '--tags', 'Product=Logs of Change', `Environment=${environment}`]);

  async function outputs(service) {
    const result = JSON.parse(await aws(['cloudformation', 'describe-stacks', '--stack-name', stackNames[service], '--output', 'json'], true));
    return Object.fromEntries(result.Stacks[0].Outputs.map(({ OutputKey, OutputValue }) => [OutputKey, OutputValue]));
  }
  async function deploy(service, template, parameters) {
    if (normalized.service !== 'all' && normalized.service !== service) return;
    const packaged = resolve(directory, `${service}.yaml`);
    console.log(`Packaging and deploying Logs of Change ${environment}/${service}`);
    await aws(['cloudformation', 'package', '--template-file', resolve(root, template), '--s3-bucket', bucket, '--s3-prefix', service, '--output-template-file', packaged]);
    await aws(['cloudformation', 'deploy', '--template-file', packaged, '--stack-name', stackNames[service], '--s3-bucket', bucket, '--capabilities', 'CAPABILITY_IAM', 'CAPABILITY_AUTO_EXPAND', '--no-fail-on-empty-changeset', '--parameter-overrides', ...Object.entries({ Environment: environment, ...parameters }).map(([key, value]) => `${key}=${value}`), '--tags', 'Product=Logs of Change', `Environment=${environment}`]);
  }

  await deploy('identity', 'serverless/services/identity/template.yaml', { PublicOrigin: `https://${domain}` });
  const access = await outputs('identity');
  if (normalized.service === 'identity') { console.log('Identity deployed.'); return; }
  await deploy('releases', 'serverless/services/releases/template.yaml', { UserPoolId: access.UserPoolId, UserPoolClientId: access.UserPoolClientId, AccessTableName: access.AccessTableName, AccessTableArn: access.AccessTableArn });
  const releases = await outputs('releases');
  if (normalized.service === 'releases') { console.log('Releases deployed.'); return; }
  await deploy('evidence', 'serverless/services/evidence/template.yaml', { UserPoolId: access.UserPoolId, UserPoolClientId: access.UserPoolClientId, ReleasesApiEndpoint: releases.ApiEndpoint });
  const evidence = await outputs('evidence');
  if (normalized.service === 'evidence') { console.log('Evidence deployed.'); return; }
  let hostedZoneId = normalized.hostedZoneId;
  if (!hostedZoneId) {
    const result = JSON.parse(await aws(['route53', 'list-hosted-zones-by-name', '--dns-name', 'lynxpardelle.com', '--output', 'json'], true));
    const zone = result.HostedZones.find((entry) => entry.Name === 'lynxpardelle.com.' && !entry.Config.PrivateZone);
    if (!zone) throw new Error('Public hosted zone lynxpardelle.com not found.');
    hostedZoneId = zone.Id.replace('/hostedzone/', '');
  }
  await deploy('edge', 'serverless/template.yaml', { DomainName: domain, HostedZoneId: hostedZoneId, IdentityApiDomainName: access.ApiDomainName, ReleasesApiDomainName: releases.ApiDomainName, EvidenceApiDomainName: evidence.ApiDomainName, AuthIssuer: access.Issuer, AuthClientId: access.UserPoolClientId, AuthDomain: access.AuthDomain });
  const edge = await outputs('edge');
  await writeFile(resolve(directory, 'outputs.json'), JSON.stringify({ environment, region, domain, stackNames, identity: access, releases, evidence, edge }, null, 2));
  console.log(`Deployment complete: ${edge.PublicUrl}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { await deployEnvironment(parseDeployArguments(process.argv.slice(2))); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
