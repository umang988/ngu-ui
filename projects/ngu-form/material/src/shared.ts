import { InjectionToken, type Signal } from '@angular/core';
import type { ErrorStateMatcher } from '@angular/material/core';
import type { DateAdapter } from '@angular/material/core';
import type { FloatLabelType, MatFormFieldAppearance, SubscriptSizing } from '@angular/material/form-field';
import type { NguFieldRenderContext } from 'ngu-form';

/** Options of `provideNguMaterial`. */
export interface NguMaterialOptions {
  /** `'fill'` or `'outline'`. Defaults to `MAT_FORM_FIELD_DEFAULT_OPTIONS`, else Material's own. */
  readonly appearance?: MatFormFieldAppearance;
  /** When the label floats. Defaults to Material's own. */
  readonly floatLabel?: FloatLabelType;
  /** `'dynamic'` lets hints and errors take only the room they need. Defaults to Material's own. */
  readonly subscriptSizing?: SubscriptSizing;
  /**
   * Add Material's native `DateAdapter` for date fields. Default `true`; set `false` when the
   * app provides its own adapter, such as Luxon or date-fns.
   */
  readonly dateAdapter?: boolean;
}

/** The options given to `provideNguMaterial`, read by the Material renderers. Default `{}`. */
export const NGU_MATERIAL_OPTIONS = new InjectionToken<NguMaterialOptions>('NGU_MATERIAL_OPTIONS', {
  factory: () => ({}),
});

/** Shows Material's error state exactly when ngu-form shows the error. */
export function errorMatcher(context: Signal<NguFieldRenderContext>): ErrorStateMatcher {
  return { isErrorState: () => context().showErrors };
}

/** The calendar day of a model date: midnight UTC as stored, or the local day of a time. */
function calendarDay(d: Date): [number, number, number] {
  const utcMidnight = d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0 && d.getUTCMilliseconds() === 0;
  return utcMidnight ? [d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()] : [d.getFullYear(), d.getMonth(), d.getDate()];
}

/** A model value (a `Date` or an ISO date string) as a value of the app's `DateAdapter`. */
export function toPicker<D>(adapter: DateAdapter<D>, value: unknown): D | null {
  if (value == null || value === '') {
    return null;
  }
  if (typeof value === 'string') {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    return m ? adapter.createDate(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
  }
  if (value instanceof Date || Object.prototype.toString.call(value) === '[object Date]') {
    const d = value as Date;
    if (Number.isNaN(d.getTime())) {
      return null;
    }
    const [y, m, day] = calendarDay(d);
    return adapter.createDate(y, m, day);
  }
  return null;
}

/** A picked day as the model stores it: midnight UTC, or an ISO string when the model holds strings. */
export function fromPicker<D>(adapter: DateAdapter<D>, picked: D | null, asString: boolean): Date | string | null {
  if (picked == null || !adapter.isValid(picked)) {
    return asString ? '' : null;
  }
  const y = adapter.getYear(picked);
  const m = adapter.getMonth(picked);
  const d = adapter.getDate(picked);
  return asString
    ? `${String(y).padStart(4, '0')}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    : new Date(Date.UTC(y, m, d));
}

/** Styles of renderers whose label and messages sit outside a `mat-form-field`. */
export const SUBSCRIPT_STYLES = `
  :host {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  .ngu-mat-legend {
    padding: 0;
    margin-block-end: 0.25rem;
    font: var(--mat-sys-body-medium);
    color: var(--mat-sys-on-surface-variant);
  }
  .ngu-mat-group {
    min-inline-size: 0;
    border: 0;
    padding: 0;
    margin: 0;
  }
`;
