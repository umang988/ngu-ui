import { ChangeDetectionStrategy, Component, computed, inject, resource } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { ApiTable } from './api-table';
import { DocSectionView } from './doc-section';
import { DocText } from './doc-text';
import { injectDocsSite, navEntries } from '../site';
import { Toc } from './toc';

/**
 * A documentation page in the PrimeNG mould: breadcrumb, title and description, Features and
 * API views, sections with live demos, "On this page" beside it, and previous and next links.
 */
@Component({
  selector: 'app-doc-page',
  imports: [RouterLink, ApiTable, DocSectionView, DocText, Toc],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'doc-page' },
  template: `
    @let e = entry();
    <article class="doc" #article>
      <nav class="crumbs" aria-label="Breadcrumb">
        <ol>
          <li>{{ e?.group }}</li>
          <li>
            <span aria-current="page">{{ e?.title }}</span>
          </li>
        </ol>
      </nav>
      @if (page.value(); as p) {
        <header class="doc__intro">
          <h1>{{ p.title }}</h1>
          <p class="doc__lead"><app-doc-text [text]="p.description" /></p>
        </header>
        @if (p.api) {
          <nav class="doc-views" aria-label="Views of this page">
            <a
              [routerLink]="[]"
              [queryParams]="{ tab: null }"
              queryParamsHandling="merge"
              [attr.aria-current]="view() === 'features' ? 'page' : null"
              >Features</a
            >
            <a
              [routerLink]="[]"
              [queryParams]="{ tab: 'api' }"
              queryParamsHandling="merge"
              [attr.aria-current]="view() === 'api' ? 'page' : null"
              >API</a
            >
          </nav>
        }
        @if (view() === 'api' && p.api) {
          @for (g of p.api; track g.id) {
            <app-api-table [group]="g" />
          }
        } @else {
          @for (s of p.sections; track s.id) {
            <app-doc-section [section]="s" />
          }
        }
      } @else if (page.error()) {
        <p class="doc__lead" role="alert">
          This page did not load. Check your connection and reload.
        </p>
      } @else {
        <div class="doc__placeholder" aria-hidden="true"></div>
        <p class="visually-hidden" role="status">Loading…</p>
      }
      <nav class="pager" aria-label="Previous and next pages">
        @if (previous(); as prev) {
          <a class="pager__link" [routerLink]="'/' + prev.path">
            <span class="pager__dir">Previous</span>
            <span class="pager__title">{{ prev.title }}</span>
          </a>
        }
        @if (next(); as nxt) {
          <a class="pager__link pager__link--next" [routerLink]="'/' + nxt.path">
            <span class="pager__dir">Next</span>
            <span class="pager__title">{{ nxt.title }}</span>
          </a>
        }
      </nav>
    </article>
    <aside class="doc-aside">
      <app-toc [root]="article" />
    </aside>
  `,
})
export class DocPage {
  private readonly route = inject(ActivatedRoute);
  private readonly path = toSignal(this.route.data.pipe(map((d) => d['path'] as string)), {
    requireSync: true,
  });
  protected readonly view = toSignal(
    this.route.queryParamMap.pipe(map((q) => (q.get('tab') === 'api' ? 'api' : 'features'))),
    {
      initialValue: 'features' as const,
    },
  );

  private readonly entries = navEntries(injectDocsSite().nav);
  protected readonly entry = computed(() => this.entries.find((e) => e.path === this.path()));
  protected readonly page = resource({
    params: () => this.entry(),
    loader: ({ params }) => params.load!(),
  });

  private readonly index = computed(() => this.entries.findIndex((e) => e.path === this.path()));
  protected readonly previous = computed(() => this.entries[this.index() - 1]);
  protected readonly next = computed(() => this.entries[this.index() + 1]);
}
