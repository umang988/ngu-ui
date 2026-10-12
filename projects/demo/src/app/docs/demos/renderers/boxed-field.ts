import { Component, input } from '@angular/core';
import { FormField } from '@angular/forms/signals';
import type { NguFieldRenderContext } from 'ngu-form';

/** A whole-field renderer: label, control and message, from the context ngu-form resolves. */
@Component({
  selector: 'demo-boxed-field',
  imports: [FormField],
  template: `
    @let c = context();
    <div class="boxed" [class.boxed--error]="c.showErrors">
      <label class="boxed__label" [for]="c.id"
        >{{ c.label }}
        @if (c.required) {
          <span aria-hidden="true"> *</span>
        }
      </label>
      <input
        class="boxed__input"
        [id]="c.id"
        [formField]="c.field"
        [placeholder]="c.placeholder"
        [attr.aria-describedby]="c.error || c.hint ? c.id + '-msg' : null"
        [attr.aria-invalid]="c.showErrors || null"
      />
      @if (c.error) {
        <p class="boxed__message boxed__message--error" [id]="c.id + '-msg'">{{ c.error }}</p>
      } @else if (c.hint) {
        <p class="boxed__message" [id]="c.id + '-msg'">{{ c.hint }}</p>
      }
    </div>
  `,
  styles: `
    .boxed {
      display: grid;
      gap: 0.25rem;
      padding: 0.5rem 0.75rem 0.625rem;
      border: 2px solid var(--rule);
      border-radius: 0.75rem;
      background: var(--surface);
    }
    .boxed:focus-within {
      border-color: var(--brand);
    }
    .boxed--error {
      border-color: var(--ngu-error-color);
    }
    .boxed__label {
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--ink-2);
    }
    .boxed__input {
      font: inherit;
      border: 0;
      padding: 0;
      background: none;
      color: inherit;
      outline: none;
    }
    .boxed__message {
      margin: 0;
      font-size: 0.8125rem;
      color: var(--ink-2);
    }
    .boxed__message--error {
      color: var(--ngu-error-color);
    }
  `,
})
export class BoxedField {
  readonly context = input.required<NguFieldRenderContext>();
}
