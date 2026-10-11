import type { Routes } from '@angular/router';
import { docPageRoutes } from 'docs-kit/site';
import { Home } from './home/home';
import { SITE } from './site';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: Home,
    title: 'ngu-dropdown: an Angular select that pages through your server',
  },
  {
    path: '',
    loadComponent: () => import('docs-kit/docs/docs-layout').then((m) => m.DocsLayout),
    children: docPageRoutes(SITE),
  },
  { path: '**', redirectTo: '' },
];
