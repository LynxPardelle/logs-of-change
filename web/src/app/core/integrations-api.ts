import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Session } from './session';

export interface ProjectCapabilities { plan: 'free' | 'plus'; integrations: boolean; publicPublishing: boolean; role: string }
export interface IntegrationKey { id: string; name: string; active: boolean; expiresAt: number; createdAt: string }
export type PublicField = 'title' | 'summary' | 'changes';
export interface Publication { releaseId: string; revision: number; slug: string; publicId: string; projectName: string; fields: PublicField[]; publishedAt: string; acceptedAt: string; active: boolean }
export interface PublicationsList { project: { slug: string; name: string } | null; publications: Publication[]; nextCursor?: string | null }
export interface PublishInput { revision: number; slug: string; projectName: string; fields: PublicField[] }

@Injectable({ providedIn: 'root' })
export class IntegrationsApi {
  private readonly http = inject(HttpClient);
  private readonly session = inject(Session);
  private readonly attempts = new Map<string, string>();

  capabilities(org: string, project: string): Promise<ProjectCapabilities> { return this.request('GET', `${this.identityPath(org, project)}/capabilities`); }
  keys(org: string, project: string): Promise<{ keys: IntegrationKey[] }> { return this.request('GET', `${this.identityPath(org, project)}/integration-keys`); }
  createKey(org: string, project: string, body: { name: string; expiresInDays: number }): Promise<{ key: IntegrationKey; token: string }> { return this.request('POST', `${this.identityPath(org, project)}/integration-keys`, body); }
  revokeKey(org: string, project: string, id: string): Promise<{ key: IntegrationKey }> { return this.request('DELETE', `${this.identityPath(org, project)}/integration-keys/${encodeURIComponent(id)}`); }
  publications(org: string, project: string, cursor?: string): Promise<PublicationsList> { return this.request('GET', this.publicationsPath(org, project) + (cursor ? `?cursor=${encodeURIComponent(cursor)}` : '')); }
  publish(org: string, project: string, id: string, body: PublishInput): Promise<{ publication: Publication }> { return this.request('POST', `${this.publicationsPath(org, project)}/${encodeURIComponent(id)}`, body); }
  unpublish(org: string, project: string, id: string): Promise<{ publication: Publication }> { return this.request('DELETE', `${this.publicationsPath(org, project)}/${encodeURIComponent(id)}`); }

  private identityPath(org: string, project: string) { return `/api/v1/identity/orgs/${encodeURIComponent(org)}/projects/${encodeURIComponent(project)}`; }
  private publicationsPath(org: string, project: string) { return `/api/v1/publications/orgs/${encodeURIComponent(org)}/projects/${encodeURIComponent(project)}/releases`; }
  private async request<T>(method: 'GET' | 'POST' | 'DELETE', url: string, body?: unknown): Promise<T> {
    const token = this.session.accessToken();
    if (!token) throw new Error('Tu sesión terminó. Inicia sesión de nuevo.');
    const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
    const fingerprint = `${method}:${url}:${JSON.stringify(body)}`;
    if (method !== 'GET') {
      const key = this.attempts.get(fingerprint) ?? crypto.randomUUID();
      this.attempts.set(fingerprint, key); headers['Idempotency-Key'] = key;
    }
    try {
      const value = await firstValueFrom(this.http.request<T>(method, url, { body, headers, timeout: 15000, cache: 'no-store', transferCache: false }));
      this.attempts.delete(fingerprint);
      return value;
    } catch (error) {
      if (error instanceof HttpErrorResponse) {
        if (error.status >= 400 && error.status < 500) this.attempts.delete(fingerprint);
        if (error.error?.error?.code === 'KEY_ALREADY_CREATED') throw new Error('La clave ya se creó y no podemos volver a mostrar su secreto. Revisa la lista y revócala antes de generar otra.');
        const messages: Record<number, string> = {
          401: 'Tu sesión terminó. Inicia sesión de nuevo.',
          402: 'Esta capacidad necesita un plan Plus activo. Contacta a la persona administradora de la plataforma.',
          403: 'No tienes permiso vigente o el plan no permite esta operación.',
          404: 'No encontramos el recurso de este proyecto.',
          409: 'El recurso cambió o ese enlace público ya está reservado. Actualiza y revisa la operación.',
          423: 'Las escrituras del proyecto están congeladas.',
        };
        throw new Error(messages[error.status] ?? (error.status === 0 || error.status >= 500
          ? 'No pudimos confirmar la operación. Actualiza la lista antes de reintentar con los mismos datos.'
          : 'Revisa los datos y vuelve a intentar.'));
      }
      throw error;
    }
  }
}
