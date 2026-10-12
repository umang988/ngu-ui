import type { Injector, Signal, WritableSignal } from '@angular/core';
import type { FieldTree } from '@angular/forms/signals';
import type { NguCaptchaAdapter } from './captcha';

/**
 * A function evaluated against the whole form model. Inside an array item it also
 * receives that item as the second argument.
 */
export type LogicFn<TModel, R, TScope = TModel> = (model: TModel, scope: TScope) => R;

export type FieldType =
  | 'text'
  | 'email'
  | 'password'
  | 'textarea'
  | 'number'
  | 'date'
  | 'checkbox'
  | 'select'
  | 'radio'
  | 'url'
  | 'search'
  | 'tel'
  | 'color'
  | 'time'
  | 'datetime-local'
  | 'month'
  | 'week'
  | 'range'
  | 'switch'
  | 'segmented'
  | 'currency'
  | 'rating'
  | 'daterange'
  | 'otp'
  | 'phone'
  | 'tags'
  | 'consent'
  | 'captcha';

/**
 * Custom field types, augmented by apps: maps a `type` name to the value type it edits.
 *
 * ```ts
 * declare module 'ngu-form' {
 *   interface NguFieldTypeMap { mood: number }
 * }
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface NguFieldTypeMap {}

/**
 * Extra spec options of custom types, augmented next to `NguFieldTypeMap`. The renderer
 * reads them from its `def` input.
 *
 * ```ts
 * declare module 'ngu-form' {
 *   interface NguFieldTypeMap { mood: number }
 *   interface NguFieldOptionsMap { mood: { faces?: readonly string[] } }
 * }
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface NguFieldOptionsMap {}

/** Names of the custom types whose value type accepts `V`. */
export type CustomTypeFor<V> = {
  [K in keyof NguFieldTypeMap]: [V] extends [NguFieldTypeMap[K]] ? K : never;
}[keyof NguFieldTypeMap];

/** The options a custom type declared in `NguFieldOptionsMap`. */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
type OptionsOf<K> = K extends keyof NguFieldOptionsMap ? NguFieldOptionsMap[K] : {};

export interface Choice<V> {
  readonly value: V;
  readonly label: string;
  readonly disabled?: boolean;
}

/** Static list or a signal, so options can be loaded at run time. */
export type Choices<V> = readonly Choice<V>[] | Signal<readonly Choice<V>[]>;

/**
 * Options as a list, a signal, or a function of the model for cascading selects. When a
 * function's list no longer contains the current value, the value is cleared.
 */
export type OptionsSpec<V, TModel, TScope = TModel> = Choices<V> | LogicFn<TModel, readonly Choice<V>[], TScope>;

/** Breakpoint names for responsive columns. Widths are set with `provideNguFormConfig`. */
export type Breakpoint = 'sm' | 'md' | 'lg';

/**
 * Grid columns. A number collapses to one column when the form is narrower than the `sm`
 * breakpoint. An object picks the largest breakpoint the form's width reaches.
 */
export type Cols = number | ({ readonly base?: number } & { readonly [B in Breakpoint]?: number });

/** Passed to `onChange`. `patchItem` patches the current array item, or the model outside arrays. */
export interface ChangeContext<V, TModel, TScope = TModel> {
  /** The value before this change. */
  readonly previous: V;
  readonly model: TModel;
  readonly scope: TScope;
  /** Deep-merges into the model. Arrays are replaced. */
  patch(partial: DeepPartial<TModel>): void;
  /** Deep-merges into the current array item, or into the model outside arrays. */
  patchItem(partial: DeepPartial<TScope>): void;
}

/** Mobile keyboard type, the HTML `inputmode` attribute. */
export type InputMode = 'none' | 'text' | 'decimal' | 'numeric' | 'tel' | 'search' | 'email' | 'url';

/** Label of the Enter key on mobile keyboards, the HTML `enterkeyhint` attribute. */
export type EnterKeyHint = 'enter' | 'done' | 'go' | 'next' | 'previous' | 'search' | 'send';

export interface TextRules {
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
}

export interface NumberRules {
  min?: number;
  max?: number;
  step?: number;
}

/** What a validator may return: a message, an error object, or nothing when valid. */
export type ValidationResult = string | { kind: string; message?: string } | undefined | null | void;

/** Sync validator. `scope` is the current array item, or the model when not in an array. */
export type Validator<V, TModel, TScope = TModel> = (value: V, model: TModel, scope: TScope) => ValidationResult;

/** Async validator. Runs after the sync rules pass; cancelled through `abort` on new input. */
export type AsyncValidator<V, TModel, TScope = TModel> = (
  value: V,
  model: TModel,
  scope: TScope,
  abort: AbortSignal,
) => Promise<ValidationResult>;

/**
 * When a field shows its validation messages.
 *
 * - `dirty`: after the user changed the field and left it. Fields that were only
 *   focused stay quiet. This is the default.
 * - `touched`: as soon as the field loses focus, even if nothing was typed.
 * - `submit`: only after a submit attempt.
 *
 * A submit attempt always reveals every remaining error.
 */
export type ErrorDisplay = 'dirty' | 'touched' | 'submit';

/**
 * The Standard Schema interface (https://standardschema.dev), implemented by Zod, Valibot,
 * ArkType and others. Only the parts ngu-form uses are listed.
 */
