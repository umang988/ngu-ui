import { computed, isSignal, signal, type Signal, type WritableSignal } from '@angular/core';
import { toDateBound } from './internal';
import type {
  DynamicDef,
  DynamicEntry,
  DynamicField,
  FieldType,
  FormDefinition,
  LeafDef,
  Validator,
} from './types';
import { nguError } from './diagnostics';

/** Normalizes a `{ fields, ... }` spec for a `Record<string, V>` property. */
export function normalizeDynamic(spec: Record<string, unknown>, path: string): DynamicDef {
  const { fields, keepRemoved, cols, ...rest } = spec as {
    fields: Signal<readonly DynamicField[]> | readonly DynamicField[];
    keepRemoved?: boolean;
    cols?: DynamicDef['cols'];
  } & Record<string, unknown>;
  const list: Signal<readonly DynamicField[]> = isSignal(fields) ? fields : signal(fields);

  // Compile each field once and reuse the result while the field object is unchanged.
  const cache = new WeakMap<DynamicField, DynamicEntry>();
  const entries = computed<ReadonlyMap<string, DynamicEntry>>(() => {
    const map = new Map<string, DynamicEntry>();
    for (const field of list()) {
      if (map.has(field.key)) {
        throw nguError('NGU-111', `"${path}" has two run-time fields with key "${field.key}". Keys must be unique.`);
      }
      let entry = cache.get(field);
      if (!entry) {
        entry = compile(field);
        cache.set(field, entry);
      }
      map.set(field.key, entry);
    }
    return map;
  });

  return {
    __ngu: 'dynamic',
    ...rest,
    cols: cols ?? 1,
    keepRemoved: keepRemoved ?? false,
    entries,
  };
}

export function isDynamicSpec(spec: unknown, value: unknown): spec is Record<string, unknown> {
  if (typeof spec !== 'object' || spec === null || typeof value !== 'object' || value === null) {
    return false;
  }
  const fields = (spec as Record<string, unknown>)['fields'];
  return Array.isArray(fields) || isSignal(fields);
}

function compile(field: DynamicField): DynamicEntry {
  const type = (field.type ?? inferType(field.default)) as LeafDef['type'];
  const pattern =
    typeof field.pattern === 'string' ? new RegExp(`^(?:${field.pattern})$`) : field.pattern;
  const multiple =
    field.multiple ?? (Array.isArray(field.default) || type === 'tags' || (type === 'checkbox' && !!field.options));
  const leaf: LeafDef = {
    __ngu: 'leaf',
    type,
    label: field.label,
    placeholder: field.placeholder,
    hint: field.hint,
    autocomplete: field.autocomplete,
    span: field.span,
    required: field.required,
    prefix: field.prefix,
    suffix: field.suffix,
    prefixIcon: field.prefixIcon,
    suffixIcon: field.suffixIcon,
    inputmode: field.inputmode,
    enterkeyhint: field.enterkeyhint,
    counter: field.counter,
    reveal: field.reveal,
    rows: field.rows,
    maxRows: field.maxRows,
    minLength: field.minLength,
    maxLength: field.maxLength,
    pattern,
    min: field.min,
    max: field.max,
    step: field.step,
    mask: field.mask,
    errorsOn: field.errorsOn,
    debounce: field.debounce,
    pendingText: field.pendingText,
    choices: field.options,
    multiple: multiple || undefined,
    currency: field.currency,
    length: field.length,
    characters: field.characters,
    countries: field.countries,
    country: field.country,
    policy: field.policy,
    separators: field.separators,
    fromLabel: field.fromLabel,
    toLabel: field.toLabel,
  };
  const validators: Validator<any, any, any>[] = field.validate
    ? Array.isArray(field.validate)
      ? [...field.validate]
      : [field.validate as Validator<any, any, any>]
    : [];
  const dates = type === 'date' ? { minDate: toDateBound(field.min), maxDate: toDateBound(field.max) } : {};
  return { leaf, field, pattern, hidden: compileHidden(field), validators, ...dates };
}

