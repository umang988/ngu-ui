import { inject } from '@angular/core';
import { NGU_FORM_CONFIG } from './config';
import { injectNguI18n } from './messages';
import type { FormDef } from './types';

/** True when the user changed the form and the values differ from the last saved state. */
export function hasUnsavedChanges(def: FormDef<any, any>): boolean {
  return def.dirty() && Object.keys(def.changes()).length > 0;
}

/**
 * Router guard that asks before leaving a page whose forms have unsaved changes. It finds
 * every `defineForm` result on the routed component, so there is nothing to wire up:
 *
 * ```ts
 * { path: 'profile', component: ProfilePage, canDeactivate: [nguUnsavedChangesGuard] }
 * ```
 *
 * A form counts as saved after a successful submit through `<ngu-form>`, or after `reset()`.
 * Change the question with `provideNguFormConfig({ confirmLeave })`.
 */
export const nguUnsavedChangesGuard = (component: unknown): boolean | Promise<boolean> => {
  if (typeof component !== 'object' || component === null) {
    return true;
  }
  const forms = Object.values(component).filter(isFormDef);
  if (!forms.some(hasUnsavedChanges)) {
    return true;
  }
  const confirmLeave = inject(NGU_FORM_CONFIG, { optional: true })?.confirmLeave;
  if (confirmLeave) {
    return confirmLeave();
  }
  return typeof window === 'undefined' || window.confirm(injectNguI18n().message('unsavedChanges'));
};

function isFormDef(value: unknown): value is FormDef<any, any> {
  return typeof value === 'object' && value !== null && (value as { __ngu?: unknown }).__ngu === 'form';
}
