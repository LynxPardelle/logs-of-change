import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { resolveQaTarget } from './qa-web-target.mjs';

const serviceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { base, environment } = resolveQaTarget(process.argv[2]);
const output = join(serviceRoot, '.deployment', environment, 'browser-qa');
await mkdir(output, { recursive: true });
const safeUrl = value => { try { const url = new URL(value); return `${url.origin}${url.pathname}`; } catch { return value; } };
const executablePath = process.env.LOGSOFCHANGE_BROWSER_PATH;
const channel = process.env.LOGSOFCHANGE_BROWSER_CHANNEL || (existsSync('C:/Program Files/Google/Chrome/Application/chrome.exe') ? 'chrome' : existsSync('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe') ? 'msedge' : undefined);
const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : channel ? { channel } : {}) });
const report = { origin: base.origin, environment, checkedAt: new Date().toISOString(), pages: [], checks: {} };

try {
  for (const [name, viewport] of [['desktop', { width: 1280, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
    const context = await browser.newContext({ viewport, deviceScaleFactor: 1, isMobile: name === 'mobile', hasTouch: name === 'mobile' });
    const page = await context.newPage();
    const consoleErrors = []; const pageErrors = []; const requestErrors = []; const httpErrors = [];
    page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    page.on('pageerror', error => pageErrors.push(error.message));
    page.on('requestfailed', request => requestErrors.push({ url: safeUrl(request.url()), error: request.failure()?.errorText }));
    page.on('response', response => { if (response.status() >= 400) httpErrors.push({ url: safeUrl(response.url()), status: response.status() }); });
    const response = await page.goto(base.origin, { waitUntil: 'networkidle', timeout: 45000 });
    assert.equal(response?.status(), 200, `${name}: landing HTTP status`);
    await page.getByRole('heading', { name: /Entrega tu trabajo/ }).waitFor();
    // Mobile keeps this diagnostic out of the compact header; its hydrated state and HTTP contract still matter.
    await page.getByText('API disponible', { exact: true }).waitFor({ state: 'attached', timeout: 20000 });
    const login = page.getByRole('button', { name: /Iniciar sesión/ });
    await login.waitFor();
    await page.waitForFunction(() => !Array.from(document.querySelectorAll('button')).find(button => button.textContent?.includes('Iniciar sesión'))?.disabled, undefined, { timeout: 20000 });
    const dimensions = await page.evaluate(() => ({ viewportWidth: innerWidth, documentWidth: document.documentElement.scrollWidth, documentHeight: document.documentElement.scrollHeight }));
    assert.ok(dimensions.documentWidth <= viewport.width + 1, `${name}: unexpected horizontal overflow`);
    await page.screenshot({ path: join(output, `${name}.png`), fullPage: false });
    await page.screenshot({ path: join(output, `${name}-full.png`), fullPage: true });
    const landingErrors = { consoleErrors: [...consoleErrors], pageErrors: [...pageErrors], requestErrors: [...requestErrors], httpErrors: [...httpErrors] };
    report.pages.push({ name, viewport, status: response.status(), dimensions, screenshot: `${name}.png`, ...landingErrors });
    assert.equal(pageErrors.length, 0, `${name}: uncaught page errors`);
    assert.equal(consoleErrors.length, 0, `${name}: browser console errors`);
    assert.equal(httpErrors.length, 0, `${name}: HTTP errors while opening the landing`);
    const health = await context.request.get(new URL('/api/v1/health', base).href);
    assert.equal(health.status(), 200, 'Health HTTP status');
    assert.deepEqual(await health.json(), { status: 'ok', service: 'logsofchange' });
    const configResponse = await context.request.get(new URL('/api/v1/config', base).href);
    assert.equal(configResponse.status(), 200, 'Runtime configuration HTTP status');
    const config = await configResponse.json();
    assert.equal(config.product, 'Logs of Change');
    assert.equal(config.environment, environment);
    assert.equal(new URL(config.auth.redirectUri).origin, base.origin);
    report.checks.health = 200; report.checks.runtimeConfig = 200;
    if (name === 'desktop') {
      const expectedLoginOrigin = new URL(config.auth.domain).origin;
      await Promise.all([page.waitForURL(url => url.origin === expectedLoginOrigin, { timeout: 30000 }), login.click()]);
      const authorization = new URL(page.url());
      assert.equal(authorization.origin, expectedLoginOrigin, 'Login redirects to configured Cognito origin');
      // Cognito can redirect /oauth2/authorize to /login; both preserve the PKCE parameters.
      assert.equal(authorization.searchParams.get('response_type'), 'code');
      assert.equal(authorization.searchParams.get('code_challenge_method'), 'S256');
      assert.ok(authorization.searchParams.get('code_challenge'), 'PKCE challenge must be present');
      assert.ok(authorization.searchParams.get('state'), 'OAuth state must be present');
      report.checks.login = { origin: authorization.origin, path: authorization.pathname, responseType: 'code', pkce: 'S256', statePresent: true };
      await page.screenshot({ path: join(output, 'cognito-login.png'), fullPage: false });
    }
    await context.close();
  }
  report.passed = true;
} catch (error) {
  report.passed = false; report.error = error.message;
  process.exitCode = 1;
} finally {
  await browser.close();
  await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
}
