import type { Routes } from '@angular/router';

// The docs site's complete examples and its field gallery, rendered on the server.

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: 'login', loadComponent: () => import('../../../demo/src/app/examples/login/login').then((m) => m.LoginForm) },
  { path: 'signup', loadComponent: () => import('../../../demo/src/app/examples/signup/signup').then((m) => m.SignupForm) },
  { path: 'profile', loadComponent: () => import('../../../demo/src/app/examples/profile/profile').then((m) => m.ProfileForm) },
  { path: 'settings', loadComponent: () => import('../../../demo/src/app/examples/settings/settings').then((m) => m.SettingsForm) },
  { path: 'languages', loadComponent: () => import('../../../demo/src/app/examples/languages/languages').then((m) => m.LanguagesForm) },
  { path: 'checkout', loadComponent: () => import('../../../demo/src/app/examples/checkout/checkout').then((m) => m.CheckoutForm) },
  { path: 'team', loadComponent: () => import('../../../demo/src/app/examples/team/team').then((m) => m.TeamPage) },
  { path: 'survey', loadComponent: () => import('../../../demo/src/app/examples/survey/survey').then((m) => m.SurveyForm) },
  {
    path: 'field-types',
    loadComponent: () => import('../../../demo/src/app/examples/field-types/field-types').then((m) => m.FieldTypesForm),
  },
  { path: 'gallery', loadComponent: () => import('../../../demo/src/app/pages/gallery/gallery').then((m) => m.Gallery) },
];

/** Every page, for the links and for e2e/ssr.spec.ts. */
export const PAGES = routes.flatMap((r) => (r.loadComponent ? [r.path!] : []));
