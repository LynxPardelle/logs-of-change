import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { IntegrationsPage } from './integrations-page';
import { IntegrationsApi } from '../../core/integrations-api';
import { ReleasesApi } from '../../core/releases-api';
import { Session } from '../../core/session';

describe('IntegrationsPage', () => {
  const identity = signal({ sub: 'person', memberships: [{ orgId: 'org', orgName: 'Agency', projects: [{ projectId: 'one', name: 'Portal', role: 'administrator' }, { projectId: 'two', name: 'Otro', role: 'administrator' }] }] });
  const api = {
    capabilities: vi.fn(async () => ({ plan: 'plus', integrations: true, publicPublishing: true, role: 'administrator' })),
    keys: vi.fn(async () => ({ keys: [] })), publications: vi.fn(async () => ({ project: null, publications: [] })),
    createKey: vi.fn(async () => ({ key: { id: 'key-id', name: 'CI', active: true, expiresAt: 9999999999, createdAt: '2026-11-19' }, token: 'one-time-secret' })),
    publish: vi.fn(async () => ({ publication: { active: true } })),
  };
  const release = { id: 'delivery', status: 'accepted', revision: 2, title: 'Entrega', summary: 'Private summary', changes: ['Private change'] };
  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({ providers: [provideRouter([]),
      { provide: Session, useValue: { initialize: async () => {}, identity, authenticated: () => true, ready: () => true, error: () => '', logout: async () => {}, login: async () => {} } },
      { provide: IntegrationsApi, useValue: api },
      { provide: ReleasesApi, useValue: { list: async () => ({ releases: [release] }), detail: async () => ({ release, revisions: [{ number: 2, manifest: release }], decisions: [{ revision: 2, outcome: 'accepted' }] }) } },
    ] });
  });

  it('clears the one-time secret when changing projects and destroying the console', async () => {
    const fixture = TestBed.createComponent(IntegrationsPage); const page = fixture.componentInstance;
    fixture.detectChanges(); await fixture.whenStable();
    await page.selectProject('org/one');
    page.keyName.set('CI');
    await page.createKey(new Event('submit'));
    expect(page.secret()).toBe('one-time-secret');
    await page.selectProject('org/two');
    expect(page.secret()).toBe('');
    page.secret.set('temporary'); fixture.destroy();
    expect(page.secret()).toBe('');
  });

  it('requires an explicit publication and sends only the chosen fields', async () => {
    const fixture = TestBed.createComponent(IntegrationsPage); const page = fixture.componentInstance;
    fixture.detectChanges(); await fixture.whenStable();
    await page.selectProject('org/one'); await page.selectRelease('delivery');
    page.slug.set('portal-publico'); page.publicName.set('Portal público');
    expect(api.publish).not.toHaveBeenCalled();
    await page.publish(new Event('submit'));
    expect(api.publish).toHaveBeenCalledWith('org', 'one', 'delivery', { revision: 2, slug: 'portal-publico', projectName: 'Portal público', fields: ['title'] });
  });
});
