import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { inject, PLATFORM_ID } from '@angular/core';
import { patchState, signalStore, withHooks, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, catchError, pipe, switchMap, tap } from 'rxjs';

type HealthState = {
  status: 'checking' | 'connected' | 'unavailable';
};

const initialState: HealthState = { status: 'checking' };

export const ApiHealthStore = signalStore(
  withState(initialState),
  withMethods((store, http = inject(HttpClient)) => ({
    check: rxMethod<void>(
      pipe(
        tap(() => patchState(store, { status: 'checking' })),
        switchMap(() =>
          http.get<unknown>('/api/v1/health', { timeout: 5000 }).pipe(
            tap((response) =>
              patchState(store, {
                status: isProductHealth(response) ? 'connected' : 'unavailable',
              }),
            ),
            catchError(() => {
              patchState(store, { status: 'unavailable' });
              return EMPTY;
            }),
          ),
        ),
      ),
    ),
  })),
  withHooks({ onInit: (store) => { if (isPlatformBrowser(inject(PLATFORM_ID))) store.check(); } }),
);

function isProductHealth(response: unknown): boolean {
  return (
    typeof response === 'object' &&
    response !== null &&
    'status' in response &&
    response.status === 'ok' &&
    'service' in response &&
    response.service === 'logsofchange'
  );
}
