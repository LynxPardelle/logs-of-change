import { createServer } from 'node:http';
import { handler } from '../src/health/index.mjs';

const host = '127.0.0.1';
const port = 3001;

createServer(async (request, response) => {
  const pathname = new URL(request.url, `http://${host}:${port}`).pathname;

  if (request.method !== 'GET' || pathname !== '/api/v1/health') {
    response.writeHead(404).end();
    return;
  }

  const result = await handler();
  response.writeHead(result.statusCode, result.headers).end(result.body);
}).listen(port, host, () => {
  console.log(`Health API available at http://${host}:${port}/api/v1/health`);
});
