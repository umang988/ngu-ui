/**
 * A description of a form's fields, built from a TypeScript interface, a JSON Schema or a
 * formly config, and turned into ngu-form code by `emit.ts`.
 */
export type FieldModel = TextModel | NumberModel | BooleanModel | DateModel | ChoiceModel | TagsModel | GroupModel | ListModel | RecordModel | UnknownModel;

interface Base {
  /** Property name. */
  readonly key: string;
  readonly label: string;
  readonly hint?: string;
  readonly required?: boolean;
  /** `null` is a valid value. */
  readonly nullable?: boolean;
  /** Something the generator could not carry over, written as a TODO comment. */
  readonly todo?: string;
}

export interface TextModel extends Base {
  readonly kind: 'text';
  /** ngu-form `type`, when not plain text. */
  readonly type?: 'email' | 'password' | 'url' | 'tel' | 'search' | 'textarea' | 'date' | 'datetime-local' | 'time' | 'color';
  readonly minLength?: number;
  readonly maxLength?: number;
  /** Source of a RegExp, without slashes. */
  readonly pattern?: string;
  readonly initial?: string;
  readonly placeholder?: string;
}

export interface NumberModel extends Base {
  readonly kind: 'number';
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  readonly initial?: number;
}

export interface BooleanModel extends Base {
  readonly kind: 'boolean';
  readonly initial?: boolean;
}

/** A `Date` in the model. */
export interface DateModel extends Base {
  readonly kind: 'date';
}

export interface ChoiceModel extends Base {
  readonly kind: 'choice';
  readonly values: readonly (string | number)[];
  readonly labels?: readonly string[];
  /** A list of the values (checkboxes) rather than one. */
  readonly multiple: boolean;
  readonly initial?: string | number | readonly (string | number)[];
  readonly minItems?: number;
  readonly maxItems?: number;
}

/** Free text `string[]`. */
export interface TagsModel extends Base {
  readonly kind: 'tags';
  readonly minItems?: number;
  readonly maxItems?: number;
}

export interface GroupModel extends Base {
  readonly kind: 'group';
  readonly fields: readonly FieldModel[];
  /** Name of the interface it comes from, for the item type of lists. */
  readonly typeName?: string;
}

export interface ListModel extends Base {
  readonly kind: 'list';
  readonly item: FieldModel;
  readonly min?: number;
  readonly max?: number;
}

/** `Record<string, string>`: fields that arrive at run time. */
export interface RecordModel extends Base {
  readonly kind: 'record';
}

export interface UnknownModel extends Base {
  readonly kind: 'unknown';
  /** The TypeScript type, as written. */
  readonly tsType: string;
}

/** "firstName" → "First name", "zip_code" → "Zip code", "URL" → "URL". */
export function humanize(key: string): string {
  const words = key
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .trim()
    .split(/\s+/);
  return words
    .map((w, i) => (/^[A-Z0-9]{2,}$/.test(w) ? w : i === 0 ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w.toLowerCase()))
    .join(' ');
}

/** A text type guessed from a property name, for interfaces that only say `string`. */
export function textTypeFor(key: string): TextModel['type'] | undefined {
  const k = key.toLowerCase();
  if (/e-?mail/.test(k)) {
    return 'email';
  }
  if (/password|passcode/.test(k)) {
    return 'password';
  }
  if (/(^|_)(url|website|homepage|link)$|url$/.test(k)) {
    return 'url';
  }
  if (/phone|mobile|^tel$/.test(k)) {
    return 'tel';
  }
  if (/(bio|description|notes?|comments?|message|about|summary)$/.test(k)) {
    return 'textarea';
  }
  return undefined;
}
