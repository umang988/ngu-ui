import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { FormField, type Field } from '@angular/forms/signals';
import { injectNguLook } from '../look';

/** A native color picker with its hex value shown next to it. */
@Component({
  selector: 'ngu-color',
  imports: [FormField],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ngu-color', '[class.ngu-unstyled]': "look().theme === 'none'" },
  template: `
    <input
      type="color"
      [id]="id()"
      [formField]="field()"
      [attr.aria-invalid]="errorShown() ? 'true' : null"
      [attr.aria-describedby]="describedBy() ?? null"
    />
    <span class="ngu-color__value" aria-hidden="true">{{ value() }}</span>
  `,
  styles: `
    :host(:not(.ngu-unstyled)) {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    :host(:where(:not(.ngu-unstyled))) input {
      inline-size: 3rem;
      block-size: 2.375rem;
      padding: 0.1875rem;
      border: 1px solid var(--ngu-border-color, #c7c7c7);
      border-radius: var(--ngu-radius, 0.375rem);
      background: var(--ngu-input-bg, transparent);
      cursor: pointer;
    }
    :host(:where(:not(.ngu-unstyled))) input[aria-invalid='true'] {
      border-color: var(--ngu-error-color, #c62828);
    }
    :host(:where(:not(.ngu-unstyled))) input:focus-visible {
      outline: 2px solid var(--ngu-focus-color, #1a73e8);
      outline-offset: 1px;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-color__value {
      font-family: var(--ngu-mono, ui-monospace, monospace);
      font-size: 0.875rem;
      text-transform: uppercase;
    }
  `,
})
export class NguColor {
  protected readonly look = injectNguLook();
  readonly field = input.required<Field<string>>();
  readonly id = input.required<string>();
  readonly errorShown = input(false);
  readonly describedBy = input<string | undefined>();

  protected readonly value = computed(() => this.field()().value());
}
