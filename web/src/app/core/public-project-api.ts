import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, REQUEST, REQUEST_CONTEXT, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export interface PublicRelease { id: string; revision: number; title: string; summary?: string; changes?: string[]; acceptedAt: string; publishedAt: string }
export interface PublicProject { project: { slug: string; name: string }; releases: PublicRelease[]; nextCursor?: string | null }
const origins = new Set(['https://dev.logsofchange.lynxpardelle.com', 'https://test.logsofchange.lynxpardelle.com', 'https://logsofchange.lynxpardelle.com']);

export function publicProjectPath(slug: string, cursor?: string, requestUrl?: string): string {
  if (!/^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/.test(slug)) throw new Error('El enlace del proyecto no es válido.');
  if (cursor && cursor.length > 2000) throw new Error('La página solicitada no es válida.');
  const path = `/api/v1/public/projects/${encodeURIComponent(slug)}?limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
  if (!requestUrl) return path;
  const request = new URL(requestUrl);
  if (!origins.has(request.origin) || request.username || request.password) throw new Error('El origen del dashboard no corresponde a este servicio.');
  return request.origin + path;
}

export class PublicProjectError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

@Injectable({ providedIn: 'root' })
export class PublicProjectApi {
  private readonly http = inject(HttpClient);
  private readonly request = inject(REQUEST, { optional: true });
  private readonly context = inject(REQUEST_CONTEXT, { optional: true }) as { publicOrigin?: string } | null;

  async load(slug: string, cursor?: string): Promise<PublicProject> {
    try {
      const serverUrl = this.request ? this.context?.publicOrigin || this.request.url : undefined;
      return await firstValueFrom(this.http.get<PublicProject>(publicProjectPath(slug, cursor, serverUrl), { timeout: 15000, credentials: 'omit', cache: 'no-store', redirect: 'error', transferCache: true }));
    } catch (error) {
      if (error instanceof HttpErrorResponse) throw new PublicProjectError(error.status, error.status === 404
        ? 'Este proyecto no tiene publicaciones disponibles.'
        : 'No pudimos cargar las publicaciones. Vuelve a intentar.');
      throw error;
    }
  }
}
