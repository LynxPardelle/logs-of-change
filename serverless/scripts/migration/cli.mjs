#!/usr/bin/env node
import { open } from 'node:fs/promises';
import { extname, basename } from 'node:path';
import { normalizeExport, compareProjection } from './normalize.mjs';

const fail = (code, message) => {
  process.stdout.write(JSON.stringify({ error: { code, message } }) + '\n');
  process.exitCode = 2;
};

async function readExplicitJson(path) {
  if (extname(path).toLowerCase() !== '.json' || basename(path).startsWith('.')) throw new Error('INPUT_NOT_JSON');
  const handle = await open(path, 'r');
  try {
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size > 20 * 1024 * 1024) throw new Error('INPUT_TOO_LARGE');
    return JSON.parse(await handle.readFile('utf8'));
  } finally { await handle.close(); }
}

const args = process.argv.slice(2);
const options = {};
let validArgs = true;
for (let index = 0; index < args.length; index += 1) {
  const flag = args[index];
  if (flag === '--validate-only') continue;
  if (!['--input', '--compare'].includes(flag) || !args[index + 1] || args[index + 1].startsWith('--') || options[flag]) { validArgs = false; break; }
  options[flag] = args[++index];
}
if (!validArgs || !options['--input']) {
  fail('INVALID_ARGUMENTS', 'Usage: node cli.mjs --input export.json [--validate-only] [--compare projection.json]. No apply mode exists.');
} else {
  try {
    const report = normalizeExport(await readExplicitJson(options['--input']));
    if (options['--compare'] && report.valid) {
      const candidate = await readExplicitJson(options['--compare']);
      report.parity = compareProjection(report.projection, candidate.projection ?? candidate);
    }
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
    if (!report.valid || report.parity?.matches === false) process.exitCode = 1;
  } catch {
    // Deliberately avoid echoing input payloads, OS paths or JSON parser snippets.
    fail('INPUT_ERROR', 'Could not read a regular UTF-8 JSON input of at most 20 MiB.');
  }
}
