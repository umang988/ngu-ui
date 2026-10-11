import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import type { DocSection } from 'docs-kit/docs/model';
import { App } from './app';
import { routes } from './app.routes';
import { NAV_ENTRIES } from './nav';
import { VERSION } from './version';

describe('ngu-dropdown site', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes)],
    }).compileComponents();
  });

  async function open(url: string) {
    const fixture = TestBed.createComponent(App);
    await TestBed.inject(Router).navigateByUrl(url);
    await fixture.whenStable();
    return { el: fixture.nativeElement as HTMLElement, fixture };
  }

  /** Waits until `ready` holds, for content that arrives after lazy loads. */
  async function until(fixture: { whenStable(): Promise<unknown> }, ready: () => boolean) {
    for (let i = 0; i < 50 && !ready(); i++) {
      await new Promise((done) => setTimeout(done, 10));
      await fixture.whenStable();
    }
  }

  it('shows its own name and version from its package.json', async () => {
    const { el } = await open('/');
    expect(el.querySelector('.wordmark__name')?.textContent?.trim()).toBe('ngu-dropdown');
    expect(el.querySelector('.wordmark__version')?.textContent?.trim()).toBe(`v${VERSION}`);
  });

  it('renders the home page with a live dropdown', async () => {
    const { el } = await open('/');
    expect(el.querySelector('h1')?.textContent).toContain('Fifty thousand rows.');
    expect(el.querySelector('.sheet ngu-dropdown')).toBeTruthy();
    expect(el.querySelector('.log__empty')).toBeTruthy();
  });

  it('renders every documentation page with its title and live demos', async () => {
    const count = (sections: readonly DocSection[]): number =>
      sections.reduce((n, s) => n + (s.demo ? 1 : 0) + count(s.children ?? []), 0);
    for (const entry of NAV_ENTRIES) {
      const page = (await entry.load!())!;
      const demos = count(page.sections);
      const { el, fixture } = await open(`/${entry.path}`);
      await until(
        fixture,
        () =>
          !!el.querySelector('.doc h1') &&
          el.querySelectorAll('.demo ngu-dropdown').length >= demos,
      );
      expect(el.querySelector('.doc h1')?.textContent?.trim(), entry.path).toBe(page.title);
      expect(el.querySelector('.sidebar a.is-active')?.textContent?.trim(), entry.path).toBe(
        entry.title,
      );
      const demoCards = el.querySelectorAll('.demo').length;
      expect(demoCards, `${entry.path} demos`).toBe(demos);
      if (demos) {
        expect(el.querySelectorAll('.demo ngu-dropdown').length, entry.path).toBeGreaterThanOrEqual(
          demos,
        );
      }
    }
  }, 120_000);

  it('marks the API header link on API pages and Docs elsewhere', async () => {
    const current = (el: HTMLElement) =>
      el.querySelector('.nav a[aria-current]')?.textContent?.trim() ?? null;
    expect(current((await open('/api/types')).el)).toBe('API');
    expect(current((await open('/forms')).el)).toBe('Docs');
    expect(current((await open('/')).el)).toBeNull();
  });
});
