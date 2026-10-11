import {
  computed,
  inject,
  InjectionToken,
  isSignal,
  LOCALE_ID,
  type Provider,
  type Signal,
} from '@angular/core';
import type { ValidationError } from '@angular/forms/signals';
import { isDate, safeLocale } from './internal';
import type { LeafDef } from './types';

/**
 * A message: a template such as `'{label} is required'`, or a function of its parameters.
 *
 * Templates use ICU-style placeholders. `{name}` inserts a parameter; numbers and dates are
 * formatted for the active locale. `{count, plural, one {# entry} other {# entries}}` picks a
 * plural form with `Intl.PluralRules` (`=0`, `zero`, `one`, `two`, `few`, `many`, `other`),
 * and `#` inside a branch is the number. `{kind, select, a {...} other {...}}` picks by value.
 */
export type NguMessage<P extends object = object> = string | ((params: P) => string);

/** Every text ngu-form renders itself, with English defaults in `NGU_DEFAULT_MESSAGES`. */
export interface NguMessages {
  // --- validation ---------------------------------------------------------
  required: NguMessage<{ label: string }>;
  email: NguMessage<{ label: string }>;
  minLength: NguMessage<{ label: string; minLength: number }>;
  maxLength: NguMessage<{ label: string; maxLength: number }>;
  min: NguMessage<{ label: string; min: number }>;
  max: NguMessage<{ label: string; max: number }>;
  /** `min` is a `Date` on date fields, and formatted text on time, month and week fields. */
  minDate: NguMessage<{ label: string; min: Date | string }>;
  maxDate: NguMessage<{ label: string; max: Date | string }>;
  pattern: NguMessage<{ label: string }>;
  /** A `url` field holds something other than a full http or https address. */
  url: NguMessage<{ label: string }>;
  /** A `phone` number is too short or too long for any country. */
  phone: NguMessage<{ label: string }>;
  /** Too few or too many options chosen in a checkbox group or multiple select. */
  minSelected: NguMessage<{ label: string; min: number }>;
  maxSelected: NguMessage<{ label: string; max: number }>;
  /** A date range ends before it starts. */
  dateRange: NguMessage<{ label: string }>;
  /** A date range has only one of its two dates. */
  dateRangeIncomplete: NguMessage<{ label: string }>;
  /** A required consent checkbox is not ticked. */
  consentRequired: NguMessage<{ label: string }>;
  /** The captcha is not solved yet. */
  captchaRequired: NguMessage;
  /** The captcha widget failed to load or run. */
  captchaFailed: NguMessage;
  /** The text typed into a field could not be read, such as letters in a number field. */
  parse: NguMessage<{ label: string }>;
  /** A masked field was left half filled. */
  mask: NguMessage<{ label: string }>;
  /** Fallback for errors without a message. */
  invalid: NguMessage<{ label: string }>;
  /** `label` when a field has none. */
  fieldFallback: NguMessage;
  /** An async validator failed to run. */
  asyncFailed: NguMessage;
  /** Shown while an async validator runs, unless the field sets `pendingText`. */
  checking: NguMessage;
  /** Read by screen readers before a warning. */
  warningPrefix: NguMessage;

  // --- lists ----------------------------------------------------------------
  add: NguMessage;
  remove: NguMessage;
  /** Accessible name of a row's remove button, such as "Remove 2". */
  removeItem: NguMessage<{ label: string; index: number }>;
  emptyList: NguMessage<{ add: string }>;
  emptyListNoAdd: NguMessage;
  /** `label` of a list without a title. */
  listFallback: NguMessage;
  minItems: NguMessage<{ label: string; min: number }>;
  maxItems: NguMessage<{ label: string; max: number }>;

  // --- inputs ---------------------------------------------------------------
  showPassword: NguMessage;
  hidePassword: NguMessage;
  showPasswordLabel: NguMessage;
  hidePasswordLabel: NguMessage;
  passwordShown: NguMessage;
  passwordHidden: NguMessage;
  charactersLeft: NguMessage<{ count: number }>;
  charactersOver: NguMessage<{ count: number }>;
  /** Labels of the two inputs of a date range. */
  dateFrom: NguMessage;
  dateTo: NguMessage;
  /** Accessible name of the country picker on phone fields. */
  countryCode: NguMessage;
  /** Accessible name of each rating star. */
  ratingStar: NguMessage<{ count: number }>;
  /** Accessible name of a tag's remove button. */
  removeTag: NguMessage<{ tag: string }>;
  tagAdded: NguMessage<{ tag: string }>;
  tagRemoved: NguMessage<{ tag: string }>;
  tagDuplicate: NguMessage<{ tag: string }>;
  /** Shown under a multiple select on devices with a mouse. */
  multiSelectHint: NguMessage;
  /** Read after links that open in a new tab, such as a consent field's policy. */
  opensInNewTab: NguMessage;
  /** Accessible name of a captcha without a label. */
  captchaLabel: NguMessage;

