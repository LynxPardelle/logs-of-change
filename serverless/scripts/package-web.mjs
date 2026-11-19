import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const serverless = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const workspace = resolve(serverless, '..');

export async function packageWeb() {
  const output = join(workspace, 'web', 'dist', 'logsofchange-web');
  const stage = resolve(serverless, '.build', 'web');
  // Refuse to remove any directory other than this script's own generated artifact.
  if (stage !== join(serverless, '.build', 'web')) throw new Error('Unexpected artifact directory');
  await readFile(join(output, 'server', 'server.mjs'));
  await readFile(join(output, 'browser', 'index.html')).catch(async () => readFile(join(output, 'server', 'index.server.html')));
  await rm(stage, { recursive: true, force: true });
  await mkdir(stage, { recursive: true });
  await cp(join(output, 'server'), join(stage, 'server'), { recursive: true });
  await cp(join(output, 'browser'), join(stage, 'browser'), { recursive: true });
  await mkdir(join(stage, 'browser', 'downloads'), { recursive: true });
  await cp(join(workspace, 'cli', 'logsofchange.mjs'), join(stage, 'browser', 'downloads', 'logsofchange.mjs'));
  await mkdir(join(stage, 'node_modules'), { recursive: true });
  const adapterSource = join(workspace, 'web', 'node_modules', 'serverless-http');
  const adapterPackage = JSON.parse(await readFile(join(adapterSource, 'package.json'), 'utf8'));
  if (Object.keys(adapterPackage.dependencies ?? {}).length) throw new Error('Package adapter runtime dependencies explicitly before publishing');
  await cp(adapterSource, join(stage, 'node_modules', 'serverless-http'), { recursive: true });
  await writeFile(join(stage, 'package.json'), JSON.stringify({ name: 'logsofchange-web-lambda', private: true, type: 'module' }, null, 2) + '\n');
  await writeFile(join(stage, 'index.mjs'), [
    "import serverless from 'serverless-http';",
    "import { reqHandler } from './server/server.mjs';",
    'export const handler = serverless(reqHandler);',
    '',
  ].join('\n'));
  const files = [];
  async function inventory(directory) {
    for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await inventory(path);
      else files.push({ path: relative(stage, path).replaceAll('\\', '/'), sha256: createHash('sha256').update(await readFile(path)).digest('hex') });
    }
  }
  await inventory(stage);
  const sha256 = createHash('sha256').update(JSON.stringify(files)).digest('hex');
  await writeFile(join(stage, 'artifact-manifest.json'), JSON.stringify({ product: 'logsofchange', runtime: 'nodejs24.x', architecture: 'arm64', handler: 'index.handler', sha256, files }, null, 2) + '\n');
  return { directory: stage, sha256, files: files.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  console.log(JSON.stringify(await packageWeb(), null, 2));
}
