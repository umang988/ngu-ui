import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { CodeBlock } from './code-block';
import type { CodeLang } from './highlighter';

export interface CodeFile {
  /** Tab label, usually the file name. */
  readonly name: string;
  readonly code?: string;
  /** Path under `src/app/examples`, loaded at run time. */
  readonly src?: string;
  readonly lang?: CodeLang;
}

let nextId = 0;

/** Several code samples behind tabs, following the ARIA tabs pattern. */
@Component({
  selector: 'app-code-tabs',
  imports: [CodeBlock],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="tabs" role="tablist" [attr.aria-label]="label()" (keydown)="onKeydown($event)">
      @for (file of files(); track file.name; let i = $index) {
        <button
          type="button"
          role="tab"
          class="tab"
          [id]="id + '-tab-' + i"
          [attr.aria-selected]="i === active()"
          [attr.aria-controls]="id + '-panel'"
          [tabindex]="i === active() ? 0 : -1"
          (click)="active.set(i)"
        >
          {{ file.name }}
        </button>
      }
    </div>
    <div role="tabpanel" [id]="id + '-panel'" [attr.aria-labelledby]="id + '-tab-' + active()">
      @let file = current();
      <app-code
        [code]="file.code"
        [src]="file.src"
        [language]="file.lang ?? 'angular-ts'"
        [filename]="filename() ? file.name : undefined"
        [maxHeight]="maxHeight()"
      />
    </div>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }
    .tabs {
      display: flex;
      gap: 0.25rem;
      overflow-x: auto;
      margin-bottom: 0.5rem;
    }
    .tab {
      font: inherit;
      font-family: var(--font-mono);
      font-size: 0.8125rem;
      min-height: 2.25rem;
      padding: 0.375rem 0.75rem;
      border: 1px solid transparent;
      border-radius: 0.5rem;
      background: transparent;
      color: var(--ink-2);
      white-space: nowrap;
      cursor: pointer;
    }
    .tab:hover {
      color: var(--ink);
    }
    .tab[aria-selected='true'] {
      border-color: var(--rule);
      background: var(--surface);
      color: var(--ink);
      font-weight: 500;
    }
  `,
})
export class CodeTabs {
  readonly files = input.required<readonly CodeFile[]>();
  /** Accessible name of the tab list. */
  readonly label = input('Code');
  /** Repeat the file name in the code block's bar. */
  readonly filename = input(false);
  readonly maxHeight = input<string | null>(null);

  protected readonly id = `code-tabs-${nextId++}`;
  protected readonly active = signal(0);
  protected readonly current = computed(
    () => this.files()[Math.min(this.active(), this.files().length - 1)],
  );
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Arrow keys, Home and End move between tabs and select them. */
  protected onKeydown(event: KeyboardEvent): void {
    const count = this.files().length;
    const moves: Record<string, number> = {
      ArrowRight: (this.active() + 1) % count,
      ArrowLeft: (this.active() - 1 + count) % count,
      Home: 0,
      End: count - 1,
    };
    const next = moves[event.key];
    if (next === undefined) {
      return;
    }
    event.preventDefault();
    this.active.set(next);
    this.host.nativeElement.querySelector<HTMLElement>(`#${this.id}-tab-${next}`)?.focus();
  }
}
