import { inject, InjectionToken, signal, type Signal } from '@angular/core';
import { NGU_FORM_CONFIG } from './config';

/** `'none'` drops ngu-form's visual CSS and keeps the markup, its classes and its behavior. */
export type NguTheme = 'default' | 'none';

/** Space between and inside fields. */
export type NguDensity = 'compact' | 'normal' | 'spacious';

/** Text size of controls, labels and buttons; paddings follow it. */
export type NguSize = 'sm' | 'md' | 'lg';

/**
 * Classes added to the elements ngu-form renders, for utility CSS such as Tailwind. Each one
 * is added next to the element's own `ngu-*` class. Pair it with `theme: 'none'`, so the
 * default look does not compete with your classes.
 */
export interface NguClassMap {
  /** The `<form>` element. */
  readonly form?: string;
  /** Each field (`<ngu-field>`). */
  readonly field?: string;
  /** Labels and legends. */
  readonly label?: string;
  /** Text inputs, selects and textareas, including those inside phone, tags and date range fields. */
  readonly control?: string;
  /** Checkboxes, radios and switches. */
  readonly check?: string;
  /** Hints under a field. */
  readonly hint?: string;
  /** Error messages of fields, groups, lists and the form. */
  readonly error?: string;
  /** Each group (`<ngu-group>`). */
  readonly group?: string;
  /** Titles of groups, lists and wizard steps. */
  readonly title?: string;
  /** Each list (`<ngu-array>`). */
  readonly list?: string;
  /** Each row of a list. */
  readonly row?: string;
  /** Secondary buttons: add, remove, move, back, show password. */
  readonly button?: string;
  /** The submit and Next buttons. */
  readonly submit?: string;
}

/** The resolved look of one form. */
export interface NguLook {
  readonly theme: NguTheme;
  readonly density: NguDensity;
  readonly size: NguSize;
  readonly classes: NguClassMap;
}

/** App-wide defaults, from `provideNguFormConfig`. */
export interface NguLookConfig {
  /** `'none'` renders every form without ngu-form's CSS. Default `'default'`. */
  readonly theme?: NguTheme;
  /** Default `'normal'`. */
  readonly density?: NguDensity;
  /** Default `'md'`. */
  readonly size?: NguSize;
  /** Classes added to rendered elements, for utility CSS. */
  readonly classes?: NguClassMap;
}

/** Provided by `<ngu-form>` and `<ngu-view>` for what they render. */
export const NGU_LOOK = new InjectionToken<Signal<NguLook>>('NGU_LOOK');

const NO_CLASSES: NguClassMap = {};

export function resolveLook(config: NguLookConfig | null | undefined, own?: Partial<NguLook>): NguLook {
  return {
    theme: own?.theme ?? config?.theme ?? 'default',
    density: own?.density ?? config?.density ?? 'normal',
    size: own?.size ?? config?.size ?? 'md',
    classes: own?.classes ?? config?.classes ?? NO_CLASSES,
  };
}

/**
 * The look of the surrounding `<ngu-form>` or `<ngu-view>`, else the app-wide one. Built-in
 * controls bind `ngu-unstyled` on their host from it and add the class map to their elements;
 * custom type renderers can do the same.
 *
 * ```ts
 * protected readonly look = injectNguLook();
 * // host: { '[class.ngu-unstyled]': "look().theme === 'none'" }
 * // template: <input [class]="look().classes.control" ... />
 * ```
 */
export function injectNguLook(): Signal<NguLook> {
  return (
    inject(NGU_LOOK, { optional: true }) ??
    signal(resolveLook(inject(NGU_FORM_CONFIG, { optional: true }))).asReadonly()
  );
}
