import { InjectionToken, type Provider, type Type } from '@angular/core';

/** Icon components by name, for `prefixIcon` and `suffixIcon`. */
export type NguIcons = Readonly<Record<string, Type<unknown>>>;

/** Every registry passed to `provideNguIcons`, in order; later ones win. */
export const NGU_ICONS = new InjectionToken<readonly NguIcons[]>('NGU_ICONS');

/**
 * Registers icon components by name, so specs (and run-time fields from JSON) can ask for
 * them with `prefixIcon: 'search'` or `suffixIcon: 'mail'`. Can be called more than once;
 * later registrations win. The icon slot sets `color` and `font-size`, so icons drawn at
 * `1em` in `currentColor` fit any field size.
 *
 * ```ts
 * providers: [provideNguIcons({ search: SearchIcon, mail: MailIcon })]
 * ```
 */
export function provideNguIcons(icons: NguIcons): Provider {
  return { provide: NGU_ICONS, useValue: icons, multi: true };
}

/** The component registered under `name`, latest registration first. */
export function findIcon(registries: readonly NguIcons[] | null, name: string | undefined): Type<unknown> | undefined {
  if (!name || !registries) {
    return undefined;
  }
  for (let i = registries.length - 1; i >= 0; i--) {
    const icon = registries[i][name];
    if (icon) {
      return icon;
    }
  }
  return undefined;
}
