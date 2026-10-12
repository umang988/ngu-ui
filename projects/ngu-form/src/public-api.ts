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
export {
  NguFieldTemplate,
  NguControlTemplate,
  NguPrefixTemplate,
  NguSuffixTemplate,
  type NguFieldContext,
} from './lib/components/ngu-templates';
export { provideNguIcons, NGU_ICONS, type NguIcons } from './lib/icons';
export { provideNguFieldRenderers, NGU_FIELD_RENDERERS, type NguFieldRenderContext } from './lib/renderers';
export { NguTransform, type FieldTransform } from './lib/transform';
export { NguBind } from './lib/bind';
export { NguStrength } from './lib/components/ngu-strength';
export { provideNguFieldTypes, NGU_FIELD_TYPES, type NguFieldTypeLoader, type NguFieldTypes } from './lib/field-types';
export { provideNguFormConfig, NGU_FORM_CONFIG, type NguFormConfig } from './lib/config';
export {
  injectNguLook,
  NGU_LOOK,
  type NguClassMap,
  type NguDensity,
  type NguLook,
  type NguLookConfig,
  type NguSize,
  type NguTheme,
} from './lib/look';
export { NGU_TOKENS, type NguToken } from './lib/tokens';
export { nguUnsavedChangesGuard, hasUnsavedChanges } from './lib/unsaved-changes';