export interface StandardSchemaV1<Input = unknown, Output = Input> {
  readonly '~standard': {
    readonly version: 1;
    readonly vendor: string;
    readonly validate: (value: unknown) => StandardSchemaResult<Output> | Promise<StandardSchemaResult<Output>>;
    readonly types?: { readonly input: Input; readonly output: Output } | undefined;
  };
}

export type StandardSchemaResult<Output> =
  | { readonly value: Output; readonly issues?: undefined }
  | {
      readonly issues: readonly {
        readonly message: string;
        readonly path?: readonly (PropertyKey | { readonly key: PropertyKey })[] | undefined;
      }[];
    };

export interface ValidationSpec<V, TModel, TScope = TModel> {
  /** One or more custom rules. The returned string becomes the message. */
  validate?: Validator<V, TModel, TScope> | readonly Validator<V, TModel, TScope>[];
  /** A server-side or otherwise async rule. */
  validateAsync?: AsyncValidator<V, TModel, TScope>;
  /** Delay, in ms, before typing reaches the model and the validators. */
  debounce?: number;
  /** Text shown while `validateAsync` runs. Defaults to "Checking…". */
  pendingText?: string;
}

// ---------------------------------------------------------------------------
// Spec: what you write
// ---------------------------------------------------------------------------

/** Options every input accepts. */
export interface BaseFieldSpec<V, TModel, TScope = TModel> extends ValidationSpec<V, TModel, TScope> {
  label?: string;
  placeholder?: string;
  hint?: string;
  /** HTML `autocomplete` token, for example `email`, `current-password` or `off`. */
  autocomplete?: string;
  /** Number of grid columns this field spans inside its group. */
  span?: number;
  /**
   * `true` for the default message, or a string for a custom one. A function makes the field
   * required while it returns `true` or a message.
   */
  required?: boolean | string | LogicFn<TModel, boolean | string, TScope>;
  hidden?: LogicFn<TModel, boolean, TScope>;
  disabled?: boolean | LogicFn<TModel, boolean, TScope>;
  readonly?: boolean | LogicFn<TModel, boolean, TScope>;
  /** Derives the value from the model. The field becomes read-only and updates live. */
  compute?: LogicFn<TModel, V, TScope>;
  /**
   * Runs after the user changes this field, for side effects such as copying an address.
   * Writes made here, by `patch` or anywhere else in code, never trigger `onChange` again.
   */
  onChange?: (value: V, ctx: ChangeContext<V, TModel, TScope>) => void;
  /** Text shown before or after the control, such as a currency sign or a unit. */
  prefix?: string;
  suffix?: string;
  /**
   * Name of an icon registered with `provideNguIcons`, shown before or after the control,
   * inside its border. Icons are decorative; the label still names the field.
   */
  prefixIcon?: string;
  suffixIcon?: string;
  /** Mobile keyboard. Inferred for `email` and for number fields that cannot go negative. */
  inputmode?: InputMode;
  /** Label of the Enter key on mobile keyboards. */
  enterkeyhint?: EnterKeyHint;
  /** When this field shows its errors. Overrides `errorsOn` on `<ngu-form>`. */
  errorsOn?: ErrorDisplay;
  /**
   * Non-blocking checks, such as "this looks like a typo". The returned text is shown in a
   * warning style once the field would show errors, and never prevents a submit.
   */
  warn?: Validator<V, TModel, TScope> | readonly Validator<V, TModel, TScope>[];
  /** Keep this field out of saved drafts. Password fields are never saved. */
  persist?: boolean;
  /**
   * Position inside its group, like CSS `order`: entries sort by it, lowest first, and
   * entries without it count as `0` and keep their model order.
   */
  order?: number;
  /** The text shown for the value in view mode (`<ngu-view>` and the review step). */
  display?: (value: V, model: TModel) => string;
}

/**
 * Converts between the text in the input and the model value, for example to trim, change
 * case or read a custom format. The input shows `format(value)` again when it loses focus.
 */
export interface TransformOptions<V> {
  /**
   * Turns the typed text into the model value. Throw an `Error` to report the text as
   * unreadable; its message is shown, and the model keeps its last good value.
   */
  parse?: (text: string) => V;
  /** Turns the model value into the text shown in the input. */
  format?: (value: V) => string;
}

/** A pattern the input is formatted to while typing; the model holds only the typed characters. */
export interface MaskOptions {
  /**
   * `0` is a digit, `a` a letter, `*` a letter or digit; anything else is shown as written.
   * For example `'(000) 000-0000'` or `'0000 0000 0000 0000'`. A partly filled value is an
   * error with kind `mask`.
   */
  mask?: string;
}

/** Display and read a number with the active locale's digits and separators. */
export interface LocalizedNumberOptions {
  /**
   * `true`, or `Intl.NumberFormat` options such as `{ minimumFractionDigits: 2 }`. The input
   * becomes a text input; `1234.5` shows as "1,234.5" in `en`, "1.234,5" in `de` and
   * "١٬٢٣٤٫٥" in `ar`. Typing accepts the locale's separators and digits.
   */
  localized?: boolean | Intl.NumberFormatOptions;
}

/** One line of the password checklist. */
export interface StrengthRule {
  readonly label: string;
  readonly test: (value: string) => boolean;
}

