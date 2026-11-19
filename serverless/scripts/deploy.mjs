import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../../', import.meta.url));
const options = Object.fromEntries(process.argv.slice(2).map((arg) => arg.replace(/^--/, '').split('=')));
const environment = options.environment || 'development';
if (!['development', 'testing', 'production'].includes(environment)) throw new Error('Unknown environment');
if (options.service && !['all', 'identity', 'releases', 'evidence', 'edge'].includes(options.service)) throw new Error('Unknown service');
const region = 'us-east-1';
const domain = ({ development: 'dev.hitoclaro.lynxpardelle.com', testing: 'test.hitoclaro.lynxpardelle.com', production: 'hitoclaro.lynxpardelle.com' })[environment];
const directory = resolve(root, 'serverless/.deployment', environment);
await mkdir(directory, { recursive: true });

async function run(command, args, { capture = false } = {}) {
  return new Promise((accept, reject) => {
    const child = spawn(command, args, { cwd: root, stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit', windowsHide: true, env: { ...process.env, AWS_PAGER: '' } });
    let output = '', errors = '';
    if (capture) { child.stdout.on('data', (chunk) => { output += chunk; }); child.stderr.on('data', (chunk) => { errors += chunk; }); }
    child.on('error', reject);
    child.on('exit', (code) => code === 0 ? accept(output.trim()) : reject(new Error(`${command} failed (${code}): ${errors.slice(0, 2000)}`)));
  });
}
const aws = (args, capture = false) => run('aws', [...args, '--region', region], { capture });
const branch = await run('git', ['branch', '--show-current'], { capture: true });
if (environment === 'testing' && branch !== 'testing') throw new Error('Testing must be promoted from branch testing.');
if (environment === 'production' && (branch !== 'main' || options['approve-production'] !== 'true')) throw new Error('Production requires main and an explicit --approve-production=true following human release review.');
const identity = JSON.parse(await aws(['sts', 'get-caller-identity', '--output', 'json'], true));
const bucket = `hitoclaro-${environment}-artifacts-${identity.Account}`;
const bucketTemplate = {
  AWSTemplateFormatVersion: '2010-09-09', Resources: { Artifacts: { Type: 'AWS::S3::Bucket', DeletionPolicy: 'Retain', UpdateReplacePolicy: 'Retain', Properties: {
    BucketName: bucket, PublicAccessBlockConfiguration: { BlockPublicAcls: true, IgnorePublicAcls: true, BlockPublicPolicy: true, RestrictPublicBuckets: true },
    BucketEncryption: { ServerSideEncryptionConfiguration: [{ ServerSideEncryptionByDefault: { SSEAlgorithm: 'AES256' } }] }, VersioningConfiguration: { Status: 'Enabled' },
  } } },
};
const bucketFile = resolve(directory, 'artifacts.json');
await writeFile(bucketFile, JSON.stringify(bucketTemplate, null, 2));
await aws(['cloudformation', 'deploy', '--stack-name', `hitoclaro-${environment}-artifacts`, '--template-file', bucketFile, '--no-fail-on-empty-changeset', '--tags', 'Product=Logs of Change', `Environment=${environment}`]);

async function outputs(service) {
  const result = JSON.parse(await aws(['cloudformation', 'describe-stacks', '--stack-name', `hitoclaro-${environment}-${service}`, '--output', 'json'], true));
  return Object.fromEntries(result.Stacks[0].Outputs.map(({ OutputKey, OutputValue }) => [OutputKey, OutputValue]));
}
async function deploy(service, template, parameters) {
  if (options.service && options.service !== 'all' && options.service !== service) return;
  const packaged = resolve(directory, `${service}.yaml`);
  console.log(`Packaging and deploying Logs of Change ${environment}/${service}`);
  await aws(['cloudformation', 'package', '--template-file', resolve(root, template), '--s3-bucket', bucket, '--s3-prefix', service, '--output-template-file', packaged]);
  await aws(['cloudformation', 'deploy', '--template-file', packaged, '--stack-name', `hitoclaro-${environment}-${service}`, '--s3-bucket', bucket, '--capabilities', 'CAPABILITY_IAM', 'CAPABILITY_AUTO_EXPAND', '--no-fail-on-empty-changeset', '--parameter-overrides', ...Object.entries({ Environment: environment, ...parameters }).map(([key, value]) => `${key}=${value}`), '--tags', 'Product=Logs of Change', `Environment=${environment}`]);
}

await deploy('identity', 'serverless/services/identity/template.yaml', { PublicOrigin: `https://${domain}` });
const access = await outputs('identity');
if (options.service === 'identity') { console.log('Identity deployed.'); process.exit(0); }
await deploy('releases', 'serverless/services/releases/template.yaml', { UserPoolId: access.UserPoolId, UserPoolClientId: access.UserPoolClientId, AccessTableName: access.AccessTableName, AccessTableArn: access.AccessTableArn });
const releases = await outputs('releases');
if (options.service === 'releases') { console.log('Releases deployed.'); process.exit(0); }
await deploy('evidence', 'serverless/services/evidence/template.yaml', { UserPoolId: access.UserPoolId, UserPoolClientId: access.UserPoolClientId, ReleasesApiEndpoint: releases.ApiEndpoint });
const evidence = await outputs('evidence');
if (options.service === 'evidence') { console.log('Evidence deployed.'); process.exit(0); }
let hostedZoneId = options['hosted-zone-id'];
if (!hostedZoneId) {
  const result = JSON.parse(await aws(['route53', 'list-hosted-zones-by-name', '--dns-name', 'lynxpardelle.com', '--output', 'json'], true));
  const zone = result.HostedZones.find((entry) => entry.Name === 'lynxpardelle.com.' && !entry.Config.PrivateZone);
  if (!zone) throw new Error('Public hosted zone lynxpardelle.com not found.');
  hostedZoneId = zone.Id.replace('/hostedzone/', '');
}
await deploy('edge', 'serverless/template.yaml', { DomainName: domain, HostedZoneId: hostedZoneId, IdentityApiDomainName: access.ApiDomainName, ReleasesApiDomainName: releases.ApiDomainName, EvidenceApiDomainName: evidence.ApiDomainName, AuthIssuer: access.Issuer, AuthClientId: access.UserPoolClientId, AuthDomain: access.AuthDomain });
const edge = await outputs('edge');
await writeFile(resolve(directory, 'outputs.json'), JSON.stringify({ environment, domain, identity: access, releases, evidence, edge }, null, 2));
console.log(`Deployment complete: ${edge.PublicUrl}`);
