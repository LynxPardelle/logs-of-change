export async function handler() {
  return {
    statusCode: 200,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
    body: JSON.stringify({ product: 'Logs of Change', environment: process.env.ENVIRONMENT || 'development', auth: { issuer: process.env.AUTH_ISSUER, clientId: process.env.AUTH_CLIENT_ID, domain: process.env.AUTH_DOMAIN, redirectUri: `${process.env.PUBLIC_ORIGIN}/auth/callback` }, services: { identity: '/api/v1/identity', releases: '/api/v1/orgs', evidence: '/api/v1/evidence' } }),
  };
}