/** Options for the password strength meter. */
export interface StrengthOptions {
  /**
   * Lowest score (0 to 4) that is accepted. Below it the field has an error with kind
   * `weakPassword`. Without it the meter only advises.
   */
  min?: number;
  /** The checklist. Defaults: length (`minLength` or 8), upper and lower case, a number, a symbol. */
  rules?: readonly StrengthRule[];
  /** Score from 0 to 4, for example from zxcvbn. Defaults to the share of rules met. */
  score?: (value: string) => number;
}

/** Bounds for date fields: a `Date`, or an ISO date string such as `'2026-01-31'`. */
export interface DateRules {
  min?: Date | string;
  max?: Date | string;
}

/** Options for text, password and textarea inputs. */
export interface TextInputOptions {
  /** Show a character counter. Defaults to `true` on text and textarea fields with `maxLength`. */
  counter?: boolean;
  /** Show a button that reveals the password. Defaults to `true` on password fields. */
  reveal?: boolean;
  /** Textarea height in rows. */
  rows?: number;
  /** Textarea grows with its content up to this many rows. */
  maxRows?: number;
}

/**
 * Bounds for `time`, `datetime-local`, `month` and `week` fields, written in the input's own
 * format: `'09:00'`, `'2026-01-31T09:00'`, `'2026-01'` or `'2026-W05'`.
 */
export interface TimeRules {
  min?: string;
  max?: string;
  /** In seconds for `time` and `datetime-local` (`900` is 15 minutes), else in months or weeks. */
  step?: number;
}

/** Limits on the number of entries in a list value: chosen options, tags or files. */
export interface ListRules {
  min?: number;
  max?: number;
}

/** Options for one-time code fields. */
export interface OtpOptions {
  /** Number of characters. Default 6. */
  length?: number;
  /** `'digits'` (default) or `'alphanumeric'`. */
  characters?: 'digits' | 'alphanumeric';
}

/** Options for phone fields. The value is an E.164 number such as `'+919876543210'`. */
export interface PhoneOptions {
  /** ISO 3166 codes of the countries offered, in this order, such as `['IN', 'US']`. Default: all. */
  countries?: readonly string[];
  /** Country picked while the value is empty. Defaults to the locale's region, else the first one. */
  country?: string;
}

/** Options for amount fields. The model holds a number; the input shows it for the locale. */
export interface CurrencyOptions {
  /** ISO 4217 code such as `'INR'` or `'EUR'`. Without it, an amount with two decimals. */
  currency?: string;
}

/** Options for consent checkboxes. The value is the time of acceptance, or `null`. */
export interface ConsentOptions {
  /** A link shown after the label, such as the terms of service. It opens in a new tab. */
  policy?: { readonly href: string; readonly label: string };
}

/** Options for captcha fields. The value is the token the provider issued, or `''`. */
export interface CaptchaOptions {
  /** The provider for this field. Defaults to the one from `provideNguCaptcha`. */
  captcha?: NguCaptchaAdapter;
}

/** Options for tags fields. */
export interface TagsOptions {
  /**
   * Keys that finish a tag while typing; pasted text is also split on them and on new lines.
   * Enter always adds the tag. Default `[',']`.
   */
  separators?: readonly string[];
  /** Longest tag, in characters. */
  maxLength?: number;
}

/** Options for date range fields. */
export interface DateRangeOptions {
  /** Labels of the two inputs. Default "From" and "To", from the message catalog. */
  fromLabel?: string;
  toLabel?: string;
}

/** Spec for a `string` property. Defaults to a text input. */
export type StringFieldSpec<V extends string, TModel, TScope = TModel> = BaseFieldSpec<V, TModel, TScope> &
  TextRules &
  TextInputOptions &
  (
    | ({ type?: 'text' | 'email' | 'textarea' | 'url' | 'search' | 'tel'; options?: never; strength?: never } & TransformOptions<V> &
        MaskOptions)
    | { type: 'password'; options?: never; /** Show a strength meter and checklist. */ strength?: boolean | StrengthOptions }
    | ({ type: 'date'; options?: never; strength?: never } & DateRules)
    | ({ type: 'time' | 'datetime-local' | 'month' | 'week'; options?: never; strength?: never } & TimeRules)
    | { type: 'color'; options?: never; strength?: never }
    | { type: 'select' | 'radio' | 'segmented'; options: OptionsSpec<V, TModel, TScope>; strength?: never }
    | ({ type: 'otp'; options?: never; strength?: never } & OtpOptions)
    | ({ type: 'phone'; options?: never; strength?: never } & PhoneOptions)
    | ({ type: 'captcha'; options?: never; strength?: never } & CaptchaOptions)
  );

/** Spec for a `number` property. Defaults to a number input. */
export type NumberFieldSpec<V extends number, TModel, TScope = TModel> = BaseFieldSpec<V, TModel, TScope> &
  NumberRules &
  (
    | ({ type?: 'number'; options?: never } & TransformOptions<V> & LocalizedNumberOptions)
    | { type: 'select' | 'radio' | 'segmented'; options: OptionsSpec<V, TModel, TScope> }
    | { type: 'range'; options?: never }
    | ({ type: 'currency'; options?: never } & CurrencyOptions)
    /** `max` is the number of stars (default 5); `min: 1` makes a rating necessary. */
    | { type: 'rating'; options?: never }
  );

/**
 * Spec for a `Date` property, rendered as a date input. Values are midnight UTC, as date
 * inputs produce them. When the value can be `null`, `type: 'date'` is required because the
 * input type cannot be inferred from `null`. `Date | null` can also be a consent checkbox.
 */
