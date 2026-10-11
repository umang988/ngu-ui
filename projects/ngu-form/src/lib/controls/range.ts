import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FormField, type Field } from '@angular/forms/signals';

/** A native slider with its value shown next to it. `min`, `max` and `required` come from the field. */
@Component({
  selector: 'ngu-range',
  imports: [FormField],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ngu-range' },
  template: `
    <input
      type="range"
      [id]="id()"
      [attr.step]="step() ?? null"
      [attr.aria-valuetext]="text()"
      [formField]="field()"
      [attr.aria-invalid]="errorShown() ? 'true' : null"
      [attr.aria-describedby]="describedBy() ?? null"
    />
    <span class="ngu-range__value" aria-hidden="true">{{ text() }}</span>
  `,
  styles: `
    :host {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      min-inline-size: 0;
    }
    input {
      flex: 1 1 auto;
      min-inline-size: 0;
      margin: 0;
      accent-color: var(--ngu-primary, #1a73e8);
    }
    input:focus-visible {
      outline: 2px solid var(--ngu-focus-color, #1a73e8);
      outline-offset: 2px;
    }
    .ngu-range__value {
      flex: none;
      min-inline-size: 3ch;
      font-variant-numeric: tabular-nums;
      text-align: end;
    }
  `,
})
export class NguRange {
  readonly field = input.required<Field<number>>();
  readonly id = input.required<string>();
  readonly step = input<number>();
  /** The value as shown and read, with the field's prefix and suffix. */
  readonly text = input('');
  readonly errorShown = input(false);
  readonly describedBy = input<string | undefined>();
}
