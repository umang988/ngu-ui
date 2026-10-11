import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { FormField, type Field } from '@angular/forms/signals';

/** A native color picker with its hex value shown next to it. */
@Component({
  selector: 'ngu-color',
  imports: [FormField],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ngu-color' },
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
    :host {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    input {
      inline-size: 3rem;
      block-size: 2.375rem;
      padding: 0.1875rem;
      border: 1px solid var(--ngu-border-color, #c7c7c7);
      border-radius: var(--ngu-radius, 0.375rem);
      background: var(--ngu-input-bg, transparent);
      cursor: pointer;
    }
    input[aria-invalid='true'] {
      border-color: var(--ngu-error-color, #c62828);
    }
    input:focus-visible {
      outline: 2px solid var(--ngu-focus-color, #1a73e8);
      outline-offset: 1px;
    }
    .ngu-color__value {
      font-family: var(--ngu-mono, ui-monospace, monospace);
      font-size: 0.875rem;
      text-transform: uppercase;
    }
  `,
})
export class NguColor {
  readonly field = input.required<Field<string>>();
  readonly id = input.required<string>();
  readonly errorShown = input(false);
  readonly describedBy = input<string | undefined>();

  protected readonly value = computed(() => this.field()().value());
}
