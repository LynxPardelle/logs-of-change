import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { REQUEST, REQUEST_CONTEXT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PublicProjectApi, publicProjectPath } from './public-project-api';

describe('PublicProjectApi', () => {
  it('uses only canonical HTTPS origins for SSR and rejects host-driven requests elsewhere', () => {
    expect(publicProjectPath('portal', undefined, 'https://logsofchange.lynxpardelle.com/p/portal')).toBe('https://logsofchange.lynxpardelle.com/api/v1/public/projects/portal?limit=20');
    expect(publicProjectPath('portal')).toBe('/api/v1/public/projects/portal?limit=20');
    for (const value of ['https://attacker.example/p/portal', 'http://logsofchange.lynxpardelle.com/p/portal', 'https://logsofchange.lynxpardelle.com:444/p/portal', 'https://user:pass@logsofchange.lynxpardelle.com/p/portal']) {
      expect(() => publicProjectPath('portal', undefined, value)).toThrow();
    }
    expect(() => publicProjectPath('../identity/me')).toThrow();
  });

  it('never attaches a private identity to anonymous dashboard requests', async () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), { provide: REQUEST, useValue: null }] });
    const api = TestBed.inject(PublicProjectApi); const http = TestBed.inject(HttpTestingController);
    const result = api.load('portal');
    const request = http.expectOne('/api/v1/public/projects/portal?limit=20');
    expect(request.request.headers.has('Authorization')).toBe(false);
    expect(request.request.credentials).toBe('omit');
    request.flush({ project: { slug: 'portal', name: 'Portal' }, releases: [], nextCursor: null });
    expect((await result).project.name).toBe('Portal');
    http.verify();
  });

  it('uses trusted canonical server context when Lambda receives its own origin', async () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(),
      { provide: REQUEST, useValue: new Request('https://example.lambda-url.us-east-1.on.aws/p/portal') },
      { provide: REQUEST_CONTEXT, useValue: { publicOrigin: 'https://test.logsofchange.lynxpardelle.com' } },
    ] });
    const api = TestBed.inject(PublicProjectApi); const http = TestBed.inject(HttpTestingController);
    const result = api.load('portal');
    const request = http.expectOne('https://test.logsofchange.lynxpardelle.com/api/v1/public/projects/portal?limit=20');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({ project: { slug: 'portal', name: 'Portal' }, releases: [], nextCursor: null });
    await result; http.verify();
  });
});