  // --- files (ngu-form/upload) ------------------------------------------------
  chooseFile: NguMessage;
  chooseFiles: NguMessage;
  dropHint: NguMessage<{ multiple: boolean }>;
  /** Status of a file being uploaded. */
  uploading: NguMessage<{ percent: number }>;
  uploaded: NguMessage;
  uploadFailed: NguMessage;
  /** Field error while files failed to upload. */
  uploadsFailed: NguMessage<{ count: number }>;
  retryUpload: NguMessage;
  removeFile: NguMessage<{ name: string }>;
  fileTooLarge: NguMessage<{ name: string; size: string }>;
  fileType: NguMessage<{ name: string }>;
  /** Announced after files are added or removed. */
  filesAdded: NguMessage<{ count: number }>;
  fileRemoved: NguMessage<{ name: string }>;
  cropTitle: NguMessage;
  cropHint: NguMessage;
  cropZoom: NguMessage;
  /** Sliders that move the image inside the crop frame, for keyboard users. */
  cropX: NguMessage;
  cropY: NguMessage;
  cropApply: NguMessage;
  cropCancel: NguMessage;
  signaturePad: NguMessage;
  signatureClear: NguMessage;
  signatureType: NguMessage;
  signatureDraw: NguMessage;
  signatureName: NguMessage;
  signatureSigned: NguMessage;

  // --- password strength ----------------------------------------------------
  /** Accessible value of the strength meter. */
  strength: NguMessage<{ level: string }>;
  strengthLevels: NguMessage<{ score: number }>;
  ruleLength: NguMessage<{ min: number }>;
  ruleCase: NguMessage;
  ruleNumber: NguMessage;
  ruleSymbol: NguMessage;
  /** Read after each rule by screen readers. */
  ruleMet: NguMessage;
  ruleUnmet: NguMessage;
  /** Error when the password is weaker than `strength.min`. */
  weakPassword: NguMessage<{ label: string }>;

  // --- form -----------------------------------------------------------------
  /** Announced after a refused submit. */
  invalidSubmit: NguMessage<{ count: number }>;
  /** Shown when the submit action throws. */
  submitFailed: NguMessage;
  /** Asked by `nguUnsavedChangesGuard`. */
  unsavedChanges: NguMessage;
  errorSummaryTitle: NguMessage<{ count: number }>;
  loading: NguMessage;
  loadFailed: NguMessage;
  draftRestored: NguMessage<{ time: string }>;
  discardDraft: NguMessage;
  /** Announced after the draft was discarded. */
  draftDiscarded: NguMessage;
  undone: NguMessage;
  redone: NguMessage;
}

/** Options for `provideNguMessages`: message overrides plus the locale and a translate hook. */
export interface NguMessagesConfig extends Partial<NguMessages> {
  /** BCP 47 locale for plural rules, numbers and dates. Defaults to `LOCALE_ID`. */
  readonly locale?: string;
  /**
   * Resolves app strings: labels, hints, placeholders, titles, option labels and messages
   * returned by validators. Built-in messages are looked up as `ngu.<key>` first, with their
   * parameters, so all translations can live in one place; a returned ICU template such as
   * `'{label} is required'` is filled in. Return `undefined`, `null` or the key itself to keep
   * the original text. Signals read here are tracked, so a language switch re-renders.
   */
  readonly translate?: (key: string, params?: Readonly<Record<string, unknown>>) => string | null | undefined;
}