export type DateFieldSpec<V extends Date | null, TModel, TScope = TModel> = BaseFieldSpec<V, TModel, TScope> &
  (
    | (DateRules & (null extends V ? { type: 'date'; options?: never } : { type?: 'date'; options?: never }))
    | (null extends V ? { type: 'consent'; options?: never } & ConsentOptions : never)
  );

/** Spec for a `boolean` property: a checkbox, or a switch. */
export interface BooleanFieldSpec<TModel, TScope = TModel> extends BaseFieldSpec<boolean, TModel, TScope> {
  type?: 'checkbox' | 'switch';
}

/**
 * Spec for a `string[]` or `number[]` property edited as one field: checkboxes or a multiple
 * select over `options`, or free-text tags. `min` and `max` limit how many entries it holds.
 */
export type ListFieldSpec<V extends readonly unknown[], TModel, TScope = TModel> = BaseFieldSpec<V, TModel, TScope> &
  ListRules &
  (V extends readonly (infer U)[]
    ?
        | { type: 'checkbox' | 'select'; options: OptionsSpec<U, TModel, TScope> }
        | ([U] extends [string] ? { type: 'tags'; options?: never } & TagsOptions : never)
    : never);

/** Spec for a `{ from, to }` property edited as two date inputs, with "from before to" built in. */
export type DateRangeFieldSpec<V, TModel, TScope = TModel> = BaseFieldSpec<V, TModel, TScope> &
  DateRules &
  DateRangeOptions & { type: 'daterange'; options?: never };

/** True for `{ from, to }` objects whose ends are dates or ISO date strings. */
type IsDateRange<V> = V extends { from: infer F; to: infer T } ? ([F | T] extends [Date | string | null] ? true : false) : false;

/** The built-in rules that suit a custom type's value. */
type RulesFor<V> = [V] extends [string]
  ? TextRules
  : [V] extends [number]
    ? NumberRules
    : [V] extends [Date | null]
      ? DateRules
      : [V] extends [readonly unknown[]]
        ? ListRules
        : // eslint-disable-next-line @typescript-eslint/no-empty-object-type
          {};

/**
 * A custom-type input, registered with `provideNguFieldTypes` and declared in
 * `NguFieldTypeMap`. Its own options come from `NguFieldOptionsMap`.
 */
export type CustomFieldSpec<V, TModel, TScope = TModel> = {
  [K in CustomTypeFor<V>]: BaseFieldSpec<V, TModel, TScope> & RulesFor<V> & { type: K } & OptionsOf<K>;
}[CustomTypeFor<V>];

/** A plain string is the label; the input type is inferred from the value type. */
export type FieldSpec<V, TModel, TScope = TModel> =
  | string
  | ([V] extends [string]
      ? StringFieldSpec<V, TModel, TScope>
      : [V] extends [number]
        ? NumberFieldSpec<V, TModel, TScope>
        : [V] extends [boolean]
          ? BooleanFieldSpec<TModel, TScope>
          : never)
  | CustomFieldSpec<V, TModel, TScope>;

/** A nested object with layout options. Without options, write the fields directly. */
export interface GroupSpec<T, TModel, TScope = TModel> extends Pick<ValidationSpec<T, TModel, TScope>, 'validate'> {
  title?: string;
  description?: string;
  /** Grid columns for this group, fixed or per breakpoint. Defaults to 1. */
  cols?: Cols;
  /** Columns this group spans inside its parent group. */
  span?: number;
  hidden?: LogicFn<TModel, boolean, TScope>;
  /** Position inside the parent group; see `order` on fields. */
  order?: number;
  /**
   * `'tabs'` shows each child group or list as a tab, with a count of its problems. Use
   * `'accordion'` for collapsible panels, the first one open.
   */
  layout?: SectionLayout;
  /** Makes this group a collapsible panel: `true` starts closed, `false` starts open. */
  collapsed?: boolean;
  fields: FormSpec<T, TModel, TScope>;
}

/** How a group shows its child groups and lists. */
export type SectionLayout = 'tabs' | 'accordion';

/**
 * An array property. `item` describes one element once; the rows come from the data.
 * Logic functions inside `item` receive the current element as their second argument.
 */
export interface ArraySpec<TItem, TModel, TScope = TModel>
  extends Pick<ValidationSpec<readonly TItem[], TModel, TScope>, 'validate'> {
  title?: string;
  description?: string;
  /** Columns this list spans inside its parent group. */
  span?: number;
  hidden?: LogicFn<TModel, boolean, TScope>;
  /** One element: a field map for objects, or a field spec for primitives. */
  item: [TItem] extends [object] ? FormSpec<TItem, TModel, TItem> : FieldSpec<TItem, TModel, TItem>;
  /** Value (cloned) or factory used when a row is added. */
  newItem: TItem | (() => TItem);
  /** Minimum and maximum number of rows. */
  min?: number;
  max?: number;
  /** Button labels. Defaults: "Add" and "Remove". Set `addLabel: ''` to hide the add button. */
  addLabel?: string;
  removeLabel?: string;
  /** Grid columns inside each row, for object items. Defaults to 1. */
  cols?: Cols;
  /** Position inside the parent group; see `order` on fields. */
  order?: number;
  /** Makes the list a collapsible panel: `true` starts closed, `false` starts open. */
  collapsed?: boolean;
  /** Move up and Move down buttons on each row, and a handle to drag rows with a pointer. */
  reorder?: boolean;
  /** A button that copies a row next to itself: `true`, or the button's label. */
  duplicate?: boolean | string;
  /**
   * A one-line summary per row. Rows then start collapsed to this line and expand to edit;
   * new rows start open, and rows with problems open after a refused submit.
   */
  summary?: (item: TItem, index: number) => string;
  /**
   * `'table'` edits object items as a grid with one column per field, for line items. Below
   * the `sm` breakpoint the rows fall back to cards.
   */
  layout?: 'table';
  /**
   * Render only the rows in view, inside a scrolling box, for lists of hundreds of rows. The
   * box is `--ngu-list-height` tall (default `32rem`).
   */
  virtual?: boolean;
}

