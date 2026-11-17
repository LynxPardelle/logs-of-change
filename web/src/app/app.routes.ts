import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Logs of Change',
    loadComponent: () => import('./features/health/health-page').then((module) => module.HealthPage),
  },
  { path: '**', redirectTo: '' },
];
