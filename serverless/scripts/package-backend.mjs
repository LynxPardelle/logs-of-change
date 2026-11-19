import { cp, mkdir, readFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, sep } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(root, '.build/backend');
if (!output.startsWith(resolve(root, '.build') + sep)) throw new Error('Package output escaped service workspace.');
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(resolve(root, 'src'), output, { recursive: true });
await cp(resolve(root, 'package.json'), resolve(output, 'package.json'));
const lock = JSON.parse(await readFile(resolve(root, 'package-lock.json'), 'utf8'));
const developmentPackages = Object.entries(lock.packages).filter(([key, value]) => key && value.dev).map(([key]) => resolve(root, key));
const binDirectory = resolve(root, 'node_modules/.bin');
await cp(resolve(root, 'node_modules'), resolve(output, 'node_modules'), { recursive: true,
  filter: (source) => source !== binDirectory && !source.startsWith(binDirectory + sep) && !developmentPackages.some((developmentPath) => source === developmentPath || source.startsWith(developmentPath + sep)),
});
console.log('Backend package staged in serverless/.build/backend');