/**
 * A field whose definition arrives at run time, for example from an API. Plain data
 * except for the optional functions, so a JSON payload is a valid list of fields.
 */
export interface DynamicField<V = any, TModel = any> {
  /** Property name inside the dynamic object. */
  key: string;
  label?: string;
  /** Defaults to the type of `default`, else `text`. */
  type?: FieldType | (string & {});
  placeholder?: string;
  hint?: string;
  autocomplete?: string;
  span?: number;
  required?: boolean | string;
  prefix?: string;
  suffix?: string;
  /** Icons registered with `provideNguIcons`, by name. */
  prefixIcon?: string;
  suffixIcon?: string;
  inputmode?: InputMode;
  enterkeyhint?: EnterKeyHint;
  counter?: boolean;
  reveal?: boolean;
  rows?: number;
  maxRows?: number;
  minLength?: number;
  maxLength?: number;
  /** A RegExp, or a string that must match the whole value. */
  pattern?: RegExp | string;
  /** A number, or an ISO date string on date fields. */
  min?: number | string;
  max?: number | string;
  step?: number;
  /** Input mask, as on static fields: `'(000) 000-0000'`. */
  mask?: string;
  /**
   * The value is a list: checkboxes or a multiple select over `options`. Implied by an array
   * `default`, by `type: 'tags'`, and by `type: 'checkbox'` with `options`.
   */
  multiple?: boolean;
  /** `currency` fields: ISO 4217 code. */
  currency?: string;
  /** `otp` fields: number of characters, and which characters. */
  length?: number;
  characters?: 'digits' | 'alphanumeric';
  /** `phone` fields: countries offered and the one picked first. */
  countries?: readonly string[];
  country?: string;
  /** `consent` fields: a link shown after the label. */
  policy?: { readonly href: string; readonly label: string };
  /** `tags` fields: keys that finish a tag. */
  separators?: readonly string[];
  /** `daterange` fields: labels of the two inputs. */
  fromLabel?: string;
  toLabel?: string;
  /** When this field shows its errors. Overrides `errorsOn` on `<ngu-form>`. */
  errorsOn?: ErrorDisplay;
  /** Delay, in ms, before typing reaches the model and the validators. */
  debounce?: number;
  /** Text shown while `validateAsync` runs. */
  pendingText?: string;
  options?: readonly Choice<V>[];
  /** Value used when the field first appears. Defaults: `''`, `0` for number, `false` for checkbox. */
  default?: V;
  /** JSON-friendly condition on a sibling field. */
  showIf?: { key: string; equals?: unknown; notEquals?: unknown; in?: readonly unknown[] };
  hidden?: (model: TModel, values: Readonly<Record<string, V>>) => boolean;
  disabled?: boolean | ((model: TModel, values: Readonly<Record<string, V>>) => boolean);
  readonly?: boolean | ((model: TModel, values: Readonly<Record<string, V>>) => boolean);
  validate?:
    | Validator<V, TModel, Readonly<Record<string, V>>>
    | readonly Validator<V, TModel, Readonly<Record<string, V>>>[];
  /** A server-side check. Runs after the sync rules pass, cancelled on new input. */
  validateAsync?: AsyncValidator<V, TModel, Readonly<Record<string, V>>>;
}

/** Spec for a `Record<string, V>` property whose fields come from a signal or a list. */
export interface DynamicSpec<V, TModel, TScope = TModel> {
  title?: string;
  description?: string;
  /** Grid columns. Defaults to 1. */
  cols?: Cols;
  span?: number;
  hidden?: LogicFn<TModel, boolean, TScope>;
  /**
   * The field list, plain or as a signal (for example from an HTTP resource). An untyped
   * `DynamicField[]` from an API fits any record; inline fields get typed callbacks.
   */
  fields: Signal<readonly DynamicField<V, TModel>[]> | readonly DynamicField<V, TModel>[];
  /** Keep values of fields that disappear from the list. Default `false`: they are removed. */
  keepRemoved?: boolean;
  /** Position inside the parent group; see `order` on fields. */
  order?: number;
  /** Makes the field list a collapsible panel: `true` starts closed, `false` starts open. */
  collapsed?: boolean;
}

