import type { Routes } from '@angular/router';
import { docPageRoutes } from 'docs-kit/site';
import { EXAMPLES } from './pages/example/examples';
import { leaveExampleGuard } from './pages/example/leave-guard';
import { Home } from './pages/home/home';
import { SITE } from './site';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: Home,
    title: 'ngu-form: Angular forms defined in TypeScript',
  },
  // Addresses from before the docs were split into pages.
  { path: 'get-started', redirectTo: 'installation' },
  { path: 'guide', redirectTo: 'defining-forms' },
  {
    path: '',
    loadComponent: () => import('docs-kit/docs/docs-layout').then((m) => m.DocsLayout),
    children: [
      { path: 'examples', pathMatch: 'full', redirectTo: `examples/${EXAMPLES[0].id}` },
      ...EXAMPLES.map((e) => ({
        path: `examples/${e.id}`,
        loadComponent: () => import('./pages/example/example-page').then((m) => m.ExamplePage),
        data: { id: e.id },
        title: `${e.title} example | ngu-form`,
        // The signup example shows the unsaved-changes guard.
        canDeactivate: e.id === 'signup' ? [leaveExampleGuard] : [],
      })),
      ...docPageRoutes(SITE),
    ],
  },
  { path: '**', redirectTo: '' },
];
