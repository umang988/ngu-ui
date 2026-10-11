import { Directive, ElementRef, inject, model, output } from '@angular/core';

/**
 * Makes a native checkbox a Signal Forms custom control for a `Date | null` value: ticking it
 * stores the time of acceptance, unticking stores `null`. Required, disabled and name still
 * reach the element through `[formField]`.
 */
@Directive({
  selector: 'input[type=checkbox][nguConsent]',
  host: {
    '[checked]': 'value() != null',
    '(change)': 'onChange()',
    '(blur)': 'touch.emit()',
  },
})
export class NguConsent {
  readonly value = model<Date | null>(null);
  readonly touch = output<void>();

  private readonly el = inject<ElementRef<HTMLInputElement>>(ElementRef).nativeElement;

  protected onChange(): void {
    this.value.set(this.el.checked ? new Date() : null);
  }

  focus(options?: FocusOptions): void {
    this.el.focus(options);
  }
}
