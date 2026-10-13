import { NgComponentOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, resource, signal, viewChild, type Type } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { injectDocsSite } from 'docs-kit/site';
import { CodeTabs } from 'docs-kit/ui/code-tabs';
import { RichText } from 'docs-kit/ui/rich-text';
import { angularProject, fetchSources, openStackBlitz } from 'docs-kit/ui/stackblitz';
import { EXAMPLES, exampleById, isLazy } from './examples';

/** One example: what it is for, a live preview and the source that runs it. */
@Component({
  selector: 'app-example-page',
  imports: [NgComponentOutlet, RouterLink, CodeTabs, RichText],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let ex = example();
    <div class="example">
      <nav class="crumbs" aria-label="Breadcrumb">
        <ol>
          <li>Examples</li>
          <li><span aria-current="page">{{ ex.title }}</span></li>
        </ol>
      </nav>

      <header class="intro">
        <h1>{{ ex.title }}</h1>
        <p class="lead">{{ ex.useCase }}</p>
      </header>

      <section class="shows" aria-labelledby="shows-title">
        <h2 id="shows-title">What it shows</h2>
        <ul>
          @for (item of ex.shows; track item) {
            <li><app-rich [text]="item" /></li>
          }
        </ul>
      </section>

      <div class="workbench">
        <section class="workbench__preview" aria-labelledby="preview-title">
          <h2 id="preview-title">Preview</h2>
          <div class="preview">
            @if (component(); as c) {
              <ng-container *ngComponentOutlet="c" />
            } @else {
              <p class="preview__loading" role="status">Loading the example…</p>
            }
          </div>
        </section>
        <aside class="workbench__try" aria-labelledby="try-title">
          <h2 id="try-title">Try this</h2>
          <ul>
            @for (item of ex.tryThis; track item) {
              <li><app-rich [text]="item" /></li>
            }
          </ul>
        </aside>
      </div>

      <section class="source" aria-labelledby="code-title">
        <h2 id="code-title">Code</h2>
        <p class="source__note">The files below are the ones running in the preview.</p>
        <p class="source__open">
          <button type="button" class="button button--quiet" (click)="openOnStackBlitz()">Open in StackBlitz</button>
          <span role="status">{{ openError() }}</span>
        </p>
        <app-code-tabs [files]="ex.files" label="Source files" maxHeight="40rem" />
      </section>

      <nav class="pager" aria-label="More examples">
        @if (previous(); as p) {
          <a class="pager__link" [routerLink]="['/examples', p.id]">
            <span class="pager__dir">Previous</span>
            <span class="pager__title">{{ p.title }}</span>
          </a>
        }
        @if (next(); as n) {
          <a class="pager__link pager__link--next" [routerLink]="['/examples', n.id]">
            <span class="pager__dir">Next</span>
            <span class="pager__title">{{ n.title }}</span>
          </a>
        }
      </nav>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .example {
      max-width: 72rem;
    }
    .intro {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin-bottom: 2.5rem;
    }
    .intro h1 {
      font-size: clamp(2rem, 1.5rem + 1.6vw, 2.75rem);
    }
    h2 {
      font-size: 1.125rem;
      letter-spacing: -0.01em;
      margin-bottom: 0.875rem;
    }
    ul {
      margin: 0;
      padding-inline-start: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .shows {
      max-width: var(--measure);
      margin-bottom: 3rem;
    }
    .workbench {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 18rem;
      gap: 2rem;
      align-items: start;
      margin-bottom: 3.5rem;
    }
    .workbench__try {
      position: sticky;
      top: calc(var(--header-h) + 1.5rem);
      padding: 1.25rem;
      border-radius: 0.75rem;
      background: var(--surface-2);
      font-size: 0.9375rem;
    }
    .workbench__try h2 {
      font-size: 1rem;
    }
    .source__note {
      margin: -0.25rem 0 1rem;
      color: var(--ink-2);
      font-size: 0.9375rem;
    }
    .source__open {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.75rem;
      margin: 0 0 1rem;
      color: var(--ink-2);
      font-size: 0.875rem;
    }
    @media (max-width: 62rem) {
      .workbench {
        grid-template-columns: minmax(0, 1fr);
      }
      .workbench__try {
        position: static;
        order: -1;
      }
    }
  `,
})
export class ExamplePage {
  private readonly id = inject(ActivatedRoute).snapshot.data['id'] as string;
  protected readonly example = computed(() => exampleById(this.id) ?? EXAMPLES[0]);
  private readonly index = computed(() => EXAMPLES.indexOf(this.example()));
  protected readonly previous = computed(() => EXAMPLES[this.index() - 1]);
  protected readonly next = computed(() => EXAMPLES[this.index() + 1]);

  /** Lazy examples load their code first; the rest render right away. */
  private readonly lazy = resource({
    params: () => {
      const c = this.example().component;
      return isLazy(c) ? c : undefined;
    },
    loader: ({ params }) => params.load(),
  });
  protected readonly component = computed<Type<unknown> | undefined>(() => {
    const c = this.example().component;
    return isLazy(c) ? this.lazy.value() : c;
  });

  private readonly outlet = viewChild(NgComponentOutlet);
  private readonly site = injectDocsSite();
  protected readonly openError = signal('');

  /** Opens the example's files as a new Angular project on StackBlitz. */
  protected async openOnStackBlitz(): Promise<void> {
    const ex = this.example();
    this.openError.set('');
    try {
      const files = ex.files.flatMap((f) => (f.src ? [{ path: f.src, url: `/source/${f.src}` }] : []));
      const title = `${this.site.name}: ${ex.title}`;
      const project = angularProject(title, await fetchSources(files), this.site.stackblitz!);
      if ('error' in project) {
        this.openError.set(project.error);
        return;
      }
      openStackBlitz(title, ex.summary, project.files, `src/app/${files[0].path}`);
    } catch {
      this.openError.set('The example could not be prepared. Try again.');
    }
  }

  /** The example component in the preview, for guards that look at its forms. */
  exampleInstance(): unknown {
    return this.outlet()?.componentInstance ?? null;
  }
}
