import { signal, type WritableSignal } from '@angular/core';
import { createMetadataKey, type Field, type ValidationError } from '@angular/forms/signals';
import type { StepsHandle } from './steps';
import type { AnyFieldDef, Choice, FormDef, FormDefinition } from './types';

/** Options computed from the model, for `options: (model) => [...]`. */
export const NGU_CHOICES = createMetadataKey<readonly Choice<any>[]>();

/** The root and the nearest array item of a field, for `onChange` writes. */
export const NGU_NODES = createMetadataKey<{ readonly root: Field<any>; readonly scope: Field<any> }>();

/** The model path of a field, with numbers for list rows: `items.0.sku`. */
export const NGU_PATH = createMetadataKey<string>();

/** Messages from `warn`, which never block a submit. */
export const NGU_WARNINGS = createMetadataKey<readonly ValidationError[]>();

/** Hidden flags of a group's static entries, by key. */
export const NGU_STATIC_HIDDEN = createMetadataKey<Readonly<Record<string, boolean>>>();

/** State a `FormDef` shares with `<ngu-form>` but does not expose. */
export interface FormInternals {
  /** True while `<ngu-form>` waits for async checks before submitting. */
  readonly waiting: WritableSignal<boolean>;
  /** Marks the current value as saved: clears dirty state and moves the `changes()` baseline. */
  saved(): void;
  /** Model paths the last undo or redo changed. */
  changedByHistory(): readonly string[];
  /** The wizard, when `layout` is `'steps'`. */
  readonly steps?: StepsHandle;
  /** Title of the review step: `true` for the translated default. */
  readonly review?: string | true;
  /** URL query parameter that holds the current step. */
  readonly stepParam?: string;
}

const internals = new WeakMap<FormDef<any, any>, FormInternals>();

export function setInternals(def: FormDef<any, any>, value: FormInternals): void {
  internals.set(def, value);
}

export function internalsOf(def: FormDef<any, any>): FormInternals {
  return internals.get(def) ?? { waiting: signal(false), saved: () => undefined, changedByHistory: () => [] };
}

/** True for `Date` objects, including ones from another realm (an iframe, or jsdom's `valueAsDate`). */
export function isDate(v: unknown): v is Date {
  return Object.prototype.toString.call(v) === '[object Date]';
}

/** True for object literals and `Object.create(null)`; false for `File`, `Map`, `Date` and class instances. */
export function isPlainObject(v: unknown): v is Record<string, unknown> {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) {
    return false;
  }
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
}

/** Merges plain objects key by key; arrays and other values are replaced. */
export function deepMerge(target: unknown, patch: unknown): unknown {
  if (!isPlainObject(target) || !isPlainObject(patch)) {
    return patch === undefined ? target : patch;
  }
  const out: Record<string, unknown> = { ...target };
  for (const [key, value] of Object.entries(patch)) {
    out[key] = deepMerge(target[key], value);
  }
  return out;
}

/** Structural equality for model values: plain objects, arrays, dates and primitives. */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) {
    return true;
  }
  if (isDate(a) && isDate(b)) {
    return a.getTime() === b.getTime();
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => deepEqual(v, b[i]));
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const keys = Object.keys(a);
    return keys.length === Object.keys(b).length && keys.every((k) => k in b && deepEqual(a[k], b[k]));
  }
  return false;
}

/**
 * Deep copy of plain objects and arrays that keeps their own symbol keys. Signal Forms tags
 * each object in an array with a symbol to track its row, so a copy that keeps the tag maps
 * back to the same row (and its touched, dirty and server-error state) when written back.
 */
export function cloneKeepingIds<T>(value: T): T {
  if (Array.isArray(value)) {
    return copySymbols(value, value.map(cloneKeepingIds)) as T;
  }
  if (isPlainObject(value)) {
    const out: Record<string | symbol, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = cloneKeepingIds(v);
    }
    return copySymbols(value, out) as T;
  }
  if (isDate(value)) {
    return new Date(value.getTime()) as T;
  }
  return value;
}

function copySymbols<T extends object>(from: object, to: T): T {
  for (const sym of Object.getOwnPropertySymbols(from)) {
    (to as Record<symbol, unknown>)[sym] = (from as Record<symbol, unknown>)[sym];
  }
  return to;
}

/**
 * Deep copy of plain objects and arrays without their symbol keys, for a duplicated row: the
 * copy gets a row of its own instead of sharing the original's. Dates are copied; files and
 * other objects are shared.
 */
export function copyRow<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(copyRow) as T;
  }
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = copyRow(v);
    }
    return out as T;
  }
  if (isDate(value)) {
    return new Date(value.getTime()) as T;
  }
  return value;
}

/** Tab, panel and step contents reuse one untitled copy per definition, so inputs stay stable. */
const untitled = new WeakMap<AnyFieldDef, AnyFieldDef>();

/** A group or list without its title, for content under a header that already shows it. */
export function withoutTitle(def: AnyFieldDef): AnyFieldDef {
  if (def.__ngu !== 'group' && def.__ngu !== 'array' && def.__ngu !== 'dynamic') {
    return def;
  }
  let copy = untitled.get(def);
  if (!copy) {
    copy = { ...def, title: undefined };
    untitled.set(def, copy);
  }
  return copy;
}

/** A definition's entries sorted by `order`, lowest first; equal orders keep model order. */
export function ordered(fields: FormDefinition): [string, AnyFieldDef][] {
  return Object.entries(fields)
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => (a.entry[1].order ?? 0) - (b.entry[1].order ?? 0) || a.index - b.index)
    .map(({ entry }) => entry);
}

export function clone<T>(value: T): T {
  try {
    return structuredClone(value);
  } catch {
    return value;
  }
}

/**
 * A `Date` from a `Date` or an ISO date string. Date-only strings (`2026-01-31`) are midnight
 * UTC, matching the `Date` values that date inputs produce.
 */
export function toDate(value: unknown): Date | undefined {
  if (isDate(value)) {
    return isNaN(value.getTime()) ? undefined : value;
  }
  if (typeof value === 'string' && value !== '') {
    const date = new Date(value);
    return isNaN(date.getTime()) ? undefined : date;
  }
  return undefined;
}

/**
 * A `min` or `max` for a date field, as a calendar day at midnight UTC like the values a date
 * input produces. Midnight-UTC dates and ISO date strings are used as they are; a `Date` with
 * a time of day, such as `new Date()`, counts as that day in the user's time zone.
 */
export function toDateBound(value: unknown): Date | undefined {
  const date = toDate(value);
  if (!date || typeof value === 'string') {
    return date;
  }
  const midnightUtc =
    date.getUTCHours() === 0 && date.getUTCMinutes() === 0 && date.getUTCSeconds() === 0 && date.getUTCMilliseconds() === 0;
  return midnightUtc ? date : new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}

const localeCache = new Map<string, string>();

/** A locale `Intl` accepts: `en_US` becomes `en-US`, anything unusable becomes `en-US`. */
export function safeLocale(locale: string | undefined): string {
  const key = locale ?? '';
  let safe = localeCache.get(key);
  if (safe === undefined) {
    try {
      safe = Intl.getCanonicalLocales(key.replace(/_/g, '-'))[0] ?? 'en-US';
    } catch {
      safe = 'en-US';
    }
    localeCache.set(key, safe);
  }
  return safe;
}

/** `YYYY-MM-DD` in UTC, the format of a date input's `min` and `max`. */
export function isoDate(value: Date | string | undefined): string | null {
  const date = toDate(value);
  return date ? date.toISOString().slice(0, 10) : null;
}