export const NGU_DEFAULT_MESSAGES: Readonly<NguMessages> = {
  required: '{label} is required',
  email: 'Enter a valid email address',
  minLength: '{label} must be at least {minLength, plural, one {# character} other {# characters}}',
  maxLength: '{label} must be at most {maxLength, plural, one {# character} other {# characters}}',
  min: '{label} must be at least {min}',
  max: '{label} must be at most {max}',
  minDate: '{label} must be on or after {min}',
  maxDate: '{label} must be on or before {max}',
  pattern: '{label} has an invalid format',
  url: 'Enter a full web address, such as https://example.com',
  phone: 'Enter a valid phone number',
  minSelected: 'Choose at least {min, plural, one {# option} other {# options}}',
  maxSelected: 'Choose at most {max, plural, one {# option} other {# options}}',
  dateRange: 'The end date must be on or after the start date',
  dateRangeIncomplete: '{label} needs a start and an end date',
  consentRequired: 'Accept this to continue',
  captchaRequired: 'Complete the check to show you are not a robot',
  captchaFailed: 'The check could not load. Reload the page and try again.',
  parse: '{label} has a value that cannot be read',
  mask: '{label} is incomplete',
  invalid: '{label} is invalid',
  fieldFallback: 'This field',
  asyncFailed: 'Could not validate this value',
  checking: 'Checking…',
  warningPrefix: 'Warning:',

  add: 'Add',
  remove: 'Remove',
  removeItem: '{label} {index}',
  emptyList: 'No entries yet. Use "{add}" to add one.',
  emptyListNoAdd: 'No entries.',
  listFallback: 'This list',
  minItems: '{label} needs at least {min, plural, one {# entry} other {# entries}}',
  maxItems: '{label} allows at most {max, plural, one {# entry} other {# entries}}',

  showPassword: 'Show',
  hidePassword: 'Hide',
  showPasswordLabel: 'Show password',
  hidePasswordLabel: 'Hide password',
  passwordShown: 'Your password is visible',
  passwordHidden: 'Your password is hidden',
  charactersLeft: '{count, plural, one {# character} other {# characters}} remaining',
  charactersOver: '{count, plural, one {# character} other {# characters}} too many',
  dateFrom: 'From',
  dateTo: 'To',
  countryCode: 'Country code',
  ratingStar: '{count, plural, one {# star} other {# stars}}',
  removeTag: 'Remove {tag}',
  tagAdded: 'Added {tag}',
  tagRemoved: 'Removed {tag}',
  tagDuplicate: '{tag} is already in the list',
  multiSelectHint: 'Hold Ctrl or ⌘ to choose more than one',
  opensInNewTab: 'opens in a new tab',
  captchaLabel: 'Security check',

  chooseFile: 'Choose a file',
  chooseFiles: 'Choose files',
  dropHint: '{multiple, select, true {or drop files here} other {or drop a file here}}',
  uploading: 'Uploading, {percent}%',
  uploaded: 'Uploaded',
  uploadFailed: 'Upload failed',
  uploadsFailed: '{count, plural, one {A file was not uploaded} other {# files were not uploaded}}. Retry or remove it.',
  retryUpload: 'Retry',
  removeFile: 'Remove {name}',
  fileTooLarge: '{name} is larger than {size}',
  fileType: '{name} is not an accepted file type',
  filesAdded: '{count, plural, one {# file added} other {# files added}}',
  fileRemoved: 'Removed {name}',
  cropTitle: 'Crop the image',
  cropHint: 'Drag the image, or use the sliders, to choose the part to keep.',
  cropZoom: 'Zoom',
  cropX: 'Horizontal position',
  cropY: 'Vertical position',
  cropApply: 'Use image',
  cropCancel: 'Cancel',
  signaturePad: 'Signature. Draw with a mouse, finger or pen.',
  signatureClear: 'Clear',
  signatureType: 'Type instead',
  signatureDraw: 'Draw instead',
  signatureName: 'Your full name',
  signatureSigned: 'Signed',

  strength: 'Password strength: {level}',
  strengthLevels: '{score, select, 0 {Too weak} 1 {Weak} 2 {Fair} 3 {Good} other {Strong}}',
  ruleLength: 'At least {min, plural, one {# character} other {# characters}}',
  ruleCase: 'Upper and lower case letters',
  ruleNumber: 'A number',
  ruleSymbol: 'A symbol',
  ruleMet: 'done',
  ruleUnmet: 'not yet',
  weakPassword: 'Choose a stronger password',

  invalidSubmit: '{count, plural, one {# field needs} other {# fields need}} attention.',
  submitFailed: 'Something went wrong. Please try again.',
  unsavedChanges: 'You have unsaved changes. Leave this page?',
  errorSummaryTitle: 'There is a problem',
  loading: 'Loading…',
  loadFailed: 'The form could not be loaded.',
  draftRestored: 'Your unsaved changes from {time} were restored.',
  discardDraft: 'Discard changes',
  draftDiscarded: 'Your unsaved changes were discarded.',
  undone: 'Undone',
  redone: 'Redone',
};

