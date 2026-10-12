import { isSignal } from '@angular/core';
import type { Field } from '@angular/forms/signals';
import { isDate, isPlainObject, NGU_CHOICES, safeLocale, toDate } from './internal';
import { formatTemporal, type NguI18n } from './messages';
import type { Choice, LeafDef } from './types';

/** How one value reads in view mode. */
export interface ViewValue {
  readonly text: string;
  /** Nothing entered; shown as a dash and read as "Not provided". */
  readonly empty?: boolean;
  /** A password: shown as dots and read as "Hidden". */
  readonly secret?: boolean;
  /** Keep line breaks, for textareas. */
  readonly multiline?: boolean;
  /** A drawn signature or an image given as a data URL. */
  readonly image?: string;
  /** A color value, shown with a swatch. */
  readonly color?: string;
}

/** Types whose value is never shown in view mode. */
export const UNVIEWED_TYPES: ReadonlySet<string> = new Set(['captcha']);

/** The text for a field's value in view mode, formatted for the locale. */
export function viewValue(def: LeafDef, field: Field<any>, model: unknown, i18n: NguI18n): ViewValue {
  const value = field().value();
  if (def.display) {
    const text = def.display(value, model);
    return text ? { text: i18n.text(text) } : { text: '', empty: true };
  }
  if (isEmpty(value) || (def.type === 'rating' && value === 0)) {
    return { text: '', empty: true };
  }
  const locale = safeLocale(i18n.locale());
  switch (def.type) {
    case 'password':
      return { text: '••••••••', secret: true };
    case 'textarea':
      return { text: String(value), multiline: true };
    case 'checkbox':
    case 'switch':
      if (!def.multiple) {
        return { text: i18n.message(value ? 'yes' : 'no') };
      }
      return { text: list(labelsOf(def, field, value as readonly unknown[], i18n), locale) };
    case 'select':
    case 'radio':
    case 'segmented':
      return {
        text: def.multiple
          ? list(labelsOf(def, field, value as readonly unknown[], i18n), locale)
          : labelsOf(def, field, [value], i18n)[0],
      };
    case 'consent': {
      const date = toDate(value);
      return date
        ? { text: i18n.message('consentGiven', { date: new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date) }) }
        : { text: '', empty: true };
    }
    case 'date':
      return { text: formatDate(value, locale) };
    case 'time':
    case 'datetime-local':
    case 'month':
    case 'week':
      return { text: formatTemporal(String(value), def.type, locale) };
    case 'daterange': {
      const { from, to } = value as { from: unknown; to: unknown };
      return { text: `${isEmpty(from) ? '…' : formatDate(from, locale)} – ${isEmpty(to) ? '…' : formatDate(to, locale)}` };
    }
    case 'currency':
      return {
        text: new Intl.NumberFormat(
          locale,
          def.currency ? { style: 'currency', currency: def.currency } : { minimumFractionDigits: 2, maximumFractionDigits: 2 },
        ).format(Number(value)),
      };
    case 'rating':
      return { text: i18n.message('ratingValue', { value: Number(value), max: typeof def.max === 'number' ? def.max : 5 }) };
    case 'number':
    case 'range':
      return { text: adorn(def, i18n.number(Number(value), typeof def.localized === 'object' ? def.localized : undefined), i18n) };
    case 'color':
      return { text: String(value), color: String(value) };
    case 'tags':
      return { text: list((value as readonly unknown[]).map(String), locale) };
  }
  return generic(value, locale, def, i18n);
}

/** Custom types and anything else: files by name, image data URLs as images, lists joined. */
function generic(value: unknown, locale: string, def: LeafDef, i18n: NguI18n): ViewValue {
  if (typeof value === 'string') {
    return value.startsWith('data:image/') ? { text: i18n.text(def.label) ?? '', image: value } : { text: adorn(def, value, i18n) };
  }
  if (typeof value === 'number') {
    return { text: adorn(def, i18n.number(value), i18n) };
  }
  if (typeof value === 'boolean') {
    return { text: i18n.message(value ? 'yes' : 'no') };
  }
  if (isDate(value)) {
    return { text: formatDate(value, locale) };
  }
  if (Array.isArray(value)) {
    return { text: list(value.map((v) => one(v, locale)), locale) };
  }
  return { text: one(value, locale) };
}

function one(value: unknown, locale: string): string {
  if (typeof File !== 'undefined' && value instanceof File) {
    return value.name;
  }
  if (isPlainObject(value) && typeof value['name'] === 'string') {
    return value['name']; // an uploaded file reference
  }
  if (isDate(value)) {
    return formatDate(value, locale);
  }
  if (isPlainObject(value)) {
    return Object.values(value)
      .filter((v) => !isEmpty(v))
      .map((v) => one(v, locale))
      .join(', ');
  }
  return value == null ? '' : String(value);
}

function adorn(def: LeafDef, text: string, i18n: NguI18n): string {
  return [i18n.text(def.prefix), text, i18n.text(def.suffix)].filter(Boolean).join(' ');
}

/** Option labels for chosen values; a value without an option shows as itself. */
function labelsOf(def: LeafDef, field: Field<any>, values: readonly unknown[], i18n: NguI18n): string[] {
  const options = def.choices;
  const choices: readonly Choice<unknown>[] =
    typeof options === 'function' && !isSignal(options)
      ? (field().metadata(NGU_CHOICES)?.() ?? [])
      : isSignal(options)
        ? options()
        : ((options as readonly Choice<unknown>[] | undefined) ?? []);
  return values.map((v) => {
    const choice = choices.find((c) => Object.is(c.value, v) || String(c.value) === String(v));
    return choice ? i18n.text(choice.label) : String(v);
  });
}

function list(items: readonly string[], locale: string): string {
  return new Intl.ListFormat(locale, { type: 'conjunction' }).format(items);
}

function formatDate(value: unknown, locale: string): string {
  const date = toDate(value);
  return date ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(date) : String(value ?? '');
}

export function isEmpty(value: unknown): boolean {
  if (value === '' || value == null) {
    return true;
  }
  if (typeof value === 'number') {
    return Number.isNaN(value);
  }
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  if (isPlainObject(value) && 'from' in value && 'to' in value && Object.keys(value).length === 2) {
    return isEmpty(value['from']) && isEmpty(value['to']);
  }
  return false;
}
