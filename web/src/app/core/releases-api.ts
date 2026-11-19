import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Session } from './session';
import { firstValueFrom } from 'rxjs';
import type { Release, ReleaseDetail, ReleaseInput } from './product-api';

@Injectable({ providedIn: 'root' })
export class ReleasesApi {
  private readonly http = inject(HttpClient);
  private readonly session = inject(Session);
  private readonly attempts = new Map<string, string>();

  list(org: string, project: string, cursor?: string): Promise<{ releases: Release[]; nextCursor?: string }> {
    const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
    return this.request('GET', this.path(org, project) + query);
  }
  detail(org: string, project: string, id: string): Promise<ReleaseDetail> {
    return this.request('GET', `${this.path(org, project)}/${encodeURIComponent(id)}`);
  }
  create(org: string, project: string, body: ReleaseInput): Promise<{ release: Release }> {
    return this.request('POST', this.path(org, project), body);
  }
  revise(org: string, project: string, id: string, body: ReleaseInput & { expectedRevision: number }): Promise<{ release: Release }> {
    return this.request('POST', `${this.path(org, project)}/${encodeURIComponent(id)}/revisions`, body);
  }
  submit(org: string, project: string, id: string, expectedRevision: number): Promise<{ release: Release }> {
    return this.request('POST', `${this.path(org, project)}/${encodeURIComponent(id)}/submit`, { expectedRevision });
  }
  decide(org: string, project: string, id: string, expectedRevision: number, outcome: 'accepted' | 'changes_requested', reason: string): Promise<{ release: Release }> {
    return this.request('POST', `${this.path(org, project)}/${encodeURIComponent(id)}/decisions`, { expectedRevision, outcome, reason });
  }
  acta(org: string, project: string, id: string, revision: number): Promise<unknown> {
    return this.request('GET', `/api/v1/evidence/orgs/${encodeURIComponent(org)}/projects/${encodeURIComponent(project)}/releases/${encodeURIComponent(id)}/revisions/${revision}/acta`);
  }
  private path(org: string, project: string): string {
    return `/api/v1/orgs/${encodeURIComponent(org)}/projects/${encodeURIComponent(project)}/releases`;
  }
  private async request<T>(method: string, url: string, body?: unknown): Promise<T> {
    const token = this.session.accessToken();
    if (!token) throw new Error('Tu sesión terminó. Inicia sesión de nuevo para continuar.');
    const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
    const fingerprint = `${url}:${JSON.stringify(body)}`;
    if (method === 'POST') {
      const key = this.attempts.get(fingerprint) ?? crypto.randomUUID();
      this.attempts.set(fingerprint, key);
      headers['Idempotency-Key'] = key;
    }
    try {
      const value = await firstValueFrom(this.http.request<T>(method, url, { body, headers, timeout: 15000 }));
      this.attempts.delete(fingerprint);
      return value;
    } catch (error) {
      if (error instanceof HttpErrorResponse) {
        if (error.status >= 400 && error.status < 500) this.attempts.delete(fingerprint);
        const messages: Record<number, string> = {
          401: 'Tu sesión terminó. Inicia sesión de nuevo para continuar.',
          403: 'No tienes permiso para esta operación en el proyecto.',
          404: 'No encontramos esta entrega o revisión.',
          409: 'La entrega se actualizó o esta operación ya tiene otra versión. Actualiza la lista antes de continuar.',
        };
        throw new Error(messages[error.status] ?? (error.status === 0 || error.status >= 500
          ? 'No pudimos confirmar la operación. Puedes reintentar con los mismos datos.'
          : error.error?.error?.message ?? 'Revisa los datos y vuelve a intentar.'));
      }
      throw error;
    }
  }
}
