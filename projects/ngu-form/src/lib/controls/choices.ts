import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  model,
  output,
} from '@angular/core';
import type { Choice } from '../types';
import { sameChoice } from './choice';
import { injectNguLook } from '../look';

let nextName = 0;

/**
 * Native radios or checkboxes over a list of options, as one Signal Forms control. Radios
 * write the chosen option's value; checkboxes write the list of checked values in option
 * order. Values keep their type, so number options stay numbers. The surrounding fieldset
 * and legend come from `ngu-field`.
 */
@Component({
  selector: 'ngu-choices',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.ngu-unstyled]': "look().theme === 'none'",
    class: 'ngu-choices',
    '[class.ngu-choices--buttons]': "appearance() === 'buttons'",
    '(focusout)': 'onFocusOut($event)',
  },
  template: `
    @for (c of choices(); track $index) {
      <label
        class="ngu-choice"
        [class]="look().classes.option"
        [class.ngu-choice--checked]="isChecked(c)"
        [class.ngu-choice--disabled]="disabled() || c.disabled"
      >
        <input
          [class]="look().classes.check"
          [type]="kind()"
          [attr.name]="kind() === 'radio' ? groupName : null"
          [checked]="isChecked(c)"
          [disabled]="disabled() || (c.disabled ?? false)"
          [attr.required]="kind() === 'radio' && required() ? '' : null"
          [attr.aria-invalid]="kind() === 'checkbox' && errorShown() ? 'true' : null"
          [attr.aria-describedby]="describedBy() ?? null"
          (click)="onClick($event)"
          (change)="toggle(c, $event)"
        />
        <span class="ngu-choice__label">{{ c.label }}</span>
      </label>
    }
  `,
  styles: `
    :host(:not(.ngu-unstyled)) {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem 1rem;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-choice {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-choice--disabled {
      cursor: default;
      opacity: 0.6;
    }
    :host(:where(:not(.ngu-unstyled))) input:focus-visible {
      outline: 2px solid var(--ngu-focus-color, #1a73e8);
      outline-offset: 2px;
    }
    /* Segmented control: radios as a row of joined buttons. */
    :host(.ngu-choices--buttons:not(.ngu-unstyled)) {
      gap: 0;
      flex-wrap: nowrap;
      inline-size: fit-content;
      max-inline-size: 100%;
      border: 1px solid var(--ngu-border-color, #c7c7c7);
      border-radius: var(--ngu-radius, 0.375rem);
      overflow: hidden;
    }
    :host(.ngu-choices--buttons:not(.ngu-unstyled)) .ngu-choice {
      position: relative;
      gap: 0;
      padding: 0.5rem 0.875rem;
      font-size: 0.875rem;
      font-weight: 500;
      text-align: center;
      background: var(--ngu-input-bg, transparent);
    }
    :host(.ngu-choices--buttons:not(.ngu-unstyled)) .ngu-choice + .ngu-choice {
      border-inline-start: 1px solid var(--ngu-border-color, #c7c7c7);
    }
    :host(.ngu-choices--buttons:not(.ngu-unstyled)) .ngu-choice--checked {
      background: var(--ngu-primary, #1a73e8);
      color: var(--ngu-on-primary, #fff);
    }
    :host(.ngu-choices--buttons:not(.ngu-unstyled)) input {
      position: absolute;
      inset: 0;
      margin: 0;
      opacity: 0;
      cursor: inherit;
    }
    :host(.ngu-choices--buttons:not(.ngu-unstyled)) .ngu-choice:has(input:focus-visible) {
      outline: 2px solid var(--ngu-focus-color, #1a73e8);
      outline-offset: -4px;
    }
    @media (forced-colors: active) {
      :host(.ngu-choices--buttons:not(.ngu-unstyled)) .ngu-choice--checked {
        background: Highlight;
        color: HighlightText;
        forced-color-adjust: none;
      }
    }
  `,
})
export class NguChoices {
  protected readonly look = injectNguLook();
  readonly value = model<unknown>(null);
  readonly touch = output<void>();
  readonly disabled = input(false);
  readonly readonly = input(false);
  readonly required = input(false);
  readonly choices = input.required<readonly Choice<unknown>[]>();
  readonly kind = input<'radio' | 'checkbox'>('radio');
  readonly appearance = input<'list' | 'buttons'>('list');
  /** True while the field shows an error; set on each checkbox, as groups take no `aria-invalid`. */
  readonly errorShown = input(false);
  readonly describedBy = input<string | undefined>();

  protected readonly groupName = `ngu-choice-${nextName++}`;
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  protected isChecked(choice: Choice<unknown>): boolean {
    const value = this.value();
    return this.kind() === 'checkbox'
      ? Array.isArray(value) && value.some((v) => sameChoice(v, choice.value))
      : sameChoice(value, choice.value);
  }

  /** Read-only choices cannot be changed, which native radios and checkboxes do not support. */
  protected onClick(event: Event): void {
    if (this.readonly()) {
      event.preventDefault();
    }
  }

  protected toggle(choice: Choice<unknown>, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (this.kind() === 'radio') {
      if (checked) {
        this.value.set(choice.value);
      }
      return;
    }
    const current = Array.isArray(this.value()) ? (this.value() as unknown[]) : [];
    const kept = this.choices()
      .map((c) => c.value)
      .filter((v) =>
        sameChoice(v, choice.value) ? checked : current.some((x) => sameChoice(x, v)),
      );
    // Values that are not among the options (yet) are kept, after the known ones.
    const unknown = current.filter((x) => !this.choices().some((c) => sameChoice(x, c.value)));
    this.value.set([...kept, ...unknown]);
  }

  protected onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget;
    if (!(next instanceof Node) || !this.host.contains(next)) {
      this.touch.emit();
    }
  }

  focus(options?: FocusOptions): void {
    const inputs = Array.from(
      this.host.querySelectorAll<HTMLInputElement>('input:not([disabled])'),
    );
    (inputs.find((i) => i.checked) ?? inputs[0])?.focus(options);
  }
}
