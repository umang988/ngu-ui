import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import type { DocSection } from 'docs-kit/docs/model';
import { App } from './app';
import { routes } from './app.routes';
import { NAV_ENTRIES } from './nav';
import { VERSION } from './version';

describe('ngu-table site', () => {
  beforeEach(async () => {
    // jsdom has no `Element.scrollTo`, which the docs pages call.
    Element.prototype.scrollTo ??= () => {};
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
    const { el, fixture } = await open('/');
    expect(el.querySelector('.wordmark__name')?.textContent?.trim()).toBe('ngu-table');
    expect(el.querySelector('.wordmark__version')?.textContent?.trim()).toBe(`v${VERSION}`);
    fixture.destroy();
  });

  it('renders the home page with a live table', async () => {
    const { el, fixture } = await open('/');
    expect(el.querySelector('h1')?.textContent).toContain('One fetchFn.');
    expect(el.querySelector('.sheet ngu-table')).toBeTruthy();
    fixture.destroy();
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
          !!el.querySelector('.doc h1') && el.querySelectorAll('.demo ngu-table').length >= demos,
      );
      expect(el.querySelector('.doc h1')?.textContent?.trim(), entry.path).toBe(page.title);
      expect(el.querySelector('.sidebar a.is-active')?.textContent?.trim(), entry.path).toBe(
        entry.title,
      );
      expect(el.querySelectorAll('.demo').length, `${entry.path} demos`).toBe(demos);
      expect(el.querySelectorAll('.demo ngu-table').length, entry.path).toBe(demos);
      fixture.destroy();
    }
  }, 120_000);

  it('marks the API header link on API pages and Docs elsewhere', async () => {
    const current = (el: HTMLElement) =>
      el.querySelector('.nav a[aria-current]')?.textContent?.trim() ?? null;
    for (const [url, expected] of [
      ['/api/types', 'API'],
      ['/columns', 'Docs'],
      ['/', null],
    ] as const) {
      const { el, fixture } = await open(url);
      expect(current(el), url).toBe(expected);
      fixture.destroy();
    }
  });
});
