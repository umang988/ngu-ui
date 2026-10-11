import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  linkedSignal,
  model,
  output,
  signal,
  untracked,
} from '@angular/core';
import { safeLocale } from '../internal';
import { injectNguI18n, type NguI18n } from '../messages';
import { PHONE_COUNTRIES, phoneCountry, splitPhone, toE164, type PhoneCountry } from '../phone';

interface CountryOption extends PhoneCountry {
  readonly name: string;
}

const namesCache = new Map<string, Intl.DisplayNames | null>();

function regionNames(locale: string): Intl.DisplayNames | null {
  let names = namesCache.get(locale);
  if (names === undefined) {
    try {
      names = new Intl.DisplayNames([locale], { type: 'region' });
    } catch {
      names = null;
    }
    namesCache.set(locale, names);
  }
  return names;
}

/**
 * A country picker and a number input for an E.164 value such as `'+919876543210'`. Typing
 * or pasting a number that starts with `+` or `00` picks its country; a leading trunk `0`
 * is dropped. Country names come from `Intl.DisplayNames` in the form's language.
 */
@Component({
  selector: 'ngu-phone',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ngu-phone',
    '[class.ngu-phone--invalid]': 'errorShown()',
    '(focusout)': 'onFocusOut($event)',
  },
  template: `
    <select
      class="ngu-phone__country"
      [attr.aria-label]="i18n().message('countryCode')"
      [disabled]="disabled() || readonly()"
      (change)="pick($event)"
    >
      @for (c of options(); track c.code) {
        <option [value]="c.code" [selected]="c.code === country().code">
          {{ c.name }} +{{ c.dial }}
        </option>
      }
    </select>
    <input
      type="tel"
      class="ngu-phone__number"
      [id]="id()"
      [value]="text()"
      [placeholder]="placeholder() ?? ''"
      [disabled]="disabled()"
      [readOnly]="readonly()"
      [attr.required]="required() ? '' : null"
      [attr.autocomplete]="autocomplete() ?? 'tel'"
      [attr.aria-invalid]="errorShown() ? 'true' : null"
      [attr.aria-describedby]="describedBy() ?? null"
      dir="ltr"
      (input)="onInput($event)"
    />
  `,
  styles: `
    :host {
      display: flex;
      min-inline-size: 0;
      border: 1px solid var(--ngu-border-color, #c7c7c7);
      border-radius: var(--ngu-radius, 0.375rem);
      background: var(--ngu-input-bg, transparent);
    }
    :host(.ngu-phone--invalid) {
      border-color: var(--ngu-error-color, #c62828);
    }
    select,
    input {
      font: inherit;
      color: inherit;
      background: transparent;
      border: 0;
      padding: var(--ngu-input-padding, 0.5rem 0.75rem);
      min-inline-size: 0;
    }
    select {
      flex: 0 1 auto;
      max-inline-size: 45%;
      border-inline-end: 1px solid var(--ngu-border-color, #c7c7c7);
    }
    input {
      flex: 1 1 auto;
    }
    /* Numbers stay left to right; aligned to the start in RTL forms. */
    input:dir(rtl) {
      text-align: right;
    }
    select:focus-visible,
    input:focus-visible {
      outline: 2px solid var(--ngu-focus-color, #1a73e8);
      outline-offset: -2px;
      border-radius: var(--ngu-radius, 0.375rem);
    }
    @media (forced-colors: active) {
      :host(.ngu-phone--invalid) {
        border-width: 2px;
      }
    }
  `,
})
export class NguPhone {
  readonly value = model<string>('');
  readonly touch = output<void>();
  readonly disabled = input(false);
  readonly readonly = input(false);
  readonly required = input(false);
  readonly id = input.required<string>();
  readonly placeholder = input<string>();
  readonly autocomplete = input<string>();
  /** ISO codes offered, in order. */
  readonly countries = input<readonly string[]>();
  /** Country picked while the value is empty. */
  readonly defaultCountry = input<string>();
  readonly errorShown = input(false);
  readonly describedBy = input<string | undefined>();
  readonly i18n = input<NguI18n>(injectNguI18n());

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  protected readonly options = computed<readonly CountryOption[]>(() => {
    const locale = safeLocale(this.i18n().locale());
    const names = regionNames(locale);
    const name = (code: string) => names?.of(code) ?? code;
    const listed = this.countries();
    if (listed?.length) {
      return listed
        .map((code) => phoneCountry(code))
        .filter((c): c is PhoneCountry => !!c)
        .map((c) => ({ ...c, name: name(c.code) }));
    }
    const collator = new Intl.Collator(locale);
    return PHONE_COUNTRIES.map((c) => ({ ...c, name: name(c.code) })).sort((a, b) =>
      collator.compare(a.name, b.name),
    );
  });

  /** The chosen country; follows the value when it changes from outside. */
  protected readonly country = linkedSignal<PhoneCountry>(() =>
    untracked(() => this.initialCountry()),
  );
  /** The national number as typed. */
  protected readonly text = signal('');

  constructor() {
    // Show values written by code (initial value, reset, patch) as country plus national number.
    effect(() => {
      const value = this.value() ?? '';
      untracked(() => {
        if (value === toE164(this.country(), this.text())) {
          return;
        }
        const split = value ? splitPhone(value, this.options(), this.country().code) : undefined;
        if (split) {
          this.country.set(split.country);
          this.text.set(split.national);
        } else {
          this.text.set('');
        }
      });
    });
  }

  private initialCountry(): PhoneCountry {
    const options = this.options();
    const fromValue = this.value() ? splitPhone(this.value(), options)?.country : undefined;
    if (fromValue) {
      return fromValue;
    }
    const wanted = this.defaultCountry() ?? localeRegion(this.i18n().locale());
    return (
      options.find((c) => c.code === wanted?.toUpperCase()) ?? options[0] ?? PHONE_COUNTRIES[0]
    );
  }

  protected pick(event: Event): void {
    const country = phoneCountry((event.target as HTMLSelectElement).value);
    if (!country) {
      return;
    }
    this.country.set(country);
    this.write();
  }

  protected onInput(event: Event): void {
    const el = event.target as HTMLInputElement;
    let typed = el.value;
    // An international number picks its own country.
    const international = /^\s*(\+|00)/.exec(typed);
    if (international) {
      const split = splitPhone(
        typed.slice(international[0].length),
        this.options(),
        this.country().code,
      );
      if (split) {
        this.country.set(split.country);
        typed = split.national;
        el.value = typed;
      }
    }
    this.text.set(typed);
    this.write();
  }

  private write(): void {
    const next = toE164(this.country(), this.text());
    if (next !== this.value()) {
      this.value.set(next);
    }
  }

  protected onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget;
    if (!(next instanceof Node) || !this.host.contains(next)) {
      this.touch.emit();
    }
  }

  focus(options?: FocusOptions): void {
    this.host.querySelector<HTMLInputElement>('input')?.focus(options);
  }
}

/** The region of a locale such as `en-IN`, or the likely one for `hi`. */
function localeRegion(locale: string): string | undefined {
  try {
    return new Intl.Locale(safeLocale(locale)).maximize().region;
  } catch {
    return undefined;
  }
}
