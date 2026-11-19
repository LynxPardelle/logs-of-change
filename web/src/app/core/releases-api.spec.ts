import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ReleasesApi } from './releases-api';
import { Session } from './session';

describe('ReleasesApi', () => {
  let http: HttpTestingController;
  let api: ReleasesApi;
  const body = { title: 'Portal', summary: 'Entrega del portal', changes: ['Página de inicio'] };
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), { provide: Session, useValue: { accessToken: () => 'test-token' } }] });
    http = TestBed.inject(HttpTestingController);
    api = TestBed.inject(ReleasesApi);
  });
  afterEach(() => http.verify());

  it('scopes the list to its project and sends its access token', async () => {
    const result = api.list('agencia', 'portal');
    const request = http.expectOne('/api/v1/orgs/agencia/projects/portal/releases');
    expect(request.request.headers.get('Authorization')).toBe('Bearer test-token');
    request.flush({ releases: [], nextCursor: 'next-page' });
    expect(await result).toEqual({ releases: [], nextCursor: 'next-page' });
  });

  it('keeps the idempotency key when a transport failure is retried', async () => {
    const first = api.create('agencia', 'portal', body).catch(() => null);
    const request = http.expectOne('/api/v1/orgs/agencia/projects/portal/releases');
    const key = request.request.headers.get('Idempotency-Key');
    expect(key).toBeTruthy();
    request.error(new ProgressEvent('network'));
    await first;
    const retry = api.create('agencia', 'portal', body);
    const repeated = http.expectOne('/api/v1/orgs/agencia/projects/portal/releases');
    expect(repeated.request.headers.get('Idempotency-Key')).toBe(key);
    repeated.flush({ release: { id: 'r1' } });
    expect((await retry).release.id).toBe('r1');
  });

  it('explains a stale revision conflict', async () => {
    const result = api.create('agencia', 'portal', body).catch((error: Error) => error.message);
    http.expectOne('/api/v1/orgs/agencia/projects/portal/releases').flush({ error: { code: 'CONFLICT', message: 'stale' } }, { status: 409, statusText: 'Conflict' });
    expect(await result).toContain('actualizó');
  });
});
