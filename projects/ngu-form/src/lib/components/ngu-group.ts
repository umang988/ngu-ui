import { ChangeDetectionStrategy, Component, computed, DestroyRef, ElementRef, forwardRef, inject, input } from '@angular/core';
import type { Field } from '@angular/forms/signals';
import { resolveCols } from '../config';
import { NGU_STATIC_HIDDEN } from '../internal';
import { injectNguI18n } from '../messages';
import type { AnyFieldDef, Cols, FormDefinition } from '../types';
import { NguArray } from './ngu-array';
import { NguDynamic } from './ngu-dynamic';
import { NguField } from './ngu-field';
import { NguFormContext } from './ngu-form-context';

let nextGroupId = 0;

interface Entry {
  readonly key: string;
  readonly path: string;
  readonly def: AnyFieldDef;
  /** Missing for static content, which has no model value. */
  readonly tree: Field<any> | undefined;
  /** `grid-column` value inside this group. */
  readonly column: string | null;
}

/**
 * Renders a definition object as a CSS grid, recursing into nested groups and arrays.
 * The group places its children: spans are capped at the current column count.
 */
@Component({
  selector: 'ngu-group',
  imports: [NguField, forwardRef(() => NguArray), forwardRef(() => NguDynamic)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ngu-group',
    '[class.ngu-group--invalid]': 'showErrors()',
    '[attr.role]': "title() ? 'group' : null",
    '[attr.aria-labelledby]': 'title() ? titleId : null',
    '[style.--ngu-cols]': 'columns()',
  },
  template: `
    @if (title()) {
      <h3 class="ngu-group__title" [id]="titleId">{{ i18n.text(title()) }}</h3>
    }
    @if (description()) {
      <p class="ngu-group__description">{{ i18n.text(description()) }}</p>
    }
    <div class="ngu-grid">
      @for (entry of entries(); track entry.key) {
        @if (!isHidden(entry)) {
          @switch (entry.def.__ngu) {
            @case ('group') {
              <ngu-group
                [style.grid-column]="entry.column"
                [fields]="entry.def.fields"
                [tree]="entry.tree!"
                [cols]="entry.def.cols ?? 1"
                [title]="entry.def.title"
                [description]="entry.def.description"
                [path]="entry.path"
              />
            }
            @case ('array') {
              <ngu-array [style.grid-column]="entry.column" [def]="entry.def" [tree]="entry.tree!" [path]="entry.path" />
            }
            @case ('dynamic') {
              <ngu-dynamic [style.grid-column]="entry.column" [def]="entry.def" [tree]="entry.tree!" [path]="entry.path" />
            }
            @case ('static') {
              @let s = entry.def;
              @switch (s.kind) {
                @case ('divider') {
                  <hr class="ngu-static ngu-divider" [style.grid-column]="entry.column" />
                }
                @case ('text') {
                  <p class="ngu-static ngu-static__text" [style.grid-column]="entry.column">{{ i18n.text(s.text) }}</p>
                }
                @default {
                  @switch (s.level) {
                    @case (2) {
                      <h2 class="ngu-static ngu-static__heading" [style.grid-column]="entry.column">{{ i18n.text(s.text) }}</h2>
                    }
                    @case (4) {
                      <h4 class="ngu-static ngu-static__heading" [style.grid-column]="entry.column">{{ i18n.text(s.text) }}</h4>
                    }
                    @case (5) {
                      <h5 class="ngu-static ngu-static__heading" [style.grid-column]="entry.column">{{ i18n.text(s.text) }}</h5>
                    }
                    @case (6) {
                      <h6 class="ngu-static ngu-static__heading" [style.grid-column]="entry.column">{{ i18n.text(s.text) }}</h6>
                    }
                    @default {
                      <h3 class="ngu-static ngu-static__heading" [style.grid-column]="entry.column">{{ i18n.text(s.text) }}</h3>
                    }
                  }
                }
              }
            }
            @default {
              <ngu-field [style.grid-column]="entry.column" [def]="entry.def" [field]="entry.tree!" [path]="entry.path" />
            }
          }
        }
      }
    </div>
    @if (showErrors()) {
      <p class="ngu-error" [id]="titleId + '-msg'" tabindex="-1">{{ message() }}</p>
    }
  `,
  styles: `
    :host {
      display: block;
      min-inline-size: 0;
    }
    .ngu-grid {
      display: grid;
      grid-template-columns: repeat(var(--ngu-cols, 1), minmax(0, 1fr));
      gap: var(--ngu-gap, 1rem);
    }
    .ngu-group__title {
      margin-block: 0 0.5rem;
      margin-inline: 0;
      font-size: var(--ngu-title-size, 1rem);
      font-weight: 600;
    }
    .ngu-error {
      margin-block: 0.5rem 0;
      margin-inline: 0;
      font-size: 0.8125rem;
      color: var(--ngu-error-color, #c62828);
    }
    .ngu-group__description {
      margin-block: 0 0.75rem;
      margin-inline: 0;
      font-size: 0.875rem;
      color: var(--ngu-hint-color, #6b6b6b);
    }
    .ngu-static {
      margin: 0;
    }
    .ngu-static__heading {
      font-size: var(--ngu-title-size, 1rem);
      font-weight: 600;
    }
    .ngu-static__text {
      font-size: 0.875rem;
      color: var(--ngu-hint-color, #6b6b6b);
    }
    .ngu-divider {
      border: 0;
      border-block-start: 1px solid var(--ngu-border-color, #c7c7c7);
      inline-size: 100%;
    }
  `,
})
export class NguGroup {
  readonly fields = input.required<FormDefinition>();
  readonly tree = input.required<Field<any>>();
  readonly cols = input<Cols>(1);
  readonly title = input<string>();
  readonly description = input<string>();
  /** Dot path of this group inside the form; empty at the root. */
  readonly path = input<string>('');