/** What a model property of type `V` may be described as. */
export type SpecFor<V, TModel, TScope = TModel> = [NonNullable<V>] extends [readonly (infer U)[]]
  ?
      | ArraySpec<U, TModel, TScope>
      | ([U] extends [string | number] ? ListFieldSpec<NonNullable<V>, TModel, TScope> : never)
      | CustomFieldSpec<NonNullable<V>, TModel, TScope>
  : [NonNullable<V>] extends [Date]
    ?
        | (null extends V ? never : string)
        | DateFieldSpec<Extract<V, Date | null>, TModel, TScope>
        | CustomFieldSpec<NonNullable<V>, TModel, TScope>
    : [NonNullable<V>] extends [object]
      ? string extends keyof NonNullable<V>
        ? // Record<string, V>: fields defined at run time
          DynamicSpec<NonNullable<V>[string], TModel, TScope> | CustomFieldSpec<NonNullable<V>, TModel, TScope>
        :
            | FormSpec<NonNullable<V>, TModel, TScope>
            | GroupSpec<NonNullable<V>, TModel, TScope>
            | (IsDateRange<NonNullable<V>> extends true ? DateRangeFieldSpec<NonNullable<V>, TModel, TScope> : never)
            | CustomFieldSpec<NonNullable<V>, TModel, TScope>
      : FieldSpec<NonNullable<V>, TModel, TScope>;

/** Options shared by every kind of static content. */
interface StaticBase<TModel, TScope> {
  span?: number;
  hidden?: LogicFn<TModel, boolean, TScope>;
  /** Position inside the group; see `order` on fields. */
  order?: number;
}

/**
 * Content between fields that has no model key: a heading, a paragraph or a divider.
 * Written under a key that starts with `$`, such as `$shipping: { heading: 'Shipping' }`.
 */
export type StaticSpec<TModel, TScope = TModel> = StaticBase<TModel, TScope> &
  (
    | { heading: string; /** Heading level. Defaults to 3, like group titles. */ level?: 2 | 3 | 4 | 5 | 6 }
    | { text: string }
    | { divider: true }
  );

/**
 * Mirrors the model: every key must be described, with a matching spec. Keys that start
 * with `$` add static content.
 */
export type FormSpec<T, TModel = T, TScope = TModel> = {
  readonly [K in keyof T]-?: SpecFor<T[K], TModel, TScope>;
} & { readonly [K in `$${string}`]: StaticSpec<TModel, TScope> };

export interface FormDefOptions<TModel = any, TPayload = TModel> {
  /** Grid columns at the root level, fixed or per breakpoint. Defaults to 1. */
  cols?: Cols;
  /** Leave the values of hidden fields out of what `(submitted)` and the action receive. */
  omitHidden?: boolean;
  /**
   * Shapes what `(submitted)` and the action receive. Runs after `omitHidden`. Server
   * errors returned by the action still use model paths.
   */
  mapValue?: (value: TModel) => TPayload;
  /**
   * A Zod, Valibot, ArkType or other Standard Schema that validates the whole model. Each
   * issue is shown on the field at its path; issues without a matching field are form errors.
   */
  schema?: StandardSchemaV1;
  /**
   * Initial data that arrives later, such as an `httpResource`. While it loads, fields render
   * as placeholders; each value it delivers resets the form to that value.
   */
  load?: FormLoader<TModel>;
  /** Save unsent changes and restore them when the user returns. */
  draft?: DraftOptions;
  /** Keep an undo history of changes: `true` or `{ limit }` (default 100 steps). */
  history?: boolean | { readonly limit?: number };
  /**
   * How the top-level groups and lists render. `'steps'` makes each one a step of a wizard,
   * `'tabs'` a tab, and `'accordion'` a collapsible panel.
   */
  layout?: FormLayout;
  /** Wizard only: end with a summary of every answer, with links back to each step. `true` or its title. */
  review?: boolean | string;
  /**
   * Wizard only: keep the current step in this URL query parameter, such as `'step'`, so the
   * browser's Back button and a reload keep the step.
   */
  stepParam?: string;
  /** Disables every field, for example while saving. A flag, a signal or a function. */
  disabled?: boolean | (() => boolean);
  /** Makes every field read-only. A flag, a signal or a function. */
  readonly?: boolean | (() => boolean);
  /** Required only when `defineForm` is called outside an injection context. */
  injector?: Injector;
}

/** How the top-level groups and lists of a form render. */
export type FormLayout = 'steps' | 'tabs' | 'accordion';

/**
 * The steps of a wizard, from `defineForm(..., { layout: 'steps' })`. `<ngu-form>` renders the
 * step list and the Back and Next buttons; use this to drive the wizard from your own controls.
 */
export interface FormSteps {
  /** Keys of the steps that are not skipped, in order; `'$review'` ends the list when `review` is on. */
  readonly keys: Signal<readonly string[]>;
  /** Key of the step on screen. */
  readonly current: Signal<string>;
  /** Position of the current step among `keys`, from 0. */
  readonly index: Signal<number>;
  readonly count: Signal<number>;
  readonly first: Signal<boolean>;
  readonly last: Signal<boolean>;
  /**
   * Shows the current step's errors and moves on when it is valid. Returns `false`, and
   * stays, while the step is invalid or an async check runs.
   */
  next(): boolean;
  /** Goes to the previous step. Values are kept. */
  back(): void;
  /**
   * Goes to a step. Earlier steps are always open; a later step only once every step before
   * it is valid. Returns whether the step changed.
   */
  goTo(key: string): boolean;
  /** True when `goTo(key)` would succeed. */
  canGoTo(key: string): boolean;
}

