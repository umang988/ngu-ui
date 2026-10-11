import { Directive, effect, ElementRef, inject, input, model, output, untracked } from '@angular/core';
import { transformedValue } from '@angular/forms/signals';
import { deepEqual, safeLocale } from './internal';

// ---------------------------------------------------------------------------
// Digits
// ---------------------------------------------------------------------------

/** First code point of each decimal digit block people commonly type in. */
const DIGIT_ZEROS = [
  0x0660, // Arabic-Indic
  0x06f0, // Extended Arabic-Indic (Persian, Urdu)
  0x0966, // Devanagari
  0x09e6, // Bengali
  0x0a66, // Gurmukhi
  0x0ae6, // Gujarati
  0x0b66, // Oriya
  0x0be6, // Tamil
  0x0c66, // Telugu
  0x0ce6, // Kannada
  0x0d66, // Malayalam
  0x0e50, // Thai
  0x0ed0, // Lao
  0x0f20, // Tibetan
  0x1040, // Myanmar
  0x17e0, // Khmer
  0x1810, // Mongolian
  0xff10, // Fullwidth
];

/** Replaces digits from other scripts (٣, ३, ３) with ASCII digits. */
export function asciiDigits(text: string): string {
  return text.replace(/\p{Nd}/gu, (d) => {
    const code = d.codePointAt(0)!;
    if (code >= 0x30 && code <= 0x39) {
      return d;
    }
    const zero = DIGIT_ZEROS.find((z) => code >= z && code <= z + 9);
    return zero === undefined ? d : String(code - zero);
  });
}

// ---------------------------------------------------------------------------
// Masks
// ---------------------------------------------------------------------------

const SLOTS: Readonly<Record<string, RegExp>> = { '0': /^[0-9]$/, a: /^\p{L}$/u, '*': /^[\p{L}0-9]$/u };

const isSlot = (ch: string) => ch in SLOTS;

/** Number of characters a mask takes. */
export function maskLength(mask: string): number {
  return [...mask].filter(isSlot).length;
}

/** The literal text before the first slot, such as `+1 (` or `8 (`. */
function leadingLiterals(mask: string): string {
  let lead = '';
  for (const ch of mask) {
    if (isSlot(ch)) {
      break;
    }
    lead += ch;
  }
  return lead;
}

/**
 * The characters of `text` that fill the mask's slots, in order. Literals typed where the
 * mask has them are skipped, so formatted text reads back to the same value. The mask's
 * leading literals are skipped only when the text starts with all of them, so a `8 (000)`
 * mask still accepts 8 as the first typed digit.
 */
export function unmask(text: string, mask: string): string {
  const pattern = [...mask];
  const lead = leadingLiterals(mask);
  let chars = asciiDigits(text);
  if (lead && chars.startsWith(lead)) {
    chars = chars.slice(lead.length);
  }
  let out = '';
  let m = lead.length;
  for (const ch of chars) {
    if (m < pattern.length && !isSlot(pattern[m]) && pattern[m] === ch) {
      m++;
      continue;
    }
    while (m < pattern.length && !isSlot(pattern[m])) {
      m++;
    }
    if (m >= pattern.length) {
      break;
    }
    if (SLOTS[pattern[m]].test(ch)) {
      out += ch;
      m++;
    }
  }
  return out;
}

/** The characters of a stored value that fit the mask's slots, ignoring any formatting. */
function fitSlots(value: string, mask: string): string {
  const slots = [...mask].filter(isSlot);
  let out = '';
  for (const ch of asciiDigits(value)) {
    if (out.length >= slots.length) {
      break;
    }
    if (SLOTS[slots[out.length]].test(ch)) {
      out += ch;
    }
  }
  return out;
}

/** Places `value` into the mask. Literals show only up to the last typed character. */
export function applyMask(value: string, mask: string): string {
  let out = '';
  let v = 0;
  for (const ch of mask) {
    if (v >= value.length) {
      break;
    }
    out += isSlot(ch) ? value[v++] : ch;
  }
  return out;
}

/** Position in masked text just after the `count`-th slot character. */
function maskCaret(mask: string, count: number): number {
  if (count <= 0) {
    return 0;
  }
  const pattern = [...mask];
  let seen = 0;
  for (let i = 0; i < pattern.length; i++) {
    if (isSlot(pattern[i]) && ++seen === count) {
      return i + 1;
    }
  }
  return pattern.length;
}

/** True when a masked value is non-empty but shorter than the mask. */
export function maskIncomplete(value: unknown, mask: string): boolean {
  return typeof value === 'string' && value !== '' && value.length < maskLength(mask);
}

// ---------------------------------------------------------------------------
// Locale numbers
// ---------------------------------------------------------------------------

interface NumberSymbols {
  readonly group: string;
  readonly decimal: string;
  /** Currency signs, units, percent signs and literals the format adds around the number. */
  readonly extras: readonly string[];
  /** Fraction digits the format shows; typed values are rounded to match. */
  readonly maxFractions: number;
}

