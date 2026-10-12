import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';
import type { DocSection } from 'docs-kit/docs/model';
import { NAV_ENTRIES } from './docs/nav';
import { EXAMPLES } from './pages/example/examples';
import { VERSION } from './version';

describe('App', () => {
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

  it('shows the library version from its package.json', async () => {
    const { el } = await open('/');
    expect(el.querySelector('.wordmark__version')?.textContent?.trim()).toBe(`v${VERSION}`);
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('renders the home page with the live demo and the use cases', async () => {
    const { el } = await open('/');
    expect(el.querySelector('h1')?.textContent).toContain('Describe the model.');
    expect(el.querySelector('.sheet ngu-form')).toBeTruthy();
    // One card per example, plus the settings-page card.
    expect(el.querySelectorAll('.use').length).toBe(EXAMPLES.length + 1);
  });

  it('renders every example inside the docs layout', async () => {
    // The main button: submit, or Next on the first step of a wizard.
    for (const [id, action] of [
      ['login', 'Sign in'],
      ['signup', 'Create account'],
      ['checkout', 'Next'],
      ['survey', 'Send answers'],
      ['field-types', 'Send'],
    ]) {
      const { el, fixture } = await open(`/examples/${id}`);
      const main = () => el.querySelector('.preview .ngu-actions button:last-child');
      await until(fixture, () => !!main());
      expect(el.querySelector('.sidebar a.is-active')?.textContent?.trim()).toBe(
        EXAMPLES.find((e) => e.id === id)!.title,
      );
      expect(main()?.textContent?.trim()).toBe(action);
    }
  });

  it('renders every documentation page with its title and live demos', async () => {
    // A demo shows a form, a form's values in view mode, or fields of a hand-written form.
    const shown = (el: HTMLElement) =>
      Array.from(el.querySelectorAll('.demo')).filter((d) => d.querySelector('ngu-form, ngu-view, ngu-field')).length;
    const count = (sections: readonly DocSection[]): number =>
      sections.reduce((n, s) => n + (s.demo ? 1 : 0) + count(s.children ?? []), 0);
    for (const entry of NAV_ENTRIES.filter((e) => e.load)) {
      const page = (await entry.load!())!;
      const demos = count(page.sections);
      const { el, fixture } = await open(`/${entry.path}`);
      await until(
        fixture,
        () =>
          !!el.querySelector('.doc h1') && shown(el) === demos,
      );
      expect(el.querySelector('.doc h1')?.textContent?.trim(), entry.path).toBe(page.title);
      expect(
        el.querySelectorAll('.doc-section > .doc-section__head').length,
        entry.path,
      ).toBeGreaterThan(0);
      expect(shown(el), `${entry.path} demos`).toBe(demos);
    }
  }, 120_000);

  it('redirects the old guide addresses', async () => {
    const router = TestBed.inject(Router);
    await open('/get-started');
    expect(router.url).toBe('/installation');
    await open('/guide');
    expect(router.url).toBe('/defining-forms');
  });
});
