import { DestroyRef, Directive, effect, ElementRef, inject, input, untracked } from '@angular/core';
import { NG_VALUE_ACCESSOR, NgControl, type AbstractControl, type ControlValueAccessor } from '@angular/forms';
import type { Field } from '@angular/forms/signals';

const UNSET = Symbol();

/**
 * A stand-in `NgControl` for controls that look one up: PrimeNG's radio buttons register with
 * it, and some components hand it their accessor (`ngControl.valueAccessor = this`). It has no
 * reactive-forms control behind it.
 */
class NguBindControl extends NgControl {
  override get control(): AbstractControl | null {
    return null;
  }
  override viewToModelUpdate(): void {}
}

/**
 * Connects a field to a control that implements `ControlValueAccessor` (most design-system
 * components), or to a plain `<input>` or `<textarea>`, without `[formField]`. Unlike
 * `[formField]`, it leaves the control's `invalid`, `required` and similar inputs alone, so a
 * renderer can show the error state when ngu-form shows the error.
 *
 * ```html
 * <p-select [nguBind]="context().field" [invalid]="context().showErrors" ... />
 * ```
 *
 * `nguBindFormat` and `nguBindParse` convert between the model value and the control's, for
 * example a consent date and a checkbox's `true`.
 */
@Directive({
  selector: '[nguBind]',
  // A factory without dependencies: a control that injects NgControl must not wait for this directive.
  providers: [{ provide: NgControl, useFactory: () => new NguBindControl() }],
})
export class NguBind {
  readonly field = input.required<Field<any>>({ alias: 'nguBind' });
  /** Model value to control value. */
  readonly format = input<(value: any) => unknown>((v) => v, { alias: 'nguBindFormat' });
  /** Control value to model value. */
  readonly parse = input<(value: any) => unknown>((v) => v, { alias: 'nguBindParse' });

  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly accessor: ControlValueAccessor =
    inject(NG_VALUE_ACCESSOR, { self: true, optional: true })?.[0] ??
    inject(NgControl, { self: true }).valueAccessor ??
    nativeAccessor(this.element);

  constructor() {
    /** The model value last written by the control, so it is not written back. */
    let fromControl: unknown = UNSET;
    this.accessor.registerOnChange((value: unknown) => {
      const state = this.field()();
      const parsed = this.parse()(value);
      fromControl = parsed;
      state.value.set(parsed);
      state.markAsDirty();
    });
    this.accessor.registerOnTouched(() => this.field()().markAsTouched());

    effect(() => {
      const value = this.field()().value();
      const format = this.format();
      if (Object.is(value, fromControl)) {
        return;
      }
      fromControl = UNSET;
      untracked(() => this.accessor.writeValue(format(value)));
    });
    effect(() => {
      const state = this.field()();
      const disabled = state.disabled();
      untracked(() => this.accessor.setDisabledState?.(disabled));
    });
    effect(() => {
      const readonly = this.field()().readonly();
      if (this.element instanceof HTMLInputElement || this.element instanceof HTMLTextAreaElement) {
        this.element.readOnly = readonly;
      }
    });
    inject(DestroyRef).onDestroy(() => {
      this.accessor.registerOnChange(() => undefined);
      this.accessor.registerOnTouched(() => undefined);
    });
  }
}

/** The accessor of a plain input or textarea: text in, text out. */
function nativeAccessor(element: HTMLElement): ControlValueAccessor {
  if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) {
    throw new Error('ngu-form: nguBind needs a ControlValueAccessor, an <input> or a <textarea>.');
  }
  let onChange: (value: unknown) => void = () => undefined;
  let onTouched: () => void = () => undefined;
  element.addEventListener('input', () => onChange(element.value));
  element.addEventListener('blur', () => onTouched());
  return {
    writeValue: (value: unknown) => {
      element.value = value == null ? '' : String(value);
    },
    registerOnChange: (fn) => (onChange = fn),
    registerOnTouched: (fn) => (onTouched = fn),
    setDisabledState: (disabled) => (element.disabled = disabled),
  };
}