function compileHidden(field: DynamicField): DynamicEntry['hidden'] {
  const { showIf, hidden } = field;
  if (!showIf && !hidden) {
    return undefined;
  }
  return (model, values) => {
    if (hidden?.(model, values)) {
      return true;
    }
    if (!showIf) {
      return false;
    }
    const other = values?.[showIf.key];
    if ('equals' in showIf && other !== showIf.equals) {
      return true;
    }
    if ('notEquals' in showIf && other === showIf.notEquals) {
      return true;
    }
    if (showIf.in && !showIf.in.includes(other)) {
      return true;
    }
    return false;
  };
}

function inferType(value: unknown): FieldType {
  switch (typeof value) {
    case 'number':
      return 'number';
    case 'boolean':
      return 'checkbox';
    default:
      return 'text';
  }
}

function defaultValue(entry: DynamicEntry): unknown {
  if (entry.field.default !== undefined) {
    return entry.field.default;
  }
  if (entry.leaf.multiple) {
    return [];
  }
  switch (entry.leaf.type) {
    case 'number':
    case 'currency':
    case 'rating':
      return 0;
    case 'range':
      return typeof entry.field.min === 'number' ? entry.field.min : 0;
    case 'checkbox':
    case 'switch':
      return false;
    case 'consent':
      return null;
    case 'daterange':
      return { from: '', to: '' };
    default:
      return '';
  }
}

// ---------------------------------------------------------------------------
// Keeping the model's keys in line with the field list
// ---------------------------------------------------------------------------

export interface DynamicLocation {
  readonly keys: readonly string[];
  readonly def: DynamicDef;
}

/**
 * Finds every run-time field list. Inside arrays the path holds `'[]'` for "each row", so
 * each row's record is kept in line with the list.
 */
export function findDynamic(fields: FormDefinition, keys: readonly string[] = []): DynamicLocation[] {
  const found: DynamicLocation[] = [];
  for (const [key, def] of Object.entries(fields)) {
    const here = [...keys, key];
    if (def.__ngu === 'dynamic') {
      found.push({ keys: here, def });
    } else if (def.__ngu === 'group') {
      found.push(...findDynamic(def.fields, here));
    } else if (def.__ngu === 'array' && def.item.__ngu !== 'leaf') {
      found.push(...findDynamic(def.item as FormDefinition, [...here, '[]']));
    }
  }
  return found;
}

/**
 * Adds a default value for every listed field that is missing from the model and,
 * unless `keepRemoved`, drops values of fields that are no longer listed.
 * Writes only when something changed.
 */
export function syncDynamic(model: WritableSignal<any>, locations: readonly DynamicLocation[]): void {
  let next = model();
  for (const { keys, def } of locations) {
    next = syncAt(next, keys, def);
  }
  if (next !== model()) {
    model.set(next);
  }
}

/**
 * Returns `value` itself when nothing changed. Changed objects are copied with spread, which
 * keeps the symbol Signal Forms tags each array row with, so rows keep their state.
 */
function syncAt(value: any, keys: readonly string[], def: DynamicDef): any {
  if (typeof value !== 'object' || value === null) {
    return value;
  }
  if (keys.length === 0) {
    return Array.isArray(value) ? value : (syncRecord(value, def) ?? value);
  }
  const [head, ...tail] = keys;
  if (head === '[]') {
    if (!Array.isArray(value)) {
      return value;
    }
    let changed = false;
    const rows = value.map((row) => {
      const next = syncAt(row, tail, def);
      changed ||= next !== row;
      return next;
    });
    return changed ? rows : value;
  }
  const child = syncAt(value[head], tail, def);
  return child === value[head] ? value : { ...value, [head]: child };
}

function syncRecord(current: Record<string, unknown>, def: DynamicDef): Record<string, unknown> | undefined {
  const entries = def.entries();
  let changed = false;
  const out: Record<string, unknown> = {};
  for (const [key, entry] of entries) {
    if (key in current) {
      out[key] = current[key];
    } else {
      out[key] = defaultValue(entry);
      changed = true;
    }
  }
  for (const key of Object.keys(current)) {
    if (!entries.has(key)) {
      if (def.keepRemoved) {
        out[key] = current[key];
      } else {
        changed = true;
      }
    }
  }
  return changed ? out : undefined;
}
