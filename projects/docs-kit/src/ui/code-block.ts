import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  resource,
  signal,
} from '@angular/core';
import { highlight, type CodeLang, type CodeToken } from './highlighter';

/** Where example sources are copied at build time (see `angular.json` assets). */
const SOURCE_ROOT = 'source/';

/**
 * A code sample with a copy button. Pass `code` for inline snippets, or `src` to load one of
 * the example files, so the page always shows the code that actually runs. Plain text shows
 * at once; colors arrive when the highlighter has loaded.
 */
@Component({
  selector: 'app-code',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'code', '[class.code--bare]': 'bare()' },
  template: `
    <div class="code__bar">
      <span class="code__name">{{ filename() ?? langLabel() }}</span>
      <button
        type="button"
        class="code__copy"
        (click)="copy()"
        [disabled]="!text()"
        [attr.aria-label]="copyLabel()"
      >
        {{ copied() ? 'Copied' : 'Copy' }}
      </button>
    </div>
    @if (source.error()) {
      <p class="code__error">This file did not load. Check your connection and reload the page.</p>
    } @else {
      <pre
        class="code__body"
        tabindex="0"
        [style.max-height]="maxHeight()"
        [attr.aria-label]="(filename() ?? langLabel()) + ' code'"
      ><code>@for (line of lines(); track $index) {<span class="code__line">@for (t of line; track $index) {<span class="shiki-token" [style]="t.style">{{ t.content }}</span>}</span>}</code></pre>
    }
    <span class="visually-hidden" aria-live="polite">{{ status() }}</span>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
      border: 1px solid var(--rule);
      border-radius: 0.75rem;
      background: var(--surface);
      overflow: hidden;
    }
    :host(.code--bare) {
      border: 0;
      border-radius: 0;
      background: transparent;
    }
    :host(.code--bare) .code__bar {
      background: transparent;
    }
    .code__bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.375rem 0.5rem 0.375rem 1rem;
      border-bottom: 1px solid var(--rule);
      background: var(--surface-2);
    }
    .code__name {
      font-family: var(--font-mono);
      font-size: 0.8125rem;
      color: var(--ink-2);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .code__copy {
      font: inherit;
      font-size: 0.8125rem;
      font-weight: 600;
      min-height: 2rem;
      min-width: 4.5rem;
      padding: 0.25rem 0.75rem;
      border: 1px solid var(--rule);
      border-radius: 0.375rem;
      background: var(--surface);
      color: var(--ink);
      cursor: pointer;
    }
    .code__copy:hover {
      border-color: var(--ink-2);
    }
    .code__body {
      margin: 0;
      padding: 1rem 1.125rem;
      overflow: auto;
      font-size: 0.875rem;
      line-height: 1.6;
      tab-size: 2;
      color: var(--ink);
    }
    .code__body:focus-visible {
      outline-offset: -2px;
    }
    .code__line {
      display: block;
      min-height: 1.65em;
      white-space: pre;
    }
    .code__error {
      margin: 0;
      padding: 1rem 1.125rem;
      font-size: 0.875rem;
      color: var(--ink-2);
    }
  `,
})
export class CodeBlock {
  /** Inline code. */
  readonly code = input<string>();
  /** Path of a file under `/source` (examples, and docs demos under `docs/`), loaded at run time. */
  readonly src = input<string>();
  readonly language = input<CodeLang>('angular-ts');
  /** Shown in the bar; defaults to the language name. */
  readonly filename = input<string>();
  /** Taller files scroll inside the block. */
  readonly maxHeight = input<string | null>(null);
  /** No frame, for code that sits inside another panel. */
  readonly bare = input(false);

  protected readonly source = resource({
    params: () => this.src(),
    loader: async ({ params, abortSignal }) => {
      const res = await fetch(SOURCE_ROOT + params, { signal: abortSignal });
      if (!res.ok) {
        throw new Error(`${res.status} ${res.statusText}`);
      }
      return res.text();
    },
  });

  /** The code as plain text, without the trailing newline files end with. */
  protected readonly text = computed(() => {
    const raw = this.src()
      ? this.source.hasValue()
        ? this.source.value()
        : ''
      : (this.code() ?? '');
    return raw.replace(/\s+$/, '');
  });

  private readonly tokens = signal<{ text: string; lines: CodeToken[][] } | undefined>(undefined);

  protected readonly lines = computed<readonly (readonly CodeToken[])[]>(() => {
    const text = this.text();
    const highlighted = this.tokens();
    if (highlighted?.text === text) {
      return highlighted.lines;
    }
    return text.split('\n').map((line) => [{ content: line, style: {} }]);
  });

  protected readonly copied = signal(false);
  protected readonly status = signal('');
  protected readonly langLabel = computed(() => LANG_LABELS[this.language()]);
  protected readonly copyLabel = computed(
    () => `Copy ${this.filename() ?? this.langLabel() + ' code'}`,
  );

  constructor() {
    effect(() => {
      const text = this.text();
      const lang = this.language();
      if (!text) {
        return;
      }
      highlight(text, lang).then(
        (lines) => this.tokens.set({ text, lines }),
        () => undefined, // plain text stays; the code is still readable and copyable
      );
    });
  }

  protected async copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.text());
      this.copied.set(true);
      this.status.set('Copied to the clipboard');
      setTimeout(() => {
        this.copied.set(false);
        this.status.set('');
      }, 2000);
    } catch {
      this.status.set('Copying is blocked here. Select the code and copy it instead.');
    }
  }
}

const LANG_LABELS: Record<CodeLang, string> = {
  'angular-ts': 'TypeScript',
  'angular-html': 'HTML',
  bash: 'Terminal',
  json: 'JSON',
  css: 'CSS',
};
