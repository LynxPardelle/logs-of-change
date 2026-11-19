import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { IntegrationsApi } from './integrations-api';
import { Session } from './session';

describe('IntegrationsApi', () => {
  let api: IntegrationsApi;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), { provide: Session, useValue: { accessToken: () => 'person-token' } }] });
    api = TestBed.inject(IntegrationsApi); http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('keeps a key creation retry bound to the same attempt after a lost response', async () => {
    const body = { name: 'CI externo', expiresInDays: 30 };
    const first = api.createKey('org', 'project', body).catch(() => null);
    const request = http.expectOne('/api/v1/identity/orgs/org/projects/project/integration-keys');
    const key = request.request.headers.get('Idempotency-Key');
    expect(request.request.headers.get('Authorization')).toBe('Bearer person-token');
    expect(request.request.transferCache).toBe(false);
    expect(key).toBeTruthy();
    request.error(new ProgressEvent('network'));
    await first;
    const retry = api.createKey('org', 'project', body).catch((error: Error) => error.message);
    const repeated = http.expectOne('/api/v1/identity/orgs/org/projects/project/integration-keys');
    expect(repeated.request.headers.get('Idempotency-Key')).toBe(key);
    repeated.flush({ error: { code: 'KEY_ALREADY_CREATED' } }, { status: 409, statusText: 'Conflict' });
    expect(await retry).toContain('revócala');
  });

  it('publishes only the selected public fields and exact accepted revision', async () => {
    const body = { revision: 2, slug: 'portal-cliente', projectName: 'Portal público', fields: ['title', 'changes'] as ('title' | 'changes')[] };
    const result = api.publish('org', 'project', 'delivery', body);
    const request = http.expectOne('/api/v1/publications/orgs/org/projects/project/releases/delivery');
    expect(request.request.body).toEqual(body);
    expect(request.request.headers.has('Idempotency-Key')).toBe(true);
    request.flush({ publication: { releaseId: 'delivery', revision: 2, slug: 'portal-cliente', publicId: 'public-id', active: true } });
    expect((await result).publication.revision).toBe(2);
  });
});