/** Data the form waits for. An Angular `Resource` or `httpResource` fits. */
export interface FormLoader<T> {
  readonly value: Signal<T | undefined>;
  readonly isLoading: Signal<boolean>;
  readonly error?: Signal<unknown>;
  /**
   * A resource's status. `'idle'` means there is nothing to load, such as a create form whose
   * resource has no id yet; the form then shows its initial value.
   */
  readonly status?: Signal<string>;
}

/** Where drafts are kept. Methods may return promises. */
export interface DraftStorage {
  load(key: string): unknown | Promise<unknown>;
  save(key: string, value: unknown): void | Promise<void>;
  remove(key: string): void | Promise<void>;
}

export interface DraftOptions {
  /** Storage key; include the record id when editing records, such as `'profile:42'`. */
  key: string;
  /** `'local'` (default), `'session'`, `nguIndexedDbDrafts()` or your own `DraftStorage`. */
  storage?: 'local' | 'session' | DraftStorage;
  /** Delay in ms after the last change before saving. Default 800. */
  debounce?: number;
}

/** Draft state of a form, from `defineForm({ draft })`. */
export interface FormDraft {
  /** When the restored draft was saved; `undefined` when nothing was restored. */
  readonly restoredAt: Signal<Date | undefined>;
  /** When the current draft was last saved. */
  readonly savedAt: Signal<Date | undefined>;
  /** Drops the draft and returns to the saved value (the initial or loaded value). */
  discard(): void;
}

/** Undo history of a form, from `defineForm({ history: true })`. */
export interface FormHistory {
  readonly canUndo: Signal<boolean>;
  readonly canRedo: Signal<boolean>;
  undo(): void;
  redo(): void;
  clear(): void;
}

// ---------------------------------------------------------------------------
// Normalized definition: what the renderer consumes
// ---------------------------------------------------------------------------

export interface LeafDef
  extends BaseFieldSpec<any, any, any>,
    TextRules,
    TextInputOptions,
    TransformOptions<any>,
    MaskOptions,
    LocalizedNumberOptions,
    OtpOptions,
    PhoneOptions,
    CurrencyOptions,
    ConsentOptions,
    CaptchaOptions,
    TagsOptions,
    DateRangeOptions {
  readonly __ngu: 'leaf';
  /** A built-in type, or a custom one registered with `provideNguFieldTypes`. */
  readonly type: FieldType | (string & {});
  readonly choices?: OptionsSpec<any, any, any>;
  /**
   * True when the value is a list edited as one field: checkboxes or a multiple select over
   * `choices`, or tags. `min` and `max` then count entries.
   */
  readonly multiple?: boolean;
  /** A number, a date bound on date fields, or a bound in the input's format on time fields. */
  min?: number | Date | string;
  max?: number | Date | string;
  step?: number;
  strength?: boolean | StrengthOptions;
}

/**
 * How `<ngu-field>` used on its own describes its field: the options of a spec, as plain data.
 * Rules such as `required` or `maxLength` still come from your form's schema; here they only
 * shape the markup (the asterisk, the counter, `min` and `max` attributes).
 */
export type NguFieldSpec = Omit<Partial<LeafDef>, '__ngu' | 'choices'> & {
  /** Defaults to `text`. */
  readonly type?: LeafDef['type'];
  /** Choices for `select`, `radio`, `segmented` and checkbox groups. */
  readonly options?: LeafDef['choices'];
};

/** Turns a plain field spec into the definition `<ngu-field>` renders. */
export function toLeafDef(spec: LeafDef | NguFieldSpec): LeafDef {
  if ((spec as LeafDef).__ngu === 'leaf') {
    return spec as LeafDef;
  }
  const { options, type, ...rest } = spec as NguFieldSpec;
  return { ...rest, __ngu: 'leaf', type: type ?? 'text', choices: options ?? (spec as Partial<LeafDef>).choices };
}

export interface GroupDef {
  readonly __ngu: 'group';
  readonly validate?: Validator<any, any, any> | readonly Validator<any, any, any>[];
  readonly title?: string;
  readonly description?: string;
  readonly cols?: Cols;
  readonly span?: number;
  readonly hidden?: LogicFn<any, boolean, any>;
  readonly order?: number;
  readonly layout?: 'tabs';
  readonly collapsed?: boolean;
  readonly fields: FormDefinition;
}

export interface ArrayDef {
  readonly __ngu: 'array';
  readonly validate?: Validator<any, any, any> | readonly Validator<any, any, any>[];
  readonly title?: string;
  readonly description?: string;
  readonly span?: number;
  readonly hidden?: LogicFn<any, boolean, any>;
  readonly item: FormDefinition | LeafDef;
  readonly newItem: () => unknown;
  readonly min?: number;
  readonly max?: number;
  /** Unset means the translated default; `''` hides the button. */
  readonly addLabel?: string;
  readonly removeLabel?: string;
  readonly cols: Cols;
  readonly order?: number;
  readonly collapsed?: boolean;
  readonly reorder?: boolean;
  readonly duplicate?: boolean | string;
  readonly summary?: (item: any, index: number) => string;
  readonly layout?: 'table';
  readonly virtual?: boolean;
}

/** One run-time field, compiled. */
export interface DynamicEntry {
  readonly leaf: LeafDef;
  readonly field: DynamicField<any, any>;
  readonly pattern?: RegExp;
  readonly hidden?: (model: any, values: any) => boolean;
  readonly validators: readonly Validator<any, any, any>[];
  /** Date bounds, parsed once, for date fields. */
  readonly minDate?: Date;
  readonly maxDate?: Date;
}

