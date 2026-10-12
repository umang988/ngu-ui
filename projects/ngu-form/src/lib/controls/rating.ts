import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { injectNguI18n, type NguI18n } from '../messages';
import { SR_ONLY } from './choice';
import { injectNguLook } from '../look';

let nextName = 0;

/**
 * A star rating as native radios, so arrow keys and screen readers work as for any radio
 * group. The value is the number of stars, `0` for none. Clicking the chosen star again
 * clears the rating unless the field is required.
 */
@Component({
  selector: 'ngu-rating',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.ngu-unstyled]': "look().theme === 'none'",
    class: 'ngu-rating',
    '(focusout)': 'onFocusOut($event)',
    '(pointerleave)': 'hover.set(0)',
  },
  template: `
    @for (star of stars(); track star) {
      <label
        class="ngu-star"
        [class.ngu-star--on]="star <= shown()"
        (pointerenter)="hover.set(disabled() || readonly() ? 0 : star)"
        (click)="onLabelClick(star, $event)"
      >
        <input
          type="radio"
          class="ngu-sr-only"
          [attr.name]="groupName"
          [checked]="star === value()"
          [disabled]="disabled()"
          [attr.required]="required() ? '' : null"
          [attr.aria-describedby]="describedBy() ?? null"
          (click)="onInputClick($event)"
          (change)="value.set(star)"
        />
        <span class="ngu-star__mark" aria-hidden="true">{{ star <= shown() ? '★' : '☆' }}</span>
        <span class="ngu-sr-only">{{ i18n().message('ratingStar', { count: star }) }}</span>
      </label>
    }
  `,
  styles: `
    :host(:not(.ngu-unstyled)) {
      display: inline-flex;
      gap: 0.125rem;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-star {
      position: relative;
      display: inline-grid;
      place-items: center;
      inline-size: 2rem;
      block-size: 2rem;
      border-radius: var(--ngu-radius, 0.375rem);
      font-size: 1.5rem;
      line-height: 1;
      color: var(--ngu-hint-color, #6b6b6b);
      cursor: pointer;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-star--on {
      color: var(--ngu-rating-color, #b25f00);
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-star:has(input:focus-visible) {
      outline: 2px solid var(--ngu-focus-color, #1a73e8);
      outline-offset: 1px;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-star:has(input:disabled) {
      cursor: default;
    }
    ${SR_ONLY}
  `,
})
export class NguRating {
  protected readonly look = injectNguLook();
  readonly value = model<number>(0);
  readonly touch = output<void>();
  readonly disabled = input(false);
  readonly readonly = input(false);
  readonly required = input(false);
  /** Number of stars. */
  readonly count = input(5);
  readonly describedBy = input<string | undefined>();
  readonly i18n = input<NguI18n>(injectNguI18n());

  protected readonly groupName = `ngu-rating-${nextName++}`;
  protected readonly hover = signal(0);
  protected readonly stars = computed(() =>
    Array.from({ length: Math.max(1, this.count()) }, (_, i) => i + 1),
  );
  /** Stars filled: the hovered one while pointing, else the value. */
  protected readonly shown = computed(() => this.hover() || this.value() || 0);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /** Read-only ratings cannot change, which native radios do not support. */
  protected onInputClick(event: Event): void {
    if (this.readonly()) {
      event.preventDefault();
    }
  }

  /**
   * A pointer click on the chosen star clears it. Handled on the label, before the radio is
   * activated; keyboard selection never reaches here.
   */
  protected onLabelClick(star: number, event: MouseEvent): void {
    if (
      event.target instanceof HTMLInputElement ||
      this.readonly() ||
      this.disabled() ||
      this.required()
    ) {
      return;
    }
    if (star === this.value()) {
      event.preventDefault();
      this.value.set(0);
      this.hover.set(0);
    }
  }

  protected onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget;
    if (!(next instanceof Node) || !this.host.contains(next)) {
      this.touch.emit();
    }
  }

  focus(options?: FocusOptions): void {
    const inputs = Array.from(this.host.querySelectorAll<HTMLInputElement>('input'));
    (inputs.find((i) => i.checked) ?? inputs[0])?.focus(options);
  }
}
