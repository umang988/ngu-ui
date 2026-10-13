import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  signal,
  untracked,
  viewChild,
  ViewContainerRef,
  type ComponentRef,
  type Signal,
} from '@angular/core';
import { CodeBlock } from '../ui/code-block';
import { CodeTabs, type CodeFile } from '../ui/code-tabs';
import { injectDocsSite } from '../site';
import { angularProject, fetchSources, openStackBlitz } from '../ui/stackblitz';
import type { DocDemo } from './model';

/** What a demo component may expose for the value panel: a form with a value, or a value. */
interface DemoInstance {
  readonly form?: { readonly value: () => unknown };
  readonly value?: Signal<unknown>;
}

/**
 * A live demo: the form, its current value, and below them the source file that runs it.
 * The code is the demo's own file, copied at build time, so the two never disagree.
 */
@Component({
  selector: 'app-demo-card',
  imports: [CodeBlock, CodeTabs],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'demo' },
  template: `
    <div class="demo__stage" [class.demo__stage--wide]="!showValue()">
      <div class="demo__form">
        <ng-container #host />
        @if (!ready()) {
          <p class="demo__loading" role="status">Loading the demo…</p>
        }
      </div>
      @if (showValue()) {
        <div class="demo__value">
          <p class="demo__label" [id]="valueId">Value</p>
          <pre
            class="demo__json"
            tabindex="0"
            [attr.aria-labelledby]="valueId"
          ><code>{{ json() }}</code></pre>
        </div>
      }
    </div>
    @if (canOpen()) {
      <div class="demo__actions">
        <button type="button" class="demo__open" (click)="openOnStackBlitz()">Open in StackBlitz</button>
        <span class="demo__note" role="status">{{ openError() }}</span>
      </div>
    }
    @if (files(); as files) {
      <div class="demo__files">
        <app-code-tabs [files]="files" label="Source files" maxHeight="28rem" />
      </div>
    } @else {
      <app-code
        [src]="'docs/' + demo().src"
        [filename]="fileName()"
        [bare]="true"
        maxHeight="28rem"
      />
    }
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
    .demo__stage {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(12rem, 16rem);
      border-bottom: 1px solid var(--rule);
    }
    .demo__stage--wide {
      grid-template-columns: minmax(0, 1fr);
    }
    .demo__form {
      padding: clamp(1rem, 0.6rem + 1.6vw, 1.75rem);
      min-width: 0;
    }
    .demo__files {
      padding: 0.75rem;
    }
    .demo__actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.75rem;
      padding: 0.5rem 0.75rem 0;
    }
    .demo__open {
      font: inherit;
      font-size: 0.8125rem;
      padding: 0.25rem 0.75rem;
      border: 1px solid var(--rule);
      border-radius: 0.375rem;
      background: var(--surface);
      color: var(--ink);
      cursor: pointer;
    }
    .demo__open:hover {
      border-color: var(--ink-2);
    }
    .demo__note {
      color: var(--ink-2);
      font-size: 0.8125rem;
    }
    .demo__loading {
      color: var(--ink-2);
      font-size: 0.875rem;
    }
    .demo__value {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding: 1rem;
      border-inline-start: 1px solid var(--rule);
      background: var(--surface-2);
      min-width: 0;
    }
    .demo__label {
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--ink-2);
    }
    .demo__json {
      margin: 0;
      font-size: 0.75rem;
      line-height: 1.55;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      max-height: 22rem;
      overflow: auto;
    }
    @media (max-width: 52rem) {
      .demo__stage {
        grid-template-columns: minmax(0, 1fr);
      }
      .demo__value {
        border-inline-start: 0;
        border-top: 1px solid var(--rule);
      }
    }
  `,
})
export class DemoCard {
  readonly demo = input.required<DocDemo>();
  private readonly site = injectDocsSite();
  protected readonly canOpen = computed(() => !!this.site.stackblitz && this.demo().stackblitz !== false);
  protected readonly openError = signal('');

  private static nextId = 0;
  protected readonly valueId = `demo-value-${DemoCard.nextId++}`;
  private readonly host = viewChild.required('host', { read: ViewContainerRef });
  private readonly instance = signal<DemoInstance | undefined>(undefined);
  protected readonly ready = computed(() => this.instance() !== undefined);
  protected readonly showValue = computed(() => this.demo().value !== false);
  protected readonly fileName = computed(() => this.demo().src.split('/').at(-1));
  /** The demo's file and the ones it uses, as tabs; undefined for a single file. */
  protected readonly files = computed<readonly CodeFile[] | undefined>(() => {
    const extra = this.demo().files;
    if (!extra?.length) {
      return undefined;
    }
    return [this.demo().src, ...extra].map((src) => ({
      name: src.split('/').at(-1)!,
      src: `docs/${src}`,
    }));
  });

  /** The model value as JSON: files by name, signatures shortened. */
  protected readonly json = computed(() => {
    const instance = this.instance();
    const value = instance?.form?.value ?? instance?.value;
    return value ? describe(value()) : '';
  });

  constructor() {
    let ref: ComponentRef<unknown> | undefined;
    effect((onCleanup) => {
      const demo = this.demo();
      const host = this.host();
      let cancelled = false;
      demo.load().then((type) => {
        if (cancelled) {
          return;
        }
        untracked(() => {
          ref = host.createComponent(type);
          this.instance.set(ref.instance as DemoInstance);
        });
      });
      onCleanup(() => {
        cancelled = true;
        ref?.destroy();
        ref = undefined;
        this.instance.set(undefined);
      });
    });
  }

  /** Opens the demo's files as a new Angular project on StackBlitz. */
  protected async openOnStackBlitz(): Promise<void> {
    const demo = this.demo();
    this.openError.set('');
    try {
      const sources = await fetchSources(
        [demo.src, ...(demo.files ?? [])].map((src) => ({ path: src, url: `/source/docs/${src}` })),
      );
      const title = `${this.site.name}: ${this.fileName()}`;
      const project = angularProject(title, sources, this.site.stackblitz!);
      if ('error' in project) {
        this.openError.set(project.error);
        return;
      }
      openStackBlitz(title, `A ${this.site.name} demo from its documentation.`, project.files, `src/app/${demo.src}`);
    } catch {
      this.openError.set('The demo could not be prepared. Try again.');
    }
  }
}

function describe(value: unknown): string {
  return JSON.stringify(
    value,
    (_, v: unknown) => {
      if (typeof File !== 'undefined' && v instanceof File) {
        return `File: ${v.name}, ${v.size} bytes`;
      }
      if (typeof v === 'string' && v.startsWith('data:image')) {
        return `${v.slice(0, 24)}… (${v.length} characters)`;
      }
      return v;
    },
    2,
  );
}