type ConfigSource = NguMessagesConfig | Signal<NguMessagesConfig>;

/** Configs provided at one injector level. */
const NGU_MESSAGES_HERE = new InjectionToken<readonly ConfigSource[]>('NGU_MESSAGES_HERE');

/**
 * Every message config in effect for an injector, outermost first: the app's, then a lazy
 * route's, then a component's. Read it through `injectNguI18n()`.
 */
export const NGU_MESSAGES = new InjectionToken<readonly ConfigSource[]>('NGU_MESSAGES');

/**
 * Translates or rewords the texts ngu-form renders, and plugs in an i18n library.
 *
 * ```ts
 * provideNguMessages({ required: '{label} is mandatory', add: 'Add another' })
 *
 * // Transloco, ngx-translate or any lookup function; signals it reads are tracked.
 * provideNguMessages(() => {
 *   const transloco = inject(TranslocoService);
 *   const lang = toSignal(transloco.langChanges$);
 *   return computed(() => ({ locale: lang(), translate: (key, params) => transloco.translate(key, params) }));
 * })
 * ```
 *
 * Takes a config, or a factory run in an injection context that returns a config or a signal
 * of one. Can be provided at several levels (app, route, component) and more than once per
 * level; inner and later providers win, key by key.
 */
export function provideNguMessages(
  config: NguMessagesConfig | (() => NguMessagesConfig | Signal<NguMessagesConfig>),
): Provider {
  return [
    typeof config === 'function'
      ? { provide: NGU_MESSAGES_HERE, useFactory: config, multi: true }
      : { provide: NGU_MESSAGES_HERE, useValue: config, multi: true },
    // Multi providers do not reach across injectors, so each level adds its configs to the
    // ones above it: a component's `{ required }` keeps the app's `translate` and `locale`.
    {
      provide: NGU_MESSAGES,
      useFactory: () => [
        ...(inject(NGU_MESSAGES, { skipSelf: true, optional: true }) ?? []),
        ...inject(NGU_MESSAGES_HERE, { self: true }),
      ],
    },
  ];
}

type ParamsOf<K extends keyof NguMessages> = NguMessages[K] extends NguMessage<infer P> ? P : never;

/** Resolves ngu-form's own texts and the app's labels for the current language. */
export interface NguI18n {
  readonly locale: Signal<string>;
  /** A built-in message. */
  message<K extends keyof NguMessages>(key: K, ...params: {} extends ParamsOf<K> ? [ParamsOf<K>?] : [ParamsOf<K>]): string;
  /** An app string (label, hint, option label), through `translate` when one is set. */
  text(value: string): string;
  text(value: string | undefined): string | undefined;
  /** The message for a validation error on a field. */
  error(error: ValidationError, def: LeafDef): string;
  /** Formats a number for the locale, as in messages. */
  number(value: number, options?: Intl.NumberFormatOptions): string;
}

/** The `NguI18n` for the current injector. Call it in an injection context. */
export function injectNguI18n(): NguI18n {
  const configs = inject(NGU_MESSAGES, { optional: true }) ?? [];
  const locale = inject(LOCALE_ID, { optional: true }) ?? 'en-US';
  return createNguI18n(configs, locale);
}

