import { inject, InjectionToken, type Provider } from '@angular/core';
import type { Routes } from '@angular/router';
import type { DocPage } from './docs/model';

export interface NavItem {
  readonly title: string;
  /** Route path, without the leading slash. */
  readonly path: string;
  /** Loads the page; pages with their own component (examples) have no loader. */
  readonly load?: () => Promise<DocPage>;
}

export interface NavGroup {
  readonly title: string;
  readonly items: readonly NavItem[];
}

export interface NavEntry extends NavItem {
  readonly group: string;
}

export interface SiteLink {
  readonly label: string;
  readonly path: string;
  /** The link is current on paths that start with this. */
  readonly match?: string;
}

/** What makes one library's site: its name, version, menu and links. */
export interface DocsSite {
  /** The package name, shown as the wordmark and in page titles. */
  readonly name: string;
  readonly version: string;
  /** The sidebar, in reading order. Previous and next links follow it too. */
  readonly nav: readonly NavGroup[];
  /** Header links. One without `match` is current on every other page but home. */
  readonly links: readonly SiteLink[];
  readonly footer: { readonly text: string; readonly links: readonly SiteLink[] };
  /** The repository folder `/source` files are copied from, named when one fails to load. */
  readonly sourceDir: string;
}

export const DOCS_SITE = new InjectionToken<DocsSite>('DOCS_SITE');

/** Provide on the root component, so every page under the router outlet sees it. */
export function provideDocsSite(site: DocsSite): Provider {
  return { provide: DOCS_SITE, useValue: site };
}

export function injectDocsSite(): DocsSite {
  return inject(DOCS_SITE);
}

/** Every page in sidebar order. */
export function navEntries(nav: readonly NavGroup[]): readonly NavEntry[] {
  return nav.flatMap((g) => g.items.map((i) => ({ ...i, group: g.title })));
}

/** One route per page that has a loader, titled "Page | name". */
export function docPageRoutes(site: Pick<DocsSite, 'name' | 'nav'>): Routes {
  return navEntries(site.nav)
    .filter((e) => e.load)
    .map((e) => ({
      path: e.path,
      loadComponent: () => import('./docs/doc-page').then((m) => m.DocPage),
      data: { path: e.path },
      title: `${e.title} | ${site.name}`,
    }));
}
