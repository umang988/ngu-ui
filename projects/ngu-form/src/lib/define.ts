import { computed, DestroyRef, effect, inject, isSignal, signal, untracked, type WritableSignal } from '@angular/core';
import { form, validateStandardSchema, type Field } from '@angular/forms/signals';
import { diff, hasDerived, runDerived, withoutHidden, type ChoiceMemory } from './derive';
import { inertDraft, setupDraft } from './draft';
import { findDynamic, isDynamicSpec, normalizeDynamic, syncDynamic } from './dynamic';
import { inertHistory, setupHistory } from './history';
import { clone, deepMerge, isDate, isPlainObject, setInternals } from './internal';
import { applyDefinition } from './schema';
import type {
  AnyFieldDef,
  ArrayDef,
  DeepPartial,
  FieldType,
  FormDef,
  FormDefOptions,
  FormDefinition,
  FormSpec,
  LeafDef,
  StaticDef,
} from './types';

/**
 * Describes a form in TypeScript. The spec mirrors the model shape:
 * a nested object becomes a grid group, an array becomes a repeatable list,
 * everything else is an input.
 *
 * ```ts
 * readonly login = defineForm({ email: '', password: '', remember: false }, {
 *   email: { label: 'Email', type: 'email', required: true },
 *   password: { label: 'Password', type: 'password', minLength: 8 },
 *   remember: 'Keep me signed in',
 * });
 * ```
 *
 * Must be called in an injection context (for example a component field
 * initializer), or be given `options.injector`.
 */
export function defineForm<TModel extends object, TPayload = TModel>(
  modelOrInitial: WritableSignal<TModel> | TModel,
  spec: NoInfer<FormSpec<TModel>>,
  options: FormDefOptions<TModel, TPayload> = {},
): FormDef<TModel, TPayload> {
  const model = isSignal(modelOrInitial)
    ? (modelOrInitial as WritableSignal<TModel>)
    : signal(modelOrInitial as TModel);
  const effectOptions = options.injector ? { injector: options.injector } : undefined;

  const fields = normalize(spec as Record<string, unknown>, untracked(model) as Record<string, unknown>, '');

  // Run-time field lists: give the model a value for every listed field now, and keep
  // it in line whenever a list (or the model, e.g. after reset) changes.
  const dynamic = findDynamic(fields);
  if (dynamic.length) {
    untracked(() => syncDynamic(model, dynamic));
    effect(() => syncDynamic(model, dynamic), effectOptions);
  }
  const schema = (root: any) => {
    applyDefinition(root, root, root, fields);
    if (options.schema) {
      validateStandardSchema(root, options.schema as never);
    }
  };
  const tree = options.injector
    ? form(model, schema, { injector: options.injector })
    : form(model, schema);
  const root = tree as unknown as Field<any>;

  // Computed values and cascading options: settle them now, so the initial value is
  // complete, then follow the model.
  if (hasDerived(fields)) {
    const memory: ChoiceMemory = new WeakMap();
    untracked(() => runDerived(root, fields, memory));
    effect(() => runDerived(root, fields, memory), effectOptions);
  }

  const initial = clone(untracked(model));
  /** What `reset()` returns to: the initial value, or the last value `load` delivered. */
  let start = initial;
  const resets = signal(0);
  const waiting = signal(false);
  /** What `changes()` compares against. */
  const baseline = signal<unknown>(clone(initial));
  const changes = computed(() => (diff(fields, model(), baseline()) ?? {}) as DeepPartial<TModel>);

  const load = options.load;
  /** True once `load` delivered a value (or right away without `load`). */
  const loaded = signal(!load);
  const loadError = computed(() => {
    const error = load?.error?.();
    return error === undefined || error === null ? undefined : error;
  });
  /** An idle resource (no request, as in a create form) has nothing to wait for. */
  const idle = computed(() => load?.status?.() === 'idle');
  const loading = computed(() =>
    load ? load.isLoading() || (!loaded() && !idle() && loadError() === undefined) : false,
  );
  if (load) {
    effect(() => {
      let value: TModel | undefined;
      try {
        value = load.value();
      } catch {
        return; // a resource in error state throws from value()
      }
      if (value !== undefined) {
        untracked(() => {
          start = clone(value);
          // Not def.reset(): a stored draft for this record must survive, to be restored next.
          resetTo(clone(value));
          history.clear();
          loaded.set(true);
        });
      }
    }, effectOptions);
  }

  const historyLimit = typeof options.history === 'object' ? (options.history.limit ?? 100) : 100;
  // Undo can bring back unsaved values; mark the form dirty so guards and drafts see them.
  const history = options.history
    ? setupHistory(model, historyLimit, effectOptions, () => {
        if (Object.keys(untracked(changes)).length) {
          root().markAsDirty();
        }
      })
    : inertHistory();
  const destroyRef = options.injector ? options.injector.get(DestroyRef) : inject(DestroyRef);
  const draft = options.draft
    ? setupDraft({
        options: options.draft,
        fields,
        root,
        model,
        changed: computed(() => root().dirty() && Object.keys(changes()).length > 0),
        ready: computed(() => (loaded() || idle()) && !loading()),
        discard: () => def.reset(),
        effectOptions,
        onDestroy: (fn) => destroyRef.onDestroy(fn),
      })
    : inertDraft();

  const def: FormDef<TModel, TPayload> = {
    __ngu: 'form',
    model,
    value: model.asReadonly(),
    payload: computed(() => {
      const value = options.omitHidden ? (withoutHidden(root, model()) as TModel) : model();
      return options.mapValue ? options.mapValue(value) : (value as unknown as TPayload);
    }),
    tree,
    spec,
    fields,
    cols: options.cols ?? 1,
    initial,
    dirty: computed(() => root().dirty()),
    touched: computed(() => root().touched()),
    valid: computed(() => root().valid()),
    pending: computed(() => root().pending()),
    submitting: computed(() => waiting() || root().submitting()),
    changes,
    resets: resets.asReadonly(),
    loading,
    loadError,
    draft,
    history,
    reset(value?: TModel) {
      resetTo(value ?? clone(start));
      draft.settle();
    },
    patch(partial: DeepPartial<TModel>) {
      history.checkpoint();
      model.update((current) => deepMerge(current, partial) as TModel);
      baseline.update((current) => deepMerge(current, clone(partial)));
    },
  };
  function resetTo(next: TModel): void {
    history.checkpoint();
    root().reset(next);
    baseline.set(clone(next));
    resets.update((n) => n + 1);
  }

  setInternals(def, {
    waiting,
    saved() {
      root().reset();
      baseline.set(clone(untracked(model)));
      draft.settle();
    },
    changedByHistory: () => history.lastPaths(),
  });
  return def;
}

