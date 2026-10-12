import { InjectionToken, type Provider } from '@angular/core';
import type { NguLookConfig } from './look';
import type { Breakpoint, Cols } from './types';

export interface NguFormConfig extends NguLookConfig {
  /**
   * Minimum form widths, in CSS pixels, for responsive `cols`. Measured on `<ngu-form>`
   * itself, not the viewport, so a form in a narrow panel collapses too.
   * Defaults: `{ sm: 480, md: 720, lg: 960 }`.
   */
  readonly breakpoints?: Partial<Readonly<Record<Breakpoint, number>>>;
  /**
   * Asked by `nguUnsavedChangesGuard` before leaving a page with unsaved changes. Return
   * `true` to leave. Defaults to the browser's `confirm` dialog.
   */
  readonly confirmLeave?: () => boolean | Promise<boolean>;
}

export const DEFAULT_BREAKPOINTS: Readonly<Record<Breakpoint, number>> = { sm: 480, md: 720, lg: 960 };

export const NGU_FORM_CONFIG = new InjectionToken<NguFormConfig>('NGU_FORM_CONFIG');

/** Sets app-wide options for ngu-form. */
export function provideNguFormConfig(config: NguFormConfig): Provider {
  return { provide: NGU_FORM_CONFIG, useValue: config };
}

const ORDER: readonly Breakpoint[] = ['sm', 'md', 'lg'];

/**
 * Columns for a given form width. A number keeps its columns from `sm` up and collapses to
 * one below it. With no measured width (server rendering, tests), the widest setting applies.
 */
export function resolveCols(
  cols: Cols | undefined,
  width: number | undefined,
  breakpoints: Readonly<Record<Breakpoint, number>> = DEFAULT_BREAKPOINTS,
): number {
  if (cols == null) {
    return 1;
  }
  const steps: Partial<Record<Breakpoint | 'base', number>> =
    typeof cols === 'number' ? { base: 1, sm: cols } : cols;
  let result = steps.base ?? 1;
  for (const bp of ORDER) {
    const n = steps[bp];
    if (n != null && (width == null || width >= breakpoints[bp])) {
      result = n;
    }
  }
  return Math.max(1, Math.floor(result));
}
