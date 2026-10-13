import { computed, DestroyRef, effect, inject, isSignal, signal, untracked, type WritableSignal } from '@angular/core';
import { disabled, form, readonly, validateStandardSchema, type Field } from '@angular/forms/signals';
import { diff, hasDerived, runDerived, withoutHidden, type ChoiceMemory } from './derive';
import { inertDraft, setupDraft } from './draft';
import { findDynamic, isDynamicSpec, normalizeDynamic, syncDynamic } from './dynamic';
import { inertHistory, setupHistory } from './history';
import { clone, deepMerge, isDate, isPlainObject, setInternals } from './internal';
import { applyDefinition } from './schema';
import { inertSteps, setupSteps } from './steps';
import type {
  AnyFieldDef,
  ArrayDef,
  DeepPartial,
  FieldType,
  FormDef,
  FormDefOptions,
  FormDefinition,
  FormLayout,
  FormSpec,
  LeafDef,
  StaticDef,
} from './types';
import { closest, nguError } from './diagnostics';

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

  const layout = options.layout;
  const fields = withLayout(
    normalize(spec as Record<string, unknown>, untracked(model) as Record<string, unknown>, ''),
    layout,
    '',
  );

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
    // Disabled and read-only pass down to every field below the root.
    const off = options.disabled;
    if (off) {
      disabled(root, () => flag(off));
    }
    const locked = options.readonly;
    if (locked) {
      readonly(root, () => flag(locked));
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

  const steps = layout === 'steps' ? setupSteps(fields, root, Boolean(options.review)) : inertSteps();

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
    layout,
    steps,
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
    steps.restart();
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
    steps: layout === 'steps' ? steps : undefined,
    review: typeof options.review === 'string' ? options.review : options.review ? true : undefined,
    stepParam: options.stepParam,
  });
  return def;
}

function flag(value: boolean | (() => boolean)): boolean {
  return typeof value === 'function' ? Boolean(value()) : value;
}

const GROUP_OPTION_KEYS = new Set([
  'title',
  'description',
  'cols',
  'span',
  'hidden',
  'validate',
  'fields',
  'order',
  'layout',
  'collapsed',
  'class',
  'classes',
]);

/**
 * Applies a section layout to a group's children. Tabs and steps need every child to be a
 * group or a list; an accordion makes its groups and lists collapsible, the first one open.
 */
function withLayout(fields: FormDefinition, layout: FormLayout | undefined, path: string): FormDefinition {
  if (!layout) {
    return fields;
  }
  const where = path ? `"${path}"` : 'The form';
  if (layout === 'accordion') {
    let first = true;
    const out: Record<string, AnyFieldDef> = {};
    for (const [key, def] of Object.entries(fields)) {
      if ((def.__ngu === 'group' || def.__ngu === 'array' || def.__ngu === 'dynamic') && def.collapsed === undefined) {
        out[key] = { ...def, collapsed: !first };
        first = false;
      } else {
        out[key] = def;
      }
    }
    return out;
  }
  if (layout !== 'tabs' && layout !== 'steps') {
    throw nguError('NGU-101', `${where} has an unknown layout "${layout}". Use "steps", "tabs" or "accordion".`);
  }
  for (const [key, def] of Object.entries(fields)) {
    if (def.__ngu !== 'group' && def.__ngu !== 'array' && def.__ngu !== 'dynamic') {
      throw nguError(
        'NGU-102',
        `${where} shows its entries as ${layout}, so "${key}" must be a group or a list. Move it into one.`,
      );
    }
  }
  return fields;
}

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
      const near = closest(key, Object.keys(value));
      throw nguError(
        'NGU-103',
        `"${keyPath}" is described but missing from the model value.${near ? ` Did you mean "${near}"?` : ''}`,
      );
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
    throw nguError('NGU-104', `"${path}" must be a label string or an options object.`);
  }
  if (isPlainObject(value)) {
    return group(spec, value, path);
  }
  return leaf(spec, value, path);
}

function array(spec: unknown, path: string): ArrayDef {
  if (!isPlainObject(spec) || !('item' in spec) || !('newItem' in spec)) {
    throw nguError('NGU-105', `"${path}" is an array and needs an object spec with "item" and "newItem".`);
  }
  const { item, newItem, cols, min, max, ...rest } = spec as Record<string, unknown>;
  const factory: () => unknown =
    typeof newItem === 'function' ? (newItem as () => unknown) : () => structuredClone(newItem);
  const sample = factory();
  const itemDef = isPlainObject(sample)
    ? normalize(item as Record<string, unknown>, sample, `${path}[]`)
    : normalizeEntry(item, sample, `${path}[]`);
  if (itemDef.__ngu === 'array' || itemDef.__ngu === 'dynamic') {
    throw nguError('NGU-105', `"${path}" has items that are lists themselves; give each item an object with the list inside.`);
  }
  if (rest['layout'] === 'table') {
    const plain =
      itemDef.__ngu !== 'leaf' &&
      itemDef.__ngu !== 'group' &&
      Object.values(itemDef as FormDefinition).every((d) => d.__ngu === 'leaf');
    if (!plain) {
      throw nguError('NGU-106', `"${path}" uses layout "table", which needs object items made of plain fields.`);
    }
    if (rest['summary']) {
      throw nguError('NGU-106', `"${path}" uses layout "table", whose rows have no summary line; remove "summary".`);
    }
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
    const { fields, layout, ...rest } = spec as { fields: Record<string, unknown>; layout?: FormLayout } & Record<
      string,
      unknown
    >;
    if (layout === 'steps') {
      throw nguError('NGU-107', `"${path}" asks for steps; only the whole form can be a wizard.`);
    }
    return {
      __ngu: 'group',
      ...rest,
      ...(layout === 'tabs' ? { layout: 'tabs' as const } : {}),
      fields: withLayout(normalize(fields, value, path), layout, path),
    };
  }
  return { __ngu: 'group', fields: normalize(spec, value, path) };
}

function staticEntry(spec: unknown, path: string): StaticDef {
  if (!isPlainObject(spec)) {
    throw nguError('NGU-108', `"${path}" is static content and needs { heading }, { text } or { divider: true }.`);
  }
  const { heading, text, divider, level, span, hidden, order, class: cls } = spec as Record<string, any>;
  const kind = typeof heading === 'string' ? 'heading' : typeof text === 'string' ? 'text' : divider ? 'divider' : undefined;
  if (!kind) {
    throw nguError('NGU-108', `"${path}" is static content and needs { heading }, { text } or { divider: true }.`);
  }
  return { __ngu: 'static', kind, text: heading ?? text ?? '', level: level ?? 3, span, hidden, order, class: cls };
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
    throw nguError('NGU-109', `"${path}" has type "${def.type}" ${why}.`);
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
    throw nguError('NGU-110', `cannot infer the input type for "${path}" from ${value}. Set "type" explicitly.`);
  }
  switch (typeof value) {
    case 'string':
      return 'text';
    case 'number':
      return 'number';
    case 'boolean':
      return 'checkbox';
    default:
      throw nguError('NGU-110', `cannot infer the input type for "${path}" from a ${typeof value} value. Set "type" explicitly.`);
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