const GROUP_OPTION_KEYS = new Set(['title', 'description', 'cols', 'span', 'hidden', 'validate', 'fields']);

function normalize(
  spec: Record<string, unknown>,
  value: Record<string, unknown>,
  path: string,
): FormDefinition {
  const out: Record<string, AnyFieldDef> = {};
  for (const key of Object.keys(spec)) {
    const keyPath = path ? `${path}.${key}` : key;
    if (key.startsWith('$') && !(key in value)) {
      out[key] = staticEntry(spec[key], keyPath);
      continue;
    }
    if (!(key in value)) {
      throw new Error(`ngu-form: "${keyPath}" is described but missing from the model value.`);
    }
    out[key] = normalizeEntry(spec[key], value[key], keyPath);
  }
  return out;
}

function normalizeEntry(spec: unknown, value: unknown, path: string): AnyFieldDef {
  if (isCustomLeaf(spec, value)) {
    return leaf(spec, value, path);
  }
  if (isPlainObject(value) && isDynamicSpec(spec, value)) {
    return normalizeDynamic(spec, path);
  }
  if (Array.isArray(value)) {
    return array(spec, path);
  }
  if (typeof spec === 'string') {
    return leaf({ label: spec }, value, path);
  }
  if (!isPlainObject(spec)) {
    throw new Error(`ngu-form: "${path}" must be a label string or an options object.`);
  }
  if (isPlainObject(value)) {
    return group(spec, value, path);
  }
  return leaf(spec, value, path);
}

function array(spec: unknown, path: string): ArrayDef {
  if (!isPlainObject(spec) || !('item' in spec) || !('newItem' in spec)) {
    throw new Error(`ngu-form: "${path}" is an array and needs an object spec with "item" and "newItem".`);
  }
  const { item, newItem, cols, min, max, ...rest } = spec as Record<string, unknown>;
  const factory: () => unknown =
    typeof newItem === 'function' ? (newItem as () => unknown) : () => structuredClone(newItem);
  const sample = factory();
  const itemDef = isPlainObject(sample)
    ? normalize(item as Record<string, unknown>, sample, `${path}[]`)
    : normalizeEntry(item, sample, `${path}[]`);
  if (itemDef.__ngu === 'array' || itemDef.__ngu === 'dynamic') {
    throw new Error(`ngu-form: "${path}" has array or run-time items inside an array, which is not supported.`);
  }
  return {
    __ngu: 'array',
    ...rest,
    item: itemDef as ArrayDef['item'],
    newItem: factory,
    min: min as number | undefined,
    max: max as number | undefined,
    cols: (cols as ArrayDef['cols'] | undefined) ?? 1,
  };
}

