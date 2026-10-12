import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  model,
  output,
} from '@angular/core';
import { isDate, isoDate, toDate } from '../internal';
import { injectNguI18n, type NguI18n } from '../messages';
import type { LeafDef } from '../types';
import { injectNguLook } from '../look';

type End = Date | string | null;
interface Range {
  readonly from: End;
  readonly to: End;
}

/**
 * Two date inputs for a `{ from, to }` value. Ends are `Date` values (midnight UTC) or `null`,
 * or ISO date strings (`''` when empty), following what the model held first. Each input's
 * calendar is limited by the other end and by the field's `min` and `max`.
 */
@Component({
  selector: 'ngu-date-range',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ngu-date-range', '(focusout)': 'onFocusOut($event)', '[class.ngu-unstyled]': "look().theme === 'none'" },
  template: `
    <span class="ngu-date-range__end">
      <label class="ngu-date-range__label" [class]="look().classes.label" [for]="id()">{{ fromLabel() }}</label>
      <input
        [class]="look().classes.control"
        type="date"
        [id]="id()"
        [value]="text().from"
        [attr.min]="bounds().min"
        [attr.max]="text().to || bounds().max"
        [disabled]="disabled()"
        [readOnly]="readonly()"
        [attr.required]="required() ? '' : null"
        [attr.aria-invalid]="errorShown() ? 'true' : null"
        [attr.aria-describedby]="describedBy() ?? null"
        (input)="set('from', $event)"
      />
    </span>
    <span class="ngu-date-range__end">
      <label class="ngu-date-range__label" [class]="look().classes.label" [for]="id() + '-to'">{{ toLabel() }}</label>
      <input
        [class]="look().classes.control"
        type="date"
        [id]="id() + '-to'"
        [value]="text().to"
        [attr.min]="text().from || bounds().min"
        [attr.max]="bounds().max"
        [disabled]="disabled()"
        [readOnly]="readonly()"
        [attr.required]="required() ? '' : null"
        [attr.aria-invalid]="errorShown() ? 'true' : null"
        [attr.aria-describedby]="describedBy() ?? null"
        (input)="set('to', $event)"
      />
    </span>
  `,
  styles: `
    :host(:not(.ngu-unstyled)) {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
      gap: 0.5rem 0.75rem;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-date-range__end {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      min-inline-size: 0;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-date-range__label {
      font-size: 0.8125rem;
      color: var(--ngu-hint-color, #6b6b6b);
    }
    :host(:where(:not(.ngu-unstyled))) input {
      font: inherit;
      padding: var(--ngu-input-padding, var(--_ngu-input-padding, 0.5rem 0.75rem));
      border: 1px solid var(--ngu-border-color, #c7c7c7);
      border-radius: var(--ngu-radius, 0.375rem);
      background: var(--ngu-input-bg, transparent);
      color: inherit;
      inline-size: 100%;
      box-sizing: border-box;
    }
    :host(:where(:not(.ngu-unstyled))) input[aria-invalid='true'] {
      border-color: var(--ngu-error-color, #c62828);
    }
    :host(:where(:not(.ngu-unstyled))) input[readonly] {
      background: var(--ngu-readonly-bg, rgba(127, 127, 127, 0.08));
    }
    :host(:where(:not(.ngu-unstyled))) input:focus-visible {
      outline: 2px solid var(--ngu-focus-color, #1a73e8);
      outline-offset: 1px;
    }
    @media (forced-colors: active) {
      :host(:where(:not(.ngu-unstyled))) input[aria-invalid='true'] {
        border-width: 2px;
      }
    }
  `,
})
export class NguDateRange {
  protected readonly look = injectNguLook();
  readonly value = model<Range>({ from: null, to: null });
  readonly touch = output<void>();
  readonly disabled = input(false);
  readonly readonly = input(false);
  readonly required = input(false);
  readonly def = input.required<LeafDef>();
  readonly id = input.required<string>();
  readonly errorShown = input(false);
  readonly describedBy = input<string | undefined>();
  readonly i18n = input<NguI18n>(injectNguI18n());

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  protected readonly fromLabel = computed(
    () => this.i18n().text(this.def().fromLabel) ?? this.i18n().message('dateFrom'),
  );
  protected readonly toLabel = computed(
    () => this.i18n().text(this.def().toLabel) ?? this.i18n().message('dateTo'),
  );
  protected readonly bounds = computed(() => ({
    min: isoDate(this.def().min as Date | string | undefined),
    max: isoDate(this.def().max as Date | string | undefined),
  }));
  protected readonly text = computed(() => {
    const range = this.value() ?? { from: null, to: null };
    return {
      from: isoDate(range.from ?? undefined) ?? '',
      to: isoDate(range.to ?? undefined) ?? '',
    };
  });

  /** ISO strings when the model already holds strings, else `Date` values. */
  private readonly usesStrings = computed(() => {
    const range = this.value();
    return typeof range?.from === 'string' || typeof range?.to === 'string';
  });

  protected set(end: 'from' | 'to', event: Event): void {
    const text = (event.target as HTMLInputElement).value;
    const next: End = this.usesStrings()
      ? text
      : text
        ? (toDate(`${text}T00:00:00Z`) ?? null)
        : null;
    const current = this.value() ?? { from: null, to: null };
    const before = current[end];
    if (
      next === before ||
      (isDate(next) && isDate(before) && next.getTime() === before.getTime())
    ) {
      return;
    }
    this.value.set({ ...current, [end]: next });
  }

  protected onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget;
    if (!(next instanceof Node) || !this.host.contains(next)) {
      this.touch.emit();
    }
  }

  focus(options?: FocusOptions): void {
    this.host.querySelector('input')?.focus(options);
  }
}
