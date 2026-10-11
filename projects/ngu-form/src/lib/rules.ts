import {
  maxDateError,
  minDateError,
  requiredError,
  type ValidationError,
} from '@angular/forms/signals';
import { toDate, toDateBound } from './internal';
import type { LeafDef } from './types';

/** Types whose list value holds options, counted as "chosen" in messages. */
const CHOICE_TYPES = new Set(['checkbox', 'select']);

/** Input formats of the native time-like inputs, also checked when a browser falls back to text. */
const TEMPORAL_FORMATS: Readonly<Record<string, RegExp>> = {
  time: /^\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/,
  'datetime-local': /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/,
  month: /^\d{4}-\d{2}$/,
  week: /^\d{4}-W\d{2}$/,
};

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

/** True for types with rules beyond the ones written in the spec. */
export function hasTypeRules(def: LeafDef): boolean {
  return (
    !!def.multiple ||
    def.type in TEMPORAL_FORMATS ||
    ['url', 'color', 'otp', 'phone', 'daterange', 'rating'].includes(def.type)
  );
}

/**
 * The error a built-in type implies for `value`, such as a malformed URL, a date range that
 * ends before it starts or too many chosen options. `required` is the field's current
 * required state: lists, ratings and date ranges have their own idea of empty.
 */
export function typeError(
  def: LeafDef,
  value: unknown,
  required: boolean,
): ValidationError | undefined {
  if (required && isEmptyFor(def, value)) {
    return requiredError();
  }
  if (def.multiple) {
    return Array.isArray(value) ? countError(def, value.length) : undefined;
  }
  if (def.type === 'daterange') {
    return rangeError(def, value);
  }
  if (typeof value !== 'string' || value === '') {
    return undefined;
  }
  const format = TEMPORAL_FORMATS[def.type];
  if (format) {
    if (!format.test(value)) {
      return { kind: 'pattern' };
    }
    // Every format is fixed width with the largest unit first, so text order is time order.
    if (typeof def.min === 'string' && value < def.min) {
      return { kind: 'minDate', minDate: def.min } as ValidationError;
    }
    if (typeof def.max === 'string' && value > def.max) {
      return { kind: 'maxDate', maxDate: def.max } as ValidationError;
    }
    return undefined;
  }
  switch (def.type) {
    case 'url':
      return isWebUrl(value) ? undefined : { kind: 'url' };
    case 'color':
      return HEX_COLOR.test(value) ? undefined : { kind: 'pattern' };
    case 'otp':
      return value.length < (def.length ?? 6) ? { kind: 'mask' } : undefined;
    case 'phone':
      return isPlausiblePhone(value) ? undefined : { kind: 'phone' };
  }
  return undefined;
}

/** Empty by the type's own measure; other values are left to Angular's `required`. */
function isEmptyFor(def: LeafDef, value: unknown): boolean {
  if (def.multiple) {
    return Array.isArray(value) && value.length === 0;
  }
  if (def.type === 'rating') {
    return value === 0;
  }
  if (def.type === 'daterange') {
    const range = value as { from?: unknown; to?: unknown } | null;
    return !range || (isBlank(range.from) && isBlank(range.to));
  }
  return false;
}

/** Entry counts. An empty list is the business of `required`, as with Angular's `minLength`. */
function countError(def: LeafDef, count: number): ValidationError | undefined {
  const choice = CHOICE_TYPES.has(def.type);
  if (typeof def.min === 'number' && count > 0 && count < def.min) {
    return { kind: choice ? 'minSelected' : 'minItems', min: def.min } as ValidationError;
  }
  if (typeof def.max === 'number' && count > def.max) {
    return { kind: choice ? 'maxSelected' : 'maxItems', max: def.max } as ValidationError;
  }
  return undefined;
}

function rangeError(def: LeafDef, value: unknown): ValidationError | undefined {
  const range = (value ?? {}) as { from?: unknown; to?: unknown };
  if (isBlank(range.from) && isBlank(range.to)) {
    return undefined;
  }
  const from = toDate(range.from);
  const to = toDate(range.to);
  if (!from || !to) {
    return { kind: 'dateRangeIncomplete' };
  }
  const lo = toDateBound(def.min);
  const hi = toDateBound(def.max);
  if (lo && from.getTime() < lo.getTime()) {
    return minDateError(lo);
  }
  if (hi && to.getTime() > hi.getTime()) {
    return maxDateError(hi);
  }
  return from.getTime() > to.getTime() ? { kind: 'dateRange' } : undefined;
}

function isBlank(value: unknown): boolean {
  return value === null || value === undefined || value === '';
}

/** An absolute http or https address with a host. */
export function isWebUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      url.hostname !== '' &&
      !/\s/.test(value)
    );
  } catch {
    return false;
  }
}

/** Adds `https://` to text that looks like a bare domain, such as `example.com/about`. */
export function withScheme(value: string): string {
  const text = value.trim();
  if (text === '' || /^[a-z][a-z\d+.-]*:/i.test(text) || !/^[^\s/]+\.[^\s/]{2,}/.test(text)) {
    return value;
  }
  return `https://${text.replace(/^\/\//, '')}`;
}

/**
 * Lengths of the national number for dialing codes whose numbers have a well-known length.
 * Other numbers need 5 to 15 digits in all, as E.164 allows. Use a library such as
 * libphonenumber-js in `validate` for complete rules.
 */
const LENGTHS: Readonly<Record<string, readonly [number, number]>> = {
  '1': [10, 10],
  '7': [10, 10],
  '33': [9, 9],
  '34': [9, 9],
  '39': [6, 11],
  '44': [9, 10],
  '49': [6, 13],
  '52': [10, 10],
  '55': [10, 11],
  '61': [9, 9],
  '81': [9, 10],
  '86': [10, 11],
  '90': [10, 10],
  '91': [10, 10],
};

/**
 * True when an E.164 value such as `'+919876543210'` has 5 to 15 digits, and the length its
 * country uses when that is well known. Kept apart from the country list, which only the
 * phone input needs.
 */
export function isPlausiblePhone(value: string): boolean {
  if (!/^\+[1-9]\d{4,14}$/.test(value)) {
    return false;
  }
  const digits = value.slice(1);
  // No three-digit code starts with a listed shorter code, so the first match is the country.
  for (const size of [3, 2, 1]) {
    const range = LENGTHS[digits.slice(0, size)];
    if (range) {
      const national = digits.length - size;
      return national >= range[0] && national <= range[1];
    }
  }
  return true;
}