function group(
  spec: Record<string, unknown>,
  value: Record<string, unknown>,
  path: string,
): AnyFieldDef {
  // `{ fields: {...}, cols, title }` is a wrapper unless the model itself has a `fields` key.
  const isWrapper =
    isPlainObject(spec['fields']) &&
    !('fields' in value) &&
    Object.keys(spec).every((k) => GROUP_OPTION_KEYS.has(k));

  if (isWrapper) {
    const { fields, ...rest } = spec as { fields: Record<string, unknown> } & Record<string, unknown>;
    return { __ngu: 'group', ...rest, fields: normalize(fields, value, path) };
  }
  return { __ngu: 'group', fields: normalize(spec, value, path) };
}

function staticEntry(spec: unknown, path: string): StaticDef {
  if (!isPlainObject(spec)) {
    throw new Error(`ngu-form: "${path}" is static content and needs { heading }, { text } or { divider: true }.`);
  }
  const { heading, text, divider, level, span, hidden } = spec as Record<string, any>;
  const kind = typeof heading === 'string' ? 'heading' : typeof text === 'string' ? 'text' : divider ? 'divider' : undefined;
  if (!kind) {
    throw new Error(`ngu-form: "${path}" is static content and needs { heading }, { text } or { divider: true }.`);
  }
  return { __ngu: 'static', kind, text: heading ?? text ?? '', level: level ?? 3, span, hidden };
}

function leaf(spec: Record<string, unknown>, value: unknown, path: string): LeafDef {
  const { options, type, ...rest } = spec as { options?: LeafDef['choices']; type?: LeafDef['type'] };
  const def: LeafDef = {
    __ngu: 'leaf',
    type: type ?? inferType(value, path),
    ...rest,
    choices: options,
    ...(Array.isArray(value) ? { multiple: true } : {}),
  };
  checkLeaf(def, value, path);
  return def;
}

/** Built-in types that need a particular value shape; plain JavaScript callers get a clear error. */
function checkLeaf(def: LeafDef, value: unknown, path: string): void {
  const fail = (why: string) => {
    throw new Error(`ngu-form: "${path}" has type "${def.type}" ${why}.`);
  };
  switch (def.type) {
    case 'select':
    case 'radio':
    case 'segmented':
      if (!def.choices) {
        fail('and needs "options"');
      }
      if (def.multiple && def.type !== 'select') {
        fail('on an array; use "checkbox" or "select" for a list of choices');
      }
      return;
    case 'checkbox':
      if (def.multiple && !def.choices) {
        fail('on an array and needs "options"');
      }
      return;
    case 'tags':
      if (!def.multiple) {
        fail('and needs a string array value');
      }
      return;
    case 'daterange':
      if (!isPlainObject(value) || !('from' in value) || !('to' in value)) {
        fail('and needs a { from, to } value');
      }
      return;
    case 'consent':
      if (value !== null && !isDate(value)) {
        fail('and needs a Date or null value');
      }
      return;
  }
}

function inferType(value: unknown, path: string): FieldType {
  if (isDate(value)) {
    return 'date';
  }
  if (value === null || value === undefined) {
    throw new Error(`ngu-form: cannot infer the input type for "${path}" from ${value}. Set "type" explicitly.`);
  }
  switch (typeof value) {
    case 'string':
      return 'text';
    case 'number':
      return 'number';
    case 'boolean':
      return 'checkbox';
    default:
      throw new Error(
        `ngu-form: cannot infer the input type for "${path}" from a ${typeof value} value. Set "type" explicitly.`,
      );
  }
}

/**
 * An object or array value described with an explicit `type` is a single custom input
 * (for example a date range), unless the model itself has a `type` key.
 */
function isCustomLeaf(spec: unknown, value: unknown): spec is Record<string, unknown> {
  return (
    isPlainObject(spec) &&
    typeof spec['type'] === 'string' &&
    (Array.isArray(value) || isPlainObject(value)) &&
    !('type' in (value as object))
  );
}
