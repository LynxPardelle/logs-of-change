import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { signal } from '@angular/core';

import { App } from './app';
import { routes } from './app.routes';
import { Session } from './core/session';

describe('App', () => {
  it('renders the product status on the default route', async () => {
    TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting(), { provide: Session, useValue: {
        authenticated: signal(false), ready: signal(true), config: signal(null), identity: signal(null), error: signal(''), initialize: async () => {},
      } }],
    });
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await TestBed.inject(Router).navigateByUrl('/');
    fixture.detectChanges();

    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/v1/health').flush({ service: 'logsofchange', status: 'ok' });
    fixture.detectChanges();

    const page = fixture.nativeElement as HTMLElement;
    expect(page.querySelector('.brand')?.textContent).toContain('Logs of Change');
    expect(page.querySelector('h1')?.textContent).toContain('Cierra el hito');
    expect(page.querySelector('[role="status"]')?.textContent).toContain('API disponible');
    http.verify();
  });
});
