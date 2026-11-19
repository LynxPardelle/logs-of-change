import { RESPONSE_INIT, inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { PublicProject, PublicProjectApi, PublicProjectError } from './public-project-api';

export interface PublicProjectResolution { data: PublicProject | null; error: string }

// Resolve before route activation so SSR and hydration start with the same public
// projection. Angular's request-scoped transfer state contains only this public DTO.
export const resolvePublicProject: ResolveFn<PublicProjectResolution> = async route => {
  const api = inject(PublicProjectApi); const response = inject(RESPONSE_INIT, { optional: true });
  try { return { data: await api.load(route.paramMap.get('slug') ?? ''), error: '' }; }
  catch (error) {
    if (response) response.status = error instanceof PublicProjectError && error.status === 404 ? 404 : 503;
    return { data: null, error: error instanceof PublicProjectError ? error.message : 'No pudimos cargar este proyecto público.' };
  }
};