/** Builds an `NguI18n` from configs (later ones win) and a fallback locale. */
export function createNguI18n(configs: readonly ConfigSource[] = [], fallbackLocale = 'en-US'): NguI18n {
  const merged = computed<NguMessagesConfig>(() =>
    configs.reduce<NguMessagesConfig>((acc, c) => ({ ...acc, ...(isSignal(c) ? c() : c) }), {}),
  );
  const locale = computed(() => safeLocale(merged().locale ?? fallbackLocale));

  const lookup = (key: string, params?: Readonly<Record<string, unknown>>): string | undefined => {
    const translate = merged().translate;
    if (!translate) {
      return undefined;
    }
    const result = translate(key, params);
    return result == null || result === key ? undefined : result;
  };

  function message(key: keyof NguMessages, params: Record<string, unknown> = {}): string {
    // A dictionary may hold ICU templates; text a library already interpolated passes through.
    const translated = lookup(`ngu.${key}`, params);
    if (translated !== undefined) {
      return formatMessage(translated, params, locale());
    }
    const config = merged();
    const msg = (config[key] ?? NGU_DEFAULT_MESSAGES[key]) as NguMessage<Record<string, unknown>>;
    return typeof msg === 'function' ? msg(params) : formatMessage(msg, params, locale());
  }

  function text(value: string | undefined): string | undefined {
    if (value === undefined || value === '') {
      return value;
    }
    return lookup(value) ?? value;
  }

  const translated = (value: string): string => lookup(value) ?? value;

  function error(e: ValidationError, def: LeafDef): string {
    if (e.message) {
      return translated(e.message);
    }
    const label = text(def.label) || message('fieldFallback');
    const err = e as ValidationError & Record<string, any>;
    switch (e.kind) {
      case 'required':
        if (typeof def.required === 'string') {
          return translated(def.required);
        }
        return def.type === 'consent'
          ? message('consentRequired', { label })
          : def.type === 'captcha'
            ? message('captchaRequired')
            : message('required', { label });
      case 'email':
        return message('email', { label });
      case 'minLength':
        return message('minLength', { label, minLength: err['minLength'] ?? def.minLength });
      case 'maxLength':
        return message('maxLength', { label, maxLength: err['maxLength'] ?? def.maxLength });
      case 'min':
        return message('min', { label, min: err['min'] ?? def.min });
      case 'max':
        return message('max', { label, max: err['max'] ?? def.max });
      case 'minDate':
        return message('minDate', { label, min: temporal(err['minDate'], def.type) });
      case 'maxDate':
        return message('maxDate', { label, max: temporal(err['maxDate'], def.type) });
      case 'minItems':
        return message('minItems', { label, min: err['min'] });
      case 'maxItems':
        return message('maxItems', { label, max: err['max'] });
      case 'minSelected':
        return message('minSelected', { label, min: err['min'] });
      case 'maxSelected':
        return message('maxSelected', { label, max: err['max'] });
      case 'pattern':
      case 'parse':
      case 'mask':
      case 'url':
      case 'phone':
      case 'dateRange':
      case 'dateRangeIncomplete':
      case 'weakPassword':
        return message(e.kind, { label });
      case 'captchaFailed':
        return message('captchaFailed');
      case 'uploadsFailed':
        return message('uploadsFailed', { count: err['count'] ?? 1 });
      default:
        return message('invalid', { label });
    }
  }

  /** A time, month or week bound as people read it; date bounds stay `Date` values. */
  function temporal(value: unknown, type: string): unknown {
    return typeof value === 'string' ? formatTemporal(value, type, locale()) : value;
  }

  return {
    locale,
    message: message as NguI18n['message'],
    text: text as NguI18n['text'],
    error,
    number: (value, options) => numberFormat(locale(), options).format(value),
  };
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

const pluralCache = new Map<string, Intl.PluralRules>();
const numberCache = new Map<string, Intl.NumberFormat>();
const dateCache = new Map<string, Intl.DateTimeFormat>();

function pluralRules(locale: string): Intl.PluralRules {
  let rules = pluralCache.get(locale);
  if (!rules) {
    rules = new Intl.PluralRules(safeLocale(locale));
    pluralCache.set(locale, rules);
  }
  return rules;
}

function numberFormat(locale: string, options?: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = options ? `${locale}|${JSON.stringify(options)}` : locale;
  let format = numberCache.get(key);
  if (!format) {
    // Group thousands only from five digits, so years and codes read naturally.
    format = new Intl.NumberFormat(
      safeLocale(locale),
      options ?? ({ useGrouping: 'min2' } as unknown as Intl.NumberFormatOptions),
    );
    numberCache.set(key, format);
  }
  return format;
}

function dateFormat(locale: string): Intl.DateTimeFormat {
  let format = dateCache.get(locale);
  if (!format) {
    // Date values in the model are midnight UTC, as date inputs produce them.
    format = new Intl.DateTimeFormat(safeLocale(locale), { dateStyle: 'medium', timeZone: 'UTC' });
    dateCache.set(locale, format);
  }
  return format;
}

/**
 * Formats the value of a `time`, `datetime-local` or `month` input for the locale, such as
 * "9:30 AM" or "January 2026". Week values and anything unreadable are returned as written.
 */
export function formatTemporal(value: string, type: string, locale: string): string {
  const loc = safeLocale(locale);
  const n = (s: string | undefined) => Number(s ?? 0);
  let m: RegExpExecArray | null;
  if (type === 'time' && (m = /^(\d{2}):(\d{2})(?::(\d{2}))?/.exec(value))) {
    const options: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' };
    return new Intl.DateTimeFormat(loc, m[3] ? { ...options, second: '2-digit' } : options).format(
      Date.UTC(1970, 0, 1, n(m[1]), n(m[2]), n(m[3])),
    );
  }
  if (type === 'datetime-local' && (m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value))) {
    return new Intl.DateTimeFormat(loc, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(
      Date.UTC(n(m[1]), n(m[2]) - 1, n(m[3]), n(m[4]), n(m[5])),
    );
  }
  if (type === 'month' && (m = /^(\d{4})-(\d{2})$/.exec(value))) {
    return new Intl.DateTimeFormat(loc, { year: 'numeric', month: 'long', timeZone: 'UTC' }).format(
      Date.UTC(n(m[1]), n(m[2]) - 1, 1),
    );
  }
  return value;
}

function display(value: unknown, locale: string): string {
  if (typeof value === 'number') {
    return numberFormat(locale).format(value);
  }
  if (isDate(value)) {
    return isNaN(value.getTime()) ? '' : dateFormat(locale).format(value);
  }
  try {
    return value == null ? '' : String(value);
  } catch {
    return ''; // an object without toString
  }
}

/**
 * Fills an ICU-style template: `{name}`, `{n, plural, ...}` and `{v, select, ...}`.
 * Unknown placeholders are left as written so mistakes stay visible.
 */
export function formatMessage(template: string, params: Readonly<Record<string, unknown>>, locale = 'en-US'): string {
  let out = '';
  let i = 0;
  while (i < template.length) {
    const ch = template[i];
    if (ch !== '{') {
      out += ch;
      i++;
      continue;
    }
    const end = closingBrace(template, i);
    if (end < 0) {
      out += template.slice(i);
      break;
    }
    out += placeholder(template.slice(i + 1, end), params, locale);
    i = end + 1;
  }
  return out;
}

function closingBrace(text: string, open: number): number {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === '{') {
      depth++;
    } else if (text[i] === '}' && --depth === 0) {
      return i;
    }
  }
  return -1;
}

