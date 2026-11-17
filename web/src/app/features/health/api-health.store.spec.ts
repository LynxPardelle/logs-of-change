import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ApiHealthStore } from './api-health.store';

describe('ApiHealthStore', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ApiHealthStore, provideHttpClient(), provideHttpClientTesting()],
    });
  });

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('checks the product API when the page opens', () => {
    const store = TestBed.inject(ApiHealthStore);
    const http = TestBed.inject(HttpTestingController);

    expect(store.status()).toBe('checking');
    http.expectOne({ method: 'GET', url: '/api/v1/health' }).flush({
      status: 'ok',
      service: 'logs-of-change',
    });
    expect(store.status()).toBe('connected');
  });

  it('recovers when a failed request is retried', () => {
    const store = TestBed.inject(ApiHealthStore);
    const http = TestBed.inject(HttpTestingController);

    http.expectOne('/api/v1/health').flush(null, { status: 502, statusText: 'Bad Gateway' });
    expect(store.status()).toBe('unavailable');

    store.check();
    expect(store.status()).toBe('checking');
    http.expectOne('/api/v1/health').flush({ status: 'ok', service: 'logs-of-change' });
    expect(store.status()).toBe('connected');
  });

  it('rejects a successful response from a different service', () => {
    const store = TestBed.inject(ApiHealthStore);
    const http = TestBed.inject(HttpTestingController);

    http.expectOne('/api/v1/health').flush({ status: 'ok', service: 'other-service' });
    expect(store.status()).toBe('unavailable');
  });
});
