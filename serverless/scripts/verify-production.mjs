// Reproducible, explicit production verification. Importing this file does nothing.
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildProductionSources, directory, parseVerificationArguments, productionPreflight, writeVerificationArtifacts } from './production-verification.mjs';

export async function verifyProduction(args = process.argv.slice(2), { preflight = productionPreflight, writeArtifacts = writeVerificationArtifacts,
  runModule = path => import(pathToFileURL(path).href), exitCode = () => process.exitCode } = {}) {
  const options = parseVerificationArguments(args);
  const context = await preflight({ args });
  const prepared = buildProductionSources(context.sources);
  await writeArtifacts(context, prepared);
  if (options.mode === 'all' || options.mode === 'qa') {
    await runModule(resolve(directory, 'qa-production.mjs'));
    if (exitCode()) throw new Error('Production QA failed; the synthetic approval was not started. Consult the sanitized QA report.');
  }
  if (options.mode === 'all' || options.mode === 'smoke') {
    await runModule(resolve(directory, 'smoke-production.mjs'));
    if (exitCode()) throw new Error('Production smoke failed. Consult the sanitized smoke and cleanup report.');
  }
  return { environment: 'production', codeCommit: context.codeCommit, mode: options.mode, passed: true };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { console.log(JSON.stringify(await verifyProduction())); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