function placeholder(body: string, params: Readonly<Record<string, unknown>>, locale: string): string {
  const first = body.indexOf(',');
  if (first < 0) {
    const name = body.trim();
    return Object.hasOwn(params, name) ? display(params[name], locale) : `{${body}}`;
  }
  const name = body.slice(0, first).trim();
  const rest = body.slice(first + 1);
  const second = rest.indexOf(',');
  const kind = (second < 0 ? rest : rest.slice(0, second)).trim();
  const branches = parseBranches(second < 0 ? '' : rest.slice(second + 1));
  const value = params[name];

  if (kind === 'plural') {
    const n = Number(value);
    const branch = branches.get(`=${n}`) ?? branches.get(pluralRules(locale).select(n)) ?? branches.get('other') ?? '';
    return formatMessage(replaceHash(branch, display(n, locale)), params, locale);
  }
  if (kind === 'select') {
    const branch = branches.get(String(value)) ?? branches.get('other') ?? '';
    return formatMessage(branch, params, locale);
  }
  return display(value, locale);
}

/** Replaces `#` outside nested placeholders, so an inner plural keeps its own count. */
function replaceHash(branch: string, value: string): string {
  let out = '';
  let depth = 0;
  for (const ch of branch) {
    if (ch === '{') {
      depth++;
    } else if (ch === '}') {
      depth--;
    }
    out += ch === '#' && depth === 0 ? value : ch;
  }
  return out;
}

/** `one {# item} other {# items}` → Map { one → '# item', other → '# items' }. */
function parseBranches(text: string): Map<string, string> {
  const branches = new Map<string, string>();
  let i = 0;
  while (i < text.length) {
    const open = text.indexOf('{', i);
    if (open < 0) {
      break;
    }
    const key = text.slice(i, open).trim();
    const end = closingBrace(text, open);
    if (end < 0) {
      break;
    }
    branches.set(key, text.slice(open + 1, end));
    i = end + 1;
  }
  return branches;
}

// ---------------------------------------------------------------------------
// Standalone helpers (English defaults), kept for apps that render errors themselves
// ---------------------------------------------------------------------------

let english: NguI18n | undefined;

/** The default English message for an error kind. */
export function defaultMessage(error: ValidationError, def: LeafDef): string {
  english ??= createNguI18n();
  return english.error({ ...error, message: undefined } as ValidationError, def);
}

/** First error's message, falling back to the default English message for its kind. */
export function errorMessage(errors: readonly ValidationError[], def: LeafDef, i18n?: NguI18n): string | undefined {
  const first = errors[0];
  if (!first) {
    return undefined;
  }
  english ??= createNguI18n();
  return (i18n ?? english).error(first, def);
}
