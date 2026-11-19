import { AngularNodeAppEngine, createNodeRequestHandler, isMainModule, writeResponseToNodeResponse } from '@angular/ssr/node';
import express from 'express';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const serverFolder = dirname(fileURLToPath(import.meta.url));
const browserFolder = resolve(serverFolder, '../browser');
const app = express();
const engine = new AngularNodeAppEngine();

app.disable('x-powered-by');
app.use((request, response, next) => {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.setHeader('X-Frame-Options', 'DENY');
  if (request.path.startsWith('/api/')) { response.status(404).json({ error: { code: 'NOT_FOUND', message: 'API origin required' } }); return; }
  next();
});
app.use(express.static(browserFolder, { maxAge: '1y', index: false, redirect: false, dotfiles: 'deny', setHeaders(response, filePath) {
  if (filePath === resolve(browserFolder, 'downloads/logsofchange.mjs')) {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Content-Disposition', 'attachment; filename="logsofchange.mjs"');
  }
} }));
app.use((request, response, next) => {
  response.setHeader('Cache-Control', 'no-store');
  engine.handle(request, { publicOrigin: process.env['PUBLIC_ORIGIN'] }).then(rendered => rendered ? writeResponseToNodeResponse(rendered, response) : next()).catch(next);
});
if (isMainModule(import.meta.url)) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, () => console.log(`Logs of Change SSR listening on ${port}`));
}
export const reqHandler = createNodeRequestHandler(app);