const symbolCache = new Map<string, NumberSymbols>();

function numberSymbols(locale: string, options: Intl.NumberFormatOptions): NumberSymbols {
  const key = `${locale}|${JSON.stringify(options)}`;
  let symbols = symbolCache.get(key);
  if (!symbols) {
    const parts = new Intl.NumberFormat(locale, { ...options, useGrouping: true, signDisplay: 'auto' }).formatToParts(
      -1234567.891,
    );
    const find = (type: string) => parts.find((p) => p.type === type)?.value;
    symbols = {
      group: find('group') ?? ',',
      decimal: find('decimal') ?? new Intl.NumberFormat(locale).formatToParts(1.5).find((p) => p.type === 'decimal')?.value ?? '.',
      extras: parts
        .filter((p) => ['currency', 'unit', 'percentSign', 'literal'].includes(p.type))
        .map((p) => p.value.trim())
        .filter((v) => v && v !== '(' && v !== ')'),
      maxFractions: new Intl.NumberFormat(locale, options).resolvedOptions().maximumFractionDigits ?? 20,
    };
    symbolCache.set(key, symbols);
  }
  return symbols;
}

/** `localized: true` keeps every fraction digit the user typed. */
export function numberOptions(localized: boolean | Intl.NumberFormatOptions | undefined): Intl.NumberFormatOptions {
  return typeof localized === 'object' ? localized : { maximumFractionDigits: 20 };
}

/** Format options for an amount: the currency's own decimals, or two decimals without one. */
export function currencyOptions(currency: string | undefined): Intl.NumberFormatOptions {
  return currency ? { style: 'currency', currency } : { minimumFractionDigits: 2, maximumFractionDigits: 2 };
}

/** Formats a model number for the locale; `null` and `NaN` show as empty text. */
export function formatLocalNumber(value: unknown, locale: string, options: Intl.NumberFormatOptions): string {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '';
  }
  return new Intl.NumberFormat(safeLocale(locale), options).format(value);
}

/**
 * Reads a number typed in the locale's format: its digits, group and decimal separators.
 * A `.` is accepted as the decimal separator where it is not a group separator, so people on
 * a Latin keyboard can type `12.5` in Arabic or French. Empty text is `null`.
 */
export function parseLocalNumber(text: string, locale: string, options: Intl.NumberFormatOptions = {}): number | null {
  const { group, decimal, extras, maxFractions } = numberSymbols(safeLocale(locale), options);
  let t = asciiDigits(text).replace(/[\s\u00a0\u202f\u200e\u200f\u061c]/g, '');
  // Accounting formats show negatives in parentheses: ($5.00).
  const parenthesized = /^\(.*\)$/.test(t);
  if (parenthesized) {
    t = t.slice(1, -1);
  }
  for (const extra of extras) {
    t = t.split(extra).join('');
  }
  if (group.trim()) {
    t = t.split(group).join('');
  }
  if (decimal !== '.' && group !== '.') {
    t = t.replace('.', decimal);
  }
  if (decimal !== ',' && group !== ',') {
    t = t.split(',').join('');
  }
  t = t.replace(decimal, '.').replace(/^[\u2212\u2013-]/, '-').replace(/^\+/, '');
  if (t === '' || t === '-') {
    return null;
  }
  if (!/^-?(?:\d+\.?\d*|\.\d+)$/.test(t)) {
    throw new Error('');
  }
  let n = Number(t);
  if (parenthesized) {
    n = -Math.abs(n);
  }
  // Store what the field shows: $19.999 reads as $20.00 once formatted, so it is 20.
  if (options.style === 'percent') {
    return maxFractions < 20 ? Number((n / 100).toFixed(Math.min(maxFractions + 2, 100))) : n / 100;
  }
  return maxFractions < 20 ? Number(n.toFixed(maxFractions)) : n;
}

// ---------------------------------------------------------------------------
// The control
// ---------------------------------------------------------------------------

/** How `NguTransform` converts between text and the model value. */
export interface FieldTransform {
  parse(text: string): unknown;
  format(value: unknown): string;
  /** Re-format while typing (masks). Otherwise the text is re-formatted on blur. */
  readonly live?: boolean;
  /** For live formatting: how many value characters precede `caret` in `text`. */
  countBefore?(text: string, caret: number): number;
  /** For live formatting: caret position after `count` value characters in formatted text. */
  caretAfter?(count: number): number;
}

/**
 * Makes a native input a Signal Forms custom control whose model value differs from its text,
 * using Angular's `transformedValue`. Disabled, required, name and min/max still reach the
 * element through `[formField]`.
 */
@Directive({
  selector: 'input[nguTransform], textarea[nguTransform]',
  host: {
    '(input)': 'onInput($event)',
    '(compositionend)': 'onInput($event)',
    '(blur)': 'onBlur()',
  },
})
export class NguTransform {
  readonly value = model<unknown>(null);
  /** Marks the field touched. */
  readonly touch = output<void>();
  readonly transform = input.required<FieldTransform>({ alias: 'nguTransform' });

