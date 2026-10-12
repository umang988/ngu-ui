import { InjectionToken, type Provider } from '@angular/core';
import type { Field, FieldState } from '@angular/forms/signals';
import type { NguFieldTypes } from './field-types';
import type { NguLook } from './look';
import type { NguI18n } from './messages';
import type { FieldTransform } from './transform';
import type { Choice, LeafDef } from './types';

/**
 * Everything a whole-field renderer needs, resolved by `<ngu-field>`: texts are translated,
 * options are resolved, and `error` is set only while the error should show.
 */
export interface NguFieldRenderContext {
  /** The field node; bind it with `[formField]`, or read and write `field().value`. */
  readonly field: Field<any>;
  readonly state: FieldState<any>;
  readonly def: LeafDef;
  /** The id for the control, so the error summary can link to it. */
  readonly id: string;
  readonly label: string | undefined;
  readonly hint: string | undefined;
  readonly placeholder: string;
  readonly prefix: string | undefined;
  readonly suffix: string | undefined;
  /** Options of choice fields, with translated labels. */
  readonly choices: readonly Choice<any>[];
  /** The error message while it should show, else `undefined`. */
  readonly error: string | undefined;
  /** A `warn` message while it should show and there is no error. */
  readonly warning: string | undefined;
  /** "Checking…" while an async check runs. */
  readonly pending: string | undefined;
  /** True while the error shows. Use it for the control's invalid state. */
  readonly showErrors: boolean;
  readonly required: boolean;
  /**
   * Parse and format for masks, locale numbers, currency and `parse`/`format`. Put it on a
   * native input with `[nguTransform]`, next to `[formField]`.
   */
  readonly transform: FieldTransform | undefined;
  /** Character count against `maxLength`, when the field shows a counter. */
  readonly counter: { readonly length: number; readonly max: number; readonly text: string } | undefined;
  readonly i18n: NguI18n;
  readonly look: NguLook;
  /** Marks the field touched, as leaving it does; for controls that have no native blur. */
  touch(): void;
}

/** Whole-field renderers by type name. */
export const NGU_FIELD_RENDERERS = new InjectionToken<readonly NguFieldTypes[]>('NGU_FIELD_RENDERERS');

/**
 * Registers components that render a whole field (label, control, hint and messages) for a
 * `type`, such as the ones in `ngu-form/material` and `ngu-form/primeng`. Each declares
 * `context = input.required<NguFieldRenderContext>()`. A value can be a loader, as in
 * `provideNguFieldTypes`. `nguField` and `nguControl` templates still win for their paths.
 */
export function provideNguFieldRenderers(renderers: NguFieldTypes): Provider {
  return { provide: NGU_FIELD_RENDERERS, useValue: renderers, multi: true };
}
