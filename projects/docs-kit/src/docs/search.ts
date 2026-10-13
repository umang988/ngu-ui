import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import type { DocSection } from './model';
import { injectDocsSite, navEntries } from '../site';

interface Hit {
  readonly key: string;
  readonly title: string;
  /** Where it is: the page, or the group for a page. */
  readonly where: string;
  readonly path: string;
  readonly fragment?: string;
}

/** Searches page and section titles. Opens with the header button, Ctrl K or ⌘K. */
@Component({
  selector: 'app-search',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown)': 'onGlobalKey($event)' },
  template: `
    <button
      type="button"
      class="search-button"
      (click)="open()"
      aria-keyshortcuts="Control+K Meta+K"
    >
      <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
        <circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" stroke-width="1.75" />
        <path
          d="M12.6 12.6 17 17"
          stroke="currentColor"
          stroke-width="1.75"
          stroke-linecap="round"
        />
      </svg>
      <span class="search-button__text">Search</span>
      <kbd class="search-button__key" aria-hidden="true">{{ mac ? '⌘K' : 'Ctrl K' }}</kbd>
    </button>
    <!-- eslint-disable-next-line @angular-eslint/template/click-events-have-key-events, @angular-eslint/template/interactive-supports-focus -- a click on the backdrop closes it; Escape does the same by keyboard -->
    <dialog
      #dialog
      class="search"
      aria-label="Search the documentation"
      (close)="query.set('')"
      (click)="onDialogClick($event)"
    >
      <div class="search__bar">
        <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
          <circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" stroke-width="1.75" />
          <path
            d="M12.6 12.6 17 17"
            stroke="currentColor"
            stroke-width="1.75"
            stroke-linecap="round"
          />
        </svg>
        <input
          #input
          type="text"
          role="combobox"
          aria-label="Search the documentation"
          aria-autocomplete="list"
          aria-expanded="true"
          aria-controls="search-results"
          [attr.aria-activedescendant]="results().length ? 'search-hit-' + active() : null"
          placeholder="Search pages and sections"
          autocomplete="off"
          spellcheck="false"
          [value]="query()"
          (input)="onInput($event)"
          (keydown)="onKey($event)"
        />
        <button type="button" class="search__close" (click)="close()">Esc</button>
      </div>
      <ul id="search-results" class="search__results" role="listbox" aria-label="Results">
        @for (hit of results(); track hit.key; let i = $index) {
          <!-- eslint-disable-next-line @angular-eslint/template/click-events-have-key-events, @angular-eslint/template/interactive-supports-focus -- options are chosen from the search box with the arrow keys and Enter (aria-activedescendant) -->
          <li
            role="option"
            class="search__hit"
            [id]="'search-hit-' + i"
            [attr.aria-selected]="i === active()"
            (click)="go(hit)"
            (pointermove)="active.set(i)"
          >
            <span class="search__title">{{ hit.title }}</span>
            <span class="search__where">{{ hit.where }}</span>
          </li>
        }
      </ul>
      <p class="search__status" role="status">
        @if (query() && !results().length) {
          No results for "{{ query() }}".
        } @else if (query()) {
          {{ results().length }} {{ results().length === 1 ? 'result' : 'results' }}
        }
      </p>
    </dialog>
  `,
})
export class Search {
  private readonly router = inject(Router);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly input = viewChild.required<ElementRef<HTMLInputElement>>('input');

  protected readonly mac =
    typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
  private readonly entries = navEntries(injectDocsSite().nav);
  protected readonly query = signal('');
  protected readonly active = signal(0);
  /** Pages at once; their sections once the page contents have loaded. */
  private readonly index = signal<readonly Hit[]>(
    this.entries.map((e) => ({ key: e.path, title: e.title, where: e.group, path: e.path })),
  );
  private sectionsLoaded = false;

  protected readonly results = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) {
      return this.index()
        .filter((h) => !h.fragment)
        .slice(0, 8);
    }
    const scored = this.index()
      .map((h) => {
        const title = h.title.toLowerCase();
        const score = title.startsWith(q)
          ? 0
          : title.includes(q)
            ? 1
            : h.where.toLowerCase().includes(q)
              ? 2
              : -1;
        return { h, score };
      })
      .filter((s) => s.score >= 0)
      .sort((a, b) => a.score - b.score || Number(!!a.h.fragment) - Number(!!b.h.fragment));
    return scored.slice(0, 12).map((s) => s.h);
  });

  open(): void {
    const dialog = this.dialog().nativeElement;
    if (!dialog.open) {
      dialog.showModal();
    }
    this.active.set(0);
    this.input().nativeElement.focus();
    void this.loadSections();
  }

  protected close(): void {
    const dialog = this.dialog().nativeElement;
    if (dialog.open) {
      dialog.close();
    }
  }

  protected onGlobalKey(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.open();
    }
  }

  /** A click on the backdrop closes the dialog. */
  protected onDialogClick(event: MouseEvent): void {
    if (event.target === this.dialog().nativeElement) {
      this.close();
    }
  }

  protected onInput(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
    this.active.set(0);
  }

  protected onKey(event: KeyboardEvent): void {
    const count = this.results().length;
    if (event.key === 'ArrowDown' && count) {
      event.preventDefault();
      this.active.set((this.active() + 1) % count);
    } else if (event.key === 'ArrowUp' && count) {
      event.preventDefault();
      this.active.set((this.active() - 1 + count) % count);
    } else if (event.key === 'Enter' && count) {
      event.preventDefault();
      this.go(this.results()[this.active()]);
    } else {
      return;
    }
    this.dialog()
      .nativeElement.querySelector(`#search-hit-${this.active()}`)
      ?.scrollIntoView({ block: 'nearest' });
  }

  protected go(hit: Hit): void {
    this.close();
    void this.router.navigate(['/' + hit.path], { fragment: hit.fragment });
  }

  private async loadSections(): Promise<void> {
    if (this.sectionsLoaded) {
      return;
    }
    this.sectionsLoaded = true;
    const pages = await Promise.all(
      this.entries
        .filter((e) => e.load)
        .map(async (e) => ({
          e,
          page: await e.load!().catch(() => undefined),
        })),
    );
    const sections: Hit[] = [];
    const add = (path: string, page: string, list: readonly DocSection[]) => {
      for (const s of list) {
        sections.push({
          key: `${path}#${s.id}`,
          title: s.title,
          where: page,
          path,
          fragment: s.id,
        });
        add(path, page, s.children ?? []);
      }
    };
    for (const { e, page } of pages) {
      if (page) {
        add(e.path, e.title, page.sections);
      }
    }
    this.index.update((pagesOnly) => [...pagesOnly, ...sections]);
  }
}