  private readonly el = inject<ElementRef<HTMLInputElement | HTMLTextAreaElement>>(ElementRef).nativeElement;
  private readonly text = transformedValue(this.value, {
    parse: (text: string) => {
      try {
        return { value: this.transform().parse(text) };
      } catch (e) {
        const message = e instanceof Error && e.message ? e.message : undefined;
        return { error: { kind: 'parse', message } };
      }
    },
    format: (value: unknown) => this.transform().format(value),
  });
  /** Value characters before the caret at the last keystroke, for live formatting. */
  private pendingCaret: number | undefined;

  constructor() {
    effect(() => {
      const text = this.text();
      const value = this.value();
      const t = this.transform();
      untracked(() => this.render(text, value, t));
    });
  }

  protected onInput(event: Event): void {
    // Wait for an input method (Chinese, Japanese, Korean) to finish composing.
    if ((event as InputEvent).isComposing) {
      return;
    }
    const t = this.transform();
    let text = this.el.value;
    if (t.live && t.countBefore) {
      const caret = this.el.selectionStart ?? text.length;
      let count = t.countBefore(text, caret);
      // Backspace or Delete on a literal ("-", ")") would change nothing; remove the value
      // character next to it instead, as people expect.
      const kind = (event as InputEvent).inputType;
      const value = this.value();
      if ((kind === 'deleteContentBackward' || kind === 'deleteContentForward') && typeof value === 'string') {
        const at = kind === 'deleteContentBackward' ? count - 1 : count;
        if (this.readsAs(text, value, t) && at >= 0 && at < value.length) {
          text = t.format(value.slice(0, at) + value.slice(at + 1));
          count = at;
        }
      }
      this.pendingCaret = count;
    }
    this.text.set(text);
    if (t.live) {
      // Render now: a rejected character leaves the signals unchanged, so no effect would run.
      this.render(this.text(), this.value(), t);
    }
  }

  protected onBlur(): void {
    this.touch.emit();
    const t = this.transform();
    if (this.readsAs(this.el.value, this.value(), t)) {
      this.write(t.format(this.value()));
    }
  }

  /** Works inside shadow roots, where the document's activeElement is the shadow host. */
  private focused(): boolean {
    return (this.el.getRootNode() as Document | ShadowRoot).activeElement === this.el;
  }

  private render(text: string, value: unknown, t: FieldTransform): void {
    const focused = this.focused();
    if (t.live) {
      // Masks always show the formatted value, so deleted literals come back.
      const formatted = t.format(value);
      const caret = focused && this.pendingCaret !== undefined ? t.caretAfter?.(this.pendingCaret) : undefined;
      this.pendingCaret = undefined;
      this.write(formatted, caret);
      return;
    }
    // While typing, keep the user's text when it already means the model value ("1,234." or
    // "John "); re-format on blur. Writes from code always show.
    if (focused && this.readsAs(this.el.value, value, t)) {
      return;
    }
    if (focused && this.text.parseErrors().length) {
      return;
    }
    this.write(text);
  }

  private readsAs(text: string, value: unknown, t: FieldTransform): boolean {
    try {
      return deepEqual(t.parse(text), value);
    } catch {
      return false;
    }
  }

  private write(text: string, caret?: number): void {
    if (this.el.value !== text) {
      this.el.value = text;
    }
    if (caret !== undefined && this.focused()) {
      const at = Math.min(caret, text.length);
      this.el.setSelectionRange(at, at);
    }
  }
}

/**
 * Builds the transform for a one-time code: keeps digits (or letters and digits, upper-cased)
 * up to `length`, so a pasted "123-456" or "123 456" becomes "123456".
 */
export function codeTransform(length: number, alphanumeric: boolean): FieldTransform {
  const clean = (text: string) => {
    const ascii = asciiDigits(text);
    const kept = alphanumeric ? ascii.replace(/[^\p{L}0-9]/gu, '').toLocaleUpperCase() : ascii.replace(/[^0-9]/g, '');
    return kept.slice(0, length);
  };
  return {
    live: true,
    parse: clean,
    format: (value) => (typeof value === 'string' ? clean(value) : ''),
    countBefore: (text, caret) => clean(text.slice(0, caret)).length,
    caretAfter: (count) => count,
  };
}

/** Builds the transform for a mask. */
export function maskTransform(mask: string): FieldTransform {
  const lead = leadingLiterals(mask);
  return {
    live: true,
    parse: (text) => unmask(text, mask),
    // The model holds only the typed characters; never re-read them as formatted text.
    format: (value) => applyMask(typeof value === 'string' ? fitSlots(value, mask) : '', mask),
    countBefore: (text, caret) =>
      lead && caret <= lead.length && text.startsWith(lead) ? 0 : unmask(text.slice(0, caret), mask).length,
    caretAfter: (count) => maskCaret(mask, count),
  };
}
