/*
 * Public API Surface of ngu-form
 */

export * from './lib/types';
export { defineForm } from './lib/define';
export {
  createNguI18n,
  defaultMessage,
  errorMessage,
  formatMessage,
  injectNguI18n,
  NGU_DEFAULT_MESSAGES,
  NGU_MESSAGES,
  provideNguMessages,
  type NguI18n,
  type NguMessage,
  type NguMessages,
  type NguMessagesConfig,
} from './lib/messages';
export { nguIndexedDbDrafts } from './lib/draft';
export {
  NGU_CAPTCHA,
  nguHCaptcha,
  nguRecaptcha,
  nguTurnstile,
  provideNguCaptcha,
  type NguCaptchaAdapter,
  type NguCaptchaEvents,
  type NguCaptchaRenderOptions,
  type NguCaptchaWidget,
  type NguScriptCaptchaOptions,
} from './lib/captcha';
export { NguForm } from './lib/components/ngu-form';
export { NguFormContext, type NguProblemSource } from './lib/components/ngu-form-context';
export { NguGroup } from './lib/components/ngu-group';
export { NguField } from './lib/components/ngu-field';
export { NguArray } from './lib/components/ngu-array';
export { NguDynamic } from './lib/components/ngu-dynamic';
export { NguView } from './lib/components/ngu-view';
export { NguFieldTemplate, NguControlTemplate, type NguFieldContext } from './lib/components/ngu-templates';
export { provideNguFieldTypes, NGU_FIELD_TYPES, type NguFieldTypes } from './lib/field-types';
export { provideNguFormConfig, NGU_FORM_CONFIG, type NguFormConfig } from './lib/config';
export { nguUnsavedChangesGuard, hasUnsavedChanges } from './lib/unsaved-changes';
