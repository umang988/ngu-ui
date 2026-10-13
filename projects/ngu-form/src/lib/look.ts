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
 *
 * States are attributes rather than slots, so utility variants can style them: fields carry
 * `data-invalid`, `data-warning`, `data-required`, `data-disabled`, `data-readonly` and
 * `data-pending`, and controls `aria-invalid` while an error shows.
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
  /** Hints under a field, the character counter and the "checking" text of async checks. */
  readonly hint?: string;
  /** Warnings under a field, from `warn`. */
  readonly warning?: string;
  /** Error messages of fields, groups, lists and the form. */
  readonly error?: string;
  /**
   * The box around a control that has a prefix, suffix, icon or show-password button. The
   * control inside it carries `data-adorned`, to drop its own border.
   */
  readonly adorned?: string;
  /** Prefix and suffix text and icons. */
  readonly affix?: string;
  /** Each option of a radio or checkbox group or a segmented control: the label around the input. */
  readonly option?: string;
  /** Each tag of a tags field. */
  readonly chip?: string;
  /** Each group (`<ngu-group>`). */
  readonly group?: string;
  /** Titles of groups, lists, panels and wizard steps, and static headings. */
  readonly title?: string;
  /** Descriptions of groups and lists, and static text between fields. */
  readonly description?: string;
  /** Each list (`<ngu-array>`). */
  readonly list?: string;
  /** Each row of a list. */
  readonly row?: string;
  /** The tab list of `layout: 'tabs'`. */
  readonly tabs?: string;
  /** Each tab; the selected one has `aria-selected="true"`. */
  readonly tab?: string;
  /** Each collapsible panel, from `collapsed` or `layout: 'accordion'`; open ones have `data-open`. */
  readonly panel?: string;
  /** The wizard's step list. */
  readonly steps?: string;
  /** Each step in that list; the current one has `aria-current="step"`, finished ones `data-done`. */
  readonly step?: string;
  /** Secondary buttons: add, remove, move, back, edit, discard, show password. */
  readonly button?: string;
  /** The submit and Next buttons. */
  readonly submit?: string;
  /** The row that holds the submit, Back and Next buttons. */
  readonly actions?: string;
  /** The error summary of `<ngu-form errorSummary>`. */
  readonly errorSummary?: string;
  /** The notice shown after a draft was restored. */
  readonly notice?: string;
  /** Values in view mode: `<ngu-view>` and the review step. Labels use `label`. */
  readonly value?: string;
}

/** Joins two or more class lists into one. */
export type NguClassMerge = (...classLists: string[]) => string;

/** The resolved look of one form, or of one part of it. */
export interface NguLook {
  /** `'none'` when ngu-form's CSS is dropped, else `'default'`. */
  readonly theme: NguTheme;
  /** Space between and inside fields. */
  readonly density: NguDensity;
  /** Text size of controls, labels and buttons. */
  readonly size: NguSize;
  /** The class map: the app-wide classes with those of the form, groups, lists and field added. */
  readonly classes: NguClassMap;
  /** How classes from different levels are joined: `mergeClasses` from the config, else a plain join. */
  readonly mergeClasses: NguClassMerge;
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
  /**
   * Joins the classes of a slot when more than one level sets it: this config, a form's
   * `[classes]`, a group's or list's `classes` and a field's `class` or `classes`. Pass
   * `twMerge` from tailwind-merge so a later utility replaces an earlier one (`px-4` after
   * `px-3`). By default both are kept and the order in Tailwind's CSS decides.
   */
  readonly mergeClasses?: NguClassMerge;
}

/** Provided by `<ngu-form>` and `<ngu-view>` for what they render, and refined by groups, lists and fields. */
export const NGU_LOOK = new InjectionToken<Signal<NguLook>>('NGU_LOOK');

const NO_CLASSES: NguClassMap = {};

const joinClasses: NguClassMerge = (...classLists) => classLists.join(' ');

function mergeClassMaps(merge: NguClassMerge, base: NguClassMap, extra: NguClassMap | undefined): NguClassMap {
  if (!extra) {
    return base;
  }
  const out: Record<string, string | undefined> = { ...base };
  for (const [slot, value] of Object.entries(extra)) {
    if (value) {
      const current = out[slot];
      out[slot] = current ? merge(current, value) : value;
    }
  }
  return out;
}

/** The look of a form: its own inputs first, then the config. Its `classes` add to the config's. */
export function resolveLook(config: NguLookConfig | null | undefined, own?: Partial<NguLook>): NguLook {
  const mergeClasses = config?.mergeClasses ?? joinClasses;
  return {
    theme: own?.theme ?? config?.theme ?? 'default',
    density: own?.density ?? config?.density ?? 'normal',
    size: own?.size ?? config?.size ?? 'md',
    classes: mergeClassMaps(mergeClasses, config?.classes ?? NO_CLASSES, own?.classes),
    mergeClasses,
  };
}

/** The look for one part of a form: `classes` added to each slot of `look`. */
export function extendLook(look: NguLook, classes: NguClassMap | undefined): NguLook {
  return classes ? { ...look, classes: mergeClassMaps(look.mergeClasses, look.classes, classes) } : look;
}

/** The classes of `slot`, with an element's own `class` from its spec added. */
export function slotClass(look: NguLook, slot: keyof NguClassMap, own?: string): string {
  const base = look.classes[slot];
  if (!own) {
    return base ?? '';
  }
  return base ? look.mergeClasses(base, own) : own;
}

/**
 * The look of the surrounding `<ngu-form>` or `<ngu-view>`, else the app-wide one. Built-in
 * controls bind `ngu-unstyled` on their host from it and add the class map to their elements;
 * custom type renderers can do the same. Inside a field it includes the classes the field's
 * spec, and the groups and lists around it, add.
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

/** Like `injectNguLook`, for a component that provides `NGU_LOOK` itself: the look around it. */
export function injectOuterLook(): Signal<NguLook> {
  return (
    inject(NGU_LOOK, { optional: true, skipSelf: true }) ??
    signal(resolveLook(inject(NGU_FORM_CONFIG, { optional: true }))).asReadonly()
  );
}