export interface DynamicDef {
  readonly __ngu: 'dynamic';
  readonly title?: string;
  readonly description?: string;
  readonly cols: Cols;
  readonly span?: number;
  readonly hidden?: LogicFn<any, boolean, any>;
  readonly keepRemoved: boolean;
  readonly order?: number;
  readonly collapsed?: boolean;
  /** Compiled fields by key, in list order. */
  readonly entries: Signal<ReadonlyMap<string, DynamicEntry>>;
}

/** A heading, paragraph or divider; it has no model value. */
export interface StaticDef {
  readonly __ngu: 'static';
  readonly kind: 'heading' | 'text' | 'divider';
  readonly text: string;
  readonly level: 2 | 3 | 4 | 5 | 6;
  readonly span?: number;
  readonly hidden?: LogicFn<any, boolean, any>;
  readonly order?: number;
}

export type AnyFieldDef = LeafDef | GroupDef | ArrayDef | DynamicDef | StaticDef;
export type FormDefinition = Readonly<Record<string, AnyFieldDef>>;

/** The result of `defineForm`: model, normalized definition and the live signal-forms tree. */
export interface FormDef<TModel extends object, TPayload = TModel> {
  readonly __ngu: 'form';
  readonly model: WritableSignal<TModel>;
  /** Read-only view of the model. */
  readonly value: Signal<TModel>;
  /** What `(submitted)` and the action receive: the value after `omitHidden` and `mapValue`. */
  readonly payload: Signal<TPayload>;
  readonly tree: FieldTree<TModel>;
  readonly spec: FormSpec<TModel>;
  readonly fields: FormDefinition;
  readonly cols: Cols;
  /** How the top-level groups and lists render; unset is one grid. */
  readonly layout?: FormLayout;
  /** The wizard's steps; inert unless `layout` is `'steps'`. */
  readonly steps: FormSteps;
  /** A copy of the value the form started with. */
  readonly initial: TModel;

  /** True once the user changed a field. Cleared by `reset()` and by a successful submit. */
  readonly dirty: Signal<boolean>;
  /** True once the user left a field, or after a submit attempt. */
  readonly touched: Signal<boolean>;
  /** True when every visible field is valid and no async check is running. */
  readonly valid: Signal<boolean>;
  /** True while an async validator runs. */
  readonly pending: Signal<boolean>;
  /** True while `<ngu-form>` submits: waiting for async checks, then running the action. */
  readonly submitting: Signal<boolean>;
  /**
   * The values that differ from the last saved state: the initial value, a value passed to
   * `reset` or `patch`, or the last successful submit. Arrays are included whole.
   */
  readonly changes: Signal<DeepPartial<TModel>>;

  /**
   * Restores the initial value (or `value`), clears touched and dirty state, server errors
   * and the submitted flag of any `<ngu-form>` showing this form.
   */
  reset(value?: TModel): void;
  /** Deep-merges `partial` into the model. Arrays are replaced. Does not mark fields dirty. */
  patch(partial: DeepPartial<TModel>): void;
  /** Increments on every `reset()`. Renderers use it to clear their own state. */
  readonly resets: Signal<number>;

  /** True while `load` is fetching the initial data. */
  readonly loading: Signal<boolean>;
  /** The error from `load`, if it failed. */
  readonly loadError: Signal<unknown>;
  /** Draft state; inert unless `draft` is set. */
  readonly draft: FormDraft;
  /** Undo and redo; inert unless `history` is set. */
  readonly history: FormHistory;
}

/** Distinguishes a single-input array item from a field map. */
export function isLeafDef(def: LeafDef | FormDefinition): def is LeafDef {
  return (def as LeafDef).__ngu === 'leaf';
}

// ---------------------------------------------------------------------------
// Submit, reset and patch
// ---------------------------------------------------------------------------

type PrevDepth = [never, 0, 1, 2, 3, 4, 5, 6];

/** Dot paths into a model, with numeric segments for array items: `items.0.sku`. */
export type FieldPath<T, D extends number = 6> = [D] extends [never]
  ? never
  : T extends readonly (infer U)[]
    ? `${number}` | `${number}.${FieldPath<U, PrevDepth[D]>}`
    : T extends Date
      ? never
      : T extends object
        ? { [K in keyof T & string]: K | `${K}.${FieldPath<T[K], PrevDepth[D]>}` }[keyof T & string]
        : never;

/**
 * Errors returned by a submit action, keyed by field path. `$form` is shown above the
 * submit button. Each message clears as soon as its field changes.
 */
export type SubmitErrors<T> = { readonly [P in FieldPath<T>]?: string } & { readonly $form?: string };

/** What a submit action returns: nothing on success, a form-level message, or field errors. */
export type SubmitResult<T> = SubmitErrors<T> | string | undefined | null | void;

/**
 * Runs on a valid submit. Receives the payload (the model, unless `mapValue` is set) and
 * reports errors by model path.
 */
export type SubmitAction<T, TPayload = T> = (value: TPayload) => SubmitResult<T> | Promise<SubmitResult<T>>;

/** Nested partial; arrays are replaced as a whole. */
export type DeepPartial<T> = T extends readonly unknown[]
  ? T
  : T extends Date
    ? T
    : T extends object
      ? { [K in keyof T]?: DeepPartial<T[K]> }
      : T;