  protected readonly titleId = `ngu-group-${nextGroupId++}`;
  private readonly context = inject(NguFormContext, { optional: true });
  protected readonly i18n = this.context?.i18n ?? injectNguI18n();
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly state = computed(() => this.tree()());
  /** Group-level errors (from `validate` on the group) show after submit, or once the group was edited. */
  protected readonly showErrors = computed(() => {
    // The root group's errors are form-level; <ngu-form> renders those.
    if (this.path() === '') {
      return false;
    }
    const s = this.state();
    if (s.errors().length === 0) {
      return false;
    }
    return Boolean(this.context?.submitAttempted()) || (s.touched() && s.dirty());
  });
  protected readonly message = computed(() => {
    const first = this.state().errors()[0];
    if (!first) {
      return undefined;
    }
    return first.message
      ? this.i18n.text(first.message)
      : this.i18n.message('invalid', { label: this.i18n.text(this.title()) ?? this.i18n.message('fieldFallback') });
  });

  constructor() {
    // Group-level errors join the error summary; the root group's belong to <ngu-form>.
    if (this.context) {
      const self = this;
      const unregister = this.context.register({
        id: this.titleId + '-msg',
        message: computed(() => (this.path() !== '' && this.state().errors().length ? this.message() : undefined)),
        element: this.host.nativeElement,
        get field() {
          return self.tree();
        },
        focus: () => {
          const host = this.host.nativeElement;
          host.scrollIntoView?.({ block: 'center' });
          host.querySelector<HTMLElement>(':scope > .ngu-error')?.focus({ preventScroll: true });
        },
      });
      inject(DestroyRef).onDestroy(unregister);
    }
  }

  /** Columns at the form's current width. */
  protected readonly columns = computed(() =>
    resolveCols(this.cols(), this.context?.width(), this.context?.breakpoints),
  );
  private readonly staticHidden = computed(() => this.state().metadata(NGU_STATIC_HIDDEN)?.() ?? {});

  protected readonly entries = computed<readonly Entry[]>(() => {
    const subtree = this.tree() as unknown as Record<string, Field<any>>;
    const base = this.path();
    const cols = this.columns();
    return Object.entries(this.fields()).map(([key, def]) => ({
      key,
      path: base ? base + '.' + key : key,
      def,
      tree: def.__ngu === 'static' ? undefined : subtree[key],
      column: column(def, cols),
    }));
  });

  protected isHidden(entry: Entry): boolean {
    return entry.tree ? entry.tree().hidden() : Boolean(this.staticHidden()[entry.key]);
  }
}

function column(def: AnyFieldDef, cols: number): string | null {
  const span = Math.min(def.span ?? 1, cols);
  if (span > 1) {
    return `span ${span}`;
  }
  // Headings, paragraphs and dividers take a whole row unless they set a span.
  return def.__ngu === 'static' && cols > 1 ? '1 / -1' : null;
}
