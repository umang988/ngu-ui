import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  forwardRef,
  inject,
  Injector,
  input,
  linkedSignal,
} from '@angular/core';
import type { Field } from '@angular/forms/signals';
import { injectNguI18n } from '../messages';
import { isLeafDef, type ArrayDef } from '../types';
import { NguField } from './ngu-field';
import { NguFormContext } from './ngu-form-context';
import { NguGroup } from './ngu-group';

let nextArrayId = 0;

const FOCUSABLE =
  'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Renders an array property as a list of rows. The item definition is rendered
 * once per element; adding and removing rows updates the model value.
 */
@Component({
  selector: 'ngu-array',
  imports: [NguField, forwardRef(() => NguGroup)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ngu-array',
    '[class.ngu-array--invalid]': 'showErrors()',
    '[attr.role]': "def().title ? 'group' : null",
    '[attr.aria-labelledby]': 'def().title ? titleId : null',
    '[class.ngu-array--narrow]': 'narrow()',
  },
  template: `
    @let d = def();
    @if (d.title) {
      <h3 class="ngu-array__title" [id]="titleId">{{ i18n.text(d.title) }}</h3>
    }
    @if (d.description) {
      <p class="ngu-array__description">{{ i18n.text(d.description) }}</p>
    }
    <div class="ngu-array__rows" [attr.role]="rows().length ? 'list' : null">
      @for (row of rows(); track $index) {
        <div class="ngu-array__row" role="listitem">
          @if (isLeaf(d.item)) {
            <ngu-field [def]="d.item" [field]="row" [path]="itemPath()" />
          } @else {
            <ngu-group [fields]="d.item" [tree]="row" [cols]="d.cols" [path]="itemPath()" />
          }
          @if (removeLabel()) {
            <button
              type="button"
              class="ngu-array__remove"
              [disabled]="!canRemove()"
              [attr.aria-label]="i18n.message('removeItem', { label: removeLabel(), index: $index + 1 })"
              (click)="remove($index)"
            >
              {{ removeLabel() }}
            </button>
          }
        </div>
      } @empty {
        <p class="ngu-array__empty">{{ emptyText() }}</p>
      }
    </div>
    @if (addLabel()) {
      <button type="button" class="ngu-array__add" [disabled]="!canAdd()" (click)="add()">
        {{ addLabel() }}
      </button>
    }
    @if (showErrors()) {
      <p class="ngu-error" [id]="titleId + '-msg'" tabindex="-1">{{ message() }}</p>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--ngu-gap, 1rem);
      min-inline-size: 0;
    }
    .ngu-array__title {
      margin: 0;
      font-size: var(--ngu-title-size, 1rem);
      font-weight: 600;
    }
    .ngu-array__description,
    .ngu-array__empty {
      margin: 0;
      font-size: 0.875rem;
      color: var(--ngu-hint-color, #6b6b6b);
    }
    .ngu-array__rows {
      display: flex;
      flex-direction: column;
      gap: var(--ngu-gap, 1rem);
    }
    .ngu-array__row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: var(--ngu-gap, 1rem);
      align-items: start;
      padding: var(--ngu-row-padding, 0.75rem);
      border: 1px solid var(--ngu-border-color, #c7c7c7);
      border-radius: var(--ngu-radius, 0.375rem);
    }
    .ngu-array__remove,
    .ngu-array__add {
      font: inherit;
      font-size: 0.875rem;
      padding: var(--ngu-button-padding, 0.5rem 1rem);
      border: 1px solid var(--ngu-border-color, #c7c7c7);
      border-radius: var(--ngu-radius, 0.375rem);
      background: var(--ngu-input-bg, transparent);
      color: inherit;
      cursor: pointer;
    }
    .ngu-array__add {
      align-self: flex-start;
      color: var(--ngu-primary, #1a73e8);
      border-color: currentColor;
    }
    .ngu-array__remove:disabled,
    .ngu-array__add:disabled {
      opacity: 0.5;
      cursor: default;
    }
    .ngu-error {
      margin: 0;
      font-size: 0.8125rem;
      color: var(--ngu-error-color, #c62828);
    }
    :host(.ngu-array--narrow) .ngu-array__row {
      grid-template-columns: 1fr;
    }
  `,
})
export class NguArray {
  readonly def = input.required<ArrayDef>();
  readonly tree = input.required<Field<any>>();
  /** Dot path of this list inside the form. */
  readonly path = input<string>('');

