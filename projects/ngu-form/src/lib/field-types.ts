import { InjectionToken, reflectComponentType, type Provider, type Type } from '@angular/core';

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
export type NguFieldTypes = Readonly<Record<string, Type<unknown> | NguFieldTypeLoader>>;

/**
 * Loads a renderer on first use, so its code (and its editor or picker library) stays out of
 * the main bundle: `() => import('./rich-text').then((m) => m.RichText)`. A module whose
 * default export is the component works too: `() => import('./rich-text')`.
 */
export type NguFieldTypeLoader = () => Promise<Type<unknown> | { readonly default: Type<unknown> }>;

export const NGU_FIELD_TYPES = new InjectionToken<readonly NguFieldTypes[]>('NGU_FIELD_TYPES');

/**
 * Registers renderer components for custom `type` names. Can be called more than once;
 * later registrations win. Add the names to `NguFieldTypeMap` for type checking. A value can
 * be a loader function instead of the component; the field shows a placeholder until it loads.
 *
 * ```ts
 * provideNguFieldTypes({
 *   mood: MoodPicker,
 *   richText: () => import('./rich-text').then((m) => m.RichText),
 * })
 * ```
 */
export function provideNguFieldTypes(types: NguFieldTypes): Provider {
  return { provide: NGU_FIELD_TYPES, useValue: types, multi: true };
}

/** The renderer registered for `type`, latest registration first: a component or a loader. */
export function findFieldType(
  registries: readonly NguFieldTypes[] | null,
  type: string,
): Type<unknown> | NguFieldTypeLoader | undefined {
  if (!registries) {
    return undefined;
  }
  for (let i = registries.length - 1; i >= 0; i--) {
    const entry = registries[i][type];
    if (entry) {
      return entry;
    }
  }
  return undefined;
}

/** True for component classes, false for loader functions. */
export function isComponentType(entry: Type<unknown> | NguFieldTypeLoader): entry is Type<unknown> {
  return reflectComponentType(entry as Type<unknown>) !== null;
}

const loaded = new WeakMap<NguFieldTypeLoader, Type<unknown>>();
const loading = new WeakMap<NguFieldTypeLoader, Promise<Type<unknown>>>();

/** The component a loader already produced, so later fields render at once. */
export function loadedFieldType(loader: NguFieldTypeLoader): Type<unknown> | undefined {
  return loaded.get(loader);
}

/** Runs a loader once, however many fields use it. */
export function loadFieldType(loader: NguFieldTypeLoader): Promise<Type<unknown>> {
  let promise = loading.get(loader);
  if (!promise) {
    promise = loader().then((result) => {
      const type = reflectComponentType(result as Type<unknown>)
        ? (result as Type<unknown>)
        : (result as { readonly default: Type<unknown> }).default;
      loaded.set(loader, type);
      return type;
    });
    // A failed load can be retried by the next field that needs it.
    promise.catch(() => loading.delete(loader));
    loading.set(loader, promise);
  }
  return promise;
}
