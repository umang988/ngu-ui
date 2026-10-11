import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { FormField, type Field } from '@angular/forms/signals';
import { codeTransform, NguTransform } from '../transform';
import type { EnterKeyHint } from '../types';

/**
 * A one-time code shown as separate boxes. Underneath is a single input with
 * `autocomplete="one-time-code"`, so SMS codes autofill on phones, a pasted "123-456" fills
 * every box, and screen readers meet one ordinary text field.
 */
@Component({
  selector: 'ngu-otp',
  imports: [FormField, NguTransform],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ngu-otp', '[style.--ngu-otp-length]': 'length()' },
  template: `
    <input
      type="text"
      [nguTransform]="transform()"
      [id]="id()"
      autocomplete="one-time-code"
      [attr.inputmode]="alphanumeric() ? 'text' : 'numeric'"
      [attr.autocapitalize]="alphanumeric() ? 'characters' : null"
      [attr.enterkeyhint]="enterkeyhint() ?? null"
      spellcheck="false"
      dir="ltr"
      [formField]="field()"
      [attr.aria-invalid]="errorShown() ? 'true' : null"
      [attr.aria-describedby]="describedBy() ?? null"
      (focus)="focused.set(true)"
      (blur)="focused.set(false)"
    />
    <span class="ngu-otp__boxes" aria-hidden="true">
      @for (ch of slots(); track $index) {
        <span
          class="ngu-otp__box"
          [class.ngu-otp__box--active]="focused() && $index === active()"
          >{{ ch }}</span
        >
      }
    </span>
  `,
  styles: `
    :host {
      position: relative;
      display: inline-block;
      direction: ltr;
      max-inline-size: 100%;
    }
    .ngu-otp__boxes {
      display: flex;
      gap: 0.5rem;
    }
    .ngu-otp__box {
      display: grid;
      place-items: center;
      inline-size: 2.5rem;
      block-size: 3rem;
      border: 1px solid var(--ngu-border-color, #c7c7c7);
      border-radius: var(--ngu-radius, 0.375rem);
      background: var(--ngu-input-bg, transparent);
      font-family: var(--ngu-mono, ui-monospace, monospace);
      font-size: 1.25rem;
      font-weight: 600;
    }
    .ngu-otp__box--active {
      outline: 2px solid var(--ngu-focus-color, #1a73e8);
      outline-offset: 1px;
    }
    :host:has(input[aria-invalid='true']) .ngu-otp__box {
      border-color: var(--ngu-error-color, #c62828);
    }
    /* The real input lies over the boxes, invisible, and takes every tap, key and paste. */
    input {
      position: absolute;
      inset: 0;
      inline-size: 100%;
      margin: 0;
      padding: 0;
      border: 0;
      background: transparent;
      color: transparent;
      caret-color: transparent;
      /* 16px or more, or iOS zooms the page on focus. */
      font-size: 16px;
      outline: none;
    }
    input::selection {
      background: transparent;
    }
    @media (max-width: 22rem) {
      .ngu-otp__boxes {
        gap: 0.25rem;
      }
      .ngu-otp__box {
        inline-size: 2rem;
      }
    }
    @media (forced-colors: active) {
      .ngu-otp__box--active {
        outline-color: Highlight;
      }
    }
  `,
})
export class NguOtp {
  readonly field = input.required<Field<string>>();
  readonly id = input.required<string>();
  readonly length = input(6);
  readonly alphanumeric = input(false);
  readonly enterkeyhint = input<EnterKeyHint>();
  readonly errorShown = input(false);
  readonly describedBy = input<string | undefined>();

  protected readonly focused = signal(false);
  protected readonly transform = computed(() => codeTransform(this.length(), this.alphanumeric()));
  private readonly value = computed(() => {
    const v = this.field()().value();
    return typeof v === 'string' ? v : '';
  });
  protected readonly slots = computed(() =>
    Array.from({ length: this.length() }, (_, i) => this.value()[i] ?? ''),
  );
  /** The box the next character goes into. */
  protected readonly active = computed(() => Math.min(this.value().length, this.length() - 1));
}
