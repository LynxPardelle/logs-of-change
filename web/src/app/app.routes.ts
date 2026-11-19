import { Routes } from '@angular/router';
import { resolvePublicProject } from './core/public-project-resolver';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Logs of Change · Entregas con evidencia',
    loadComponent: () => import('./features/releases/workspace-page').then((module) => module.WorkspacePage),
  },
  { path: 'auth/callback', title: 'Logs of Change · Abriendo tu espacio', loadComponent: () => import('./features/releases/workspace-page').then((module) => module.WorkspacePage) },
  { path: 'integrations', title: 'Logs of Change · Integraciones y publicaciones', loadComponent: () => import('./features/integrations/integrations-page').then(module => module.IntegrationsPage) },
  { path: 'p/:slug', title: 'Logs of Change · Historial público', resolve: { publicProject: resolvePublicProject }, loadComponent: () => import('./features/public-project/public-project-page').then(module => module.PublicProjectPage) },
  { path: '**', redirectTo: '' },
];
