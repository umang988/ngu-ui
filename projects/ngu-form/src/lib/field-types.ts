import { InjectionToken, type Provider, type Type } from '@angular/core';

/**
 * Contract for a custom field renderer. Declare the inputs you need; only the ones
 * you declare are set: `field` (required), and optionally `def`, `id`, `invalid` (true while
 * an error is shown; use it for `aria-invalid`) and `describedBy` (id of the hint or error).
 *
 * ```ts
 * @Component({ imports: [FormField], template: `<input type="color" [id]="id()" [formField]="field()" />` })
 * export class ColorInput {
 *   readonly field = input.required<Field<string>>();
 *   readonly def = input<LeafDef>();
 *   readonly id = input<string>();
 * }
 * ```
 */
export type NguFieldTypes = Readonly<Record<string, Type<unknown>>>;

export const NGU_FIELD_TYPES = new InjectionToken<readonly NguFieldTypes[]>('NGU_FIELD_TYPES');

/**
 * Registers renderer components for custom `type` names. Can be called more than once;
 * later registrations win. Add the names to `NguFieldTypeMap` for type checking.
 */
export function provideNguFieldTypes(types: NguFieldTypes): Provider {
  return { provide: NGU_FIELD_TYPES, useValue: types, multi: true };
}
