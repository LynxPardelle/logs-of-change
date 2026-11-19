import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Logs of Change · Entregas con evidencia',
    loadComponent: () => import('./features/releases/workspace-page').then((module) => module.WorkspacePage),
  },
  { path: 'auth/callback', title: 'Logs of Change · Abriendo tu espacio', loadComponent: () => import('./features/releases/workspace-page').then((module) => module.WorkspacePage) },
  { path: '**', redirectTo: '' },
];