  protected readonly itemPath = computed(() => this.path() + '[]');

  protected readonly titleId = `ngu-array-${nextArrayId++}`;
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly context = inject(NguFormContext, { optional: true });
  protected readonly i18n = this.context?.i18n ?? injectNguI18n();
  /** `''` hides a button; unset uses the translated default. */
  protected readonly addLabel = computed(() => {
    const label = this.def().addLabel;
    return label === undefined ? this.i18n.message('add') : this.i18n.text(label);
  });
  protected readonly removeLabel = computed(() => {
    const label = this.def().removeLabel;
    return label === undefined ? this.i18n.message('remove') : this.i18n.text(label);
  });
  private readonly interacted = linkedSignal({
    source: () => this.context?.resets() ?? 0,
    computation: () => false,
  });

  protected readonly isLeaf = isLeafDef;

  protected readonly state = computed(() => this.tree()());
  protected readonly rows = computed<readonly Field<any>[]>(() => {
    const list = this.tree() as unknown as ArrayLike<Field<any>>;
    return Array.from({ length: list.length }, (_, i) => list[i]);
  });
  protected readonly canAdd = computed(() => {
    const max = this.def().max;
    return max == null || this.rows().length < max;
  });
  protected readonly canRemove = computed(() => {
    const min = this.def().min ?? 0;
    return this.rows().length > min;
  });
  protected readonly emptyText = computed(() => {
    const add = this.addLabel();
    return add ? this.i18n.message('emptyList', { add }) : this.i18n.message('emptyListNoAdd');
  });
  protected readonly showErrors = computed(() => {
    const errors = this.state().errors();
    if (errors.length === 0) {
      return false;
    }
    return Boolean(this.context?.submitAttempted()) || this.interacted();
  });
  protected readonly message = computed(() => {
    const first = this.state().errors()[0];
    if (!first) {
      return undefined;
    }
    const d = this.def();
    const label = this.i18n.text(d.title) ?? this.i18n.message('listFallback');
    if (first.message) {
      return this.i18n.text(first.message);
    }
    switch (first.kind) {
      case 'minLength':
        return this.i18n.message('minItems', { label, min: d.min ?? 0 });
      case 'maxLength':
        return this.i18n.message('maxItems', { label, max: d.max ?? 0 });
      default:
        return this.i18n.message('invalid', { label });
    }
  });

  constructor() {
    if (this.context) {
      const self = this;
      const unregister = this.context.register({
        id: this.titleId + '-msg',
        message: computed(() => (this.state().errors().length ? this.message() : undefined)),
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
  /** Below the `sm` breakpoint the remove button moves under the row's fields. */
  protected readonly narrow = computed(() => {
    const width = this.context?.width();
    return width != null && width < (this.context?.breakpoints.sm ?? 0);
  });

  protected add(): void {
    if (!this.canAdd()) {
      return;
    }
    this.interacted.set(true);
    const next = this.def().newItem();
    this.state().value.update((items: unknown[]) => [...items, next]);
    // Move focus into the new row so keyboard users can type right away.
    this.focusAfterRender((rows) => rows[rows.length - 1]);
  }

  protected remove(index: number): void {
    if (!this.canRemove()) {
      return;
    }
    this.interacted.set(true);
    this.state().value.update((items: unknown[]) => items.filter((_, i) => i !== index));
    // The focused remove button is gone: move to the row that took its place, the new last
    // row, or the add button when the list is empty.
    this.focusAfterRender((rows) => rows[Math.min(index, rows.length - 1)]);
  }

  private focusAfterRender(pickRow: (rows: readonly HTMLElement[]) => HTMLElement | undefined): void {
    afterNextRender(
      () => {
        const host = this.host.nativeElement;
        const rows = Array.from(host.querySelectorAll<HTMLElement>(':scope > .ngu-array__rows > .ngu-array__row'));
        const row = rows.length ? pickRow(rows) : undefined;
        const target =
          row?.querySelector<HTMLElement>(FOCUSABLE) ??
          host.querySelector<HTMLElement>(':scope > .ngu-array__add');
        target?.focus();
      },
      { injector: this.injector },
    );
  }
}
