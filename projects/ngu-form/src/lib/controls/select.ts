import {
  afterRenderEffect,
  Directive,
  ElementRef,
  inject,
  input,
  model,
  output,
} from '@angular/core';
import type { Choice } from '../types';
import { sameChoice } from './choice';

/**
 * Makes a native `<select>` a Signal Forms custom control that writes the option's own value,
 * so number options stay numbers. With `multiple`, the value is the list of chosen values in
 * option order. Options are rendered with their index as `value`. Disabled, required and
 * name still reach the element through `[formField]`.
 */
@Directive({
  selector: 'select[nguSelect]',
  host: {
    '(change)': 'onChange()',
    '(blur)': 'touch.emit()',
  },
})
export class NguSelect {
  readonly value = model<unknown>(null);
  readonly touch = output<void>();
  readonly choices = input.required<readonly Choice<unknown>[]>({ alias: 'nguSelect' });

  private readonly el = inject<ElementRef<HTMLSelectElement>>(ElementRef).nativeElement;

  constructor() {
    // After render, so the options for a new list exist before one is selected.
    afterRenderEffect({
      write: () => {
        const value = this.value();
        const choices = this.choices();
        for (const option of Array.from(this.el.options)) {
          const choice = option.value === '' ? undefined : choices[Number(option.value)];
          option.selected = choice
            ? this.el.multiple
              ? Array.isArray(value) && value.some((v) => sameChoice(v, choice.value))
              : sameChoice(value, choice.value)
            : !this.el.multiple &&
              !choices.some((c) => sameChoice(value, c.value)) &&
              option.value === '';
        }
        if (!this.el.multiple && !Array.from(this.el.options).some((o) => o.selected)) {
          this.el.selectedIndex = -1;
        }
      },
    });
  }

  protected onChange(): void {
    const choices = this.choices();
    const picked = Array.from(this.el.selectedOptions)
      .filter((o) => o.value !== '')
      .map((o) => choices[Number(o.value)])
      .filter((c): c is Choice<unknown> => c !== undefined)
      .map((c) => c.value);
    if (this.el.multiple) {
      this.value.set(picked);
    } else if (picked.length) {
      this.value.set(picked[0]);
    }
  }

  focus(options?: FocusOptions): void {
    this.el.focus(options);
  }
}
