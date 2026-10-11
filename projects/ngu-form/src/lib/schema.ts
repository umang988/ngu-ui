import { isSignal, resource, untracked } from '@angular/core';
import {
  applyEach,
  debounce,
  disabled,
  email,
  hidden,
  max,
  MAX,
  MAX_DATE,
  MAX_NUMBER,
  maxDateError,
  maxLength,
  metadata,
  min,
  MIN,
  MIN_DATE,
  MIN_NUMBER,
  minDateError,
  minLength,
  pattern,
  readonly,
  required,
  validate,
  validateAsync,
  type Field,
  type PathKind,
  type SchemaPath,
  type SchemaPathRules,
  type ValidationError,
} from '@angular/forms/signals';
import { NGU_CHOICES, NGU_NODES, NGU_STATIC_HIDDEN, NGU_WARNINGS, toDate, toDateBound } from './internal';
import { hasTypeRules, typeError } from './rules';
import { passwordScore, strengthOptions } from './strength';
import { maskIncomplete } from './transform';
import {
  isLeafDef,
  type AnyFieldDef,
  type ArrayDef,
  type DynamicDef,
  type FormDefinition,
  type LeafDef,
  type LogicFn,
  type StaticDef,
  type ValidationResult,
  type Validator,
} from './types';

type AnyPath = SchemaPath<any, SchemaPathRules.Supported, PathKind.Root>;
type ChildPath = SchemaPath<any, SchemaPathRules.Supported, PathKind.Child>;
type Ctx = { valueOf(p: AnyPath): any };

/**
 * Walks a definition and registers the matching signal-forms rules.
 * `scope` is the nearest array item path, or the root when not inside an array.
 */
export function applyDefinition(root: AnyPath, scope: AnyPath, path: AnyPath, fields: FormDefinition): void {
  const statics: [string, StaticDef][] = [];
  for (const [key, def] of Object.entries(fields) as [string, AnyFieldDef][]) {
    if (def.__ngu === 'static') {
      if (def.hidden) {
        statics.push([key, def]);
      }
      continue;
    }
    const child = (path as unknown as Record<string, AnyPath>)[key];
    applyEntry(root, scope, child, def);
  }
  // Static content has no field of its own; its hidden flags live on the enclosing group.
  if (statics.length) {
    metadata(path, NGU_STATIC_HIDDEN, ({ valueOf }) =>
      Object.fromEntries(statics.map(([key, def]) => [key, Boolean(def.hidden!(valueOf(root), valueOf(scope)))])),
    );
  }
}

function applyEntry(root: AnyPath, scope: AnyPath, path: AnyPath, def: AnyFieldDef): void {
  switch (def.__ngu) {
    case 'group':
      applyLogic(root, scope, path, def.hidden, hidden);
      applyValidators(root, scope, path, def.validate);
      applyDefinition(root, scope, path, def.fields);
      return;
    case 'array':
      applyArray(root, scope, path, def);
      return;
    case 'dynamic':
      applyLogic(root, scope, path, def.hidden, hidden);
      applyDynamic(root, path, def);
      return;
    case 'leaf':
      applyLeaf(root, scope, path, def);
  }
}

function applyArray(root: AnyPath, scope: AnyPath, path: AnyPath, def: ArrayDef): void {
  applyLogic(root, scope, path, def.hidden, hidden);
  if (def.min != null) {
    minLength(path, def.min);
  }
  if (def.max != null) {
    maxLength(path, def.max);
  }
  applyValidators(root, scope, path, def.validate);
  applyEach(path, (itemPath) => {
    const item = itemPath as unknown as AnyPath;
    if (isLeafDef(def.item)) {
      applyLeaf(root, item, item, def.item);
    } else {
      applyDefinition(root, item, item, def.item);
    }
  });
}

// Angular's own email pattern, so run-time email fields behave like static ones.
const EMAIL_REGEXP =
  /^(?=.{1,254}$)(?=.{1,64}@)[a-zA-Z0-9!#$%&'*+\/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+\/=?^_`{|}~-]+)*@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/**
 * Rules for a `Record<string, V>` whose fields are listed at run time. One `applyEach` covers
 * every key, present or future; each rule looks up the current key's definition, so the
 * rules follow the field list as it changes.
 */
function applyDynamic(root: AnyPath, path: AnyPath, def: DynamicDef): void {
  const entryOf = (key: string) => def.entries().get(key);
  const flag = (
    value: boolean | ((model: any, values: any) => boolean) | undefined,
    model: unknown,
    values: unknown,
  ) => (typeof value === 'function' ? value(model, values) : Boolean(value));

  applyEach(path as unknown as SchemaPath<Record<string, any>>, (childTree) => {
    const child = childTree as unknown as ChildPath;
    hidden(child, ({ key, valueOf }) => Boolean(entryOf(key())?.hidden?.(valueOf(root), valueOf(path))));
    disabled(child, ({ key, valueOf }) => flag(entryOf(key())?.field.disabled, valueOf(root), valueOf(path)));
    readonly(child, ({ key, valueOf }) => flag(entryOf(key())?.field.readonly, valueOf(root), valueOf(path)));
    required(child, { when: ({ key }) => Boolean(entryOf(key())?.field.required) });
    // A list value is counted by typeError instead.
    const single = (key: string) => {
      const entry = entryOf(key);
      return entry && !entry.leaf.multiple ? entry : undefined;
    };
    minLength(child, ({ key }) => single(key())?.field.minLength);
    maxLength(child, ({ key }) => single(key())?.field.maxLength);
    min(child, ({ key }) => numeric(single(key())?.field.min));
    max(child, ({ key }) => {
      const entry = single(key());
      return entry?.leaf.type === 'rating' ? undefined : numeric(entry?.field.max);
    });
    pattern(child, ({ key }) => single(key())?.pattern);
    validate(child, ({ key, value, state }) => {
      const entry = entryOf(key());
      return entry && hasTypeRules(entry.leaf) ? typeError(entry.leaf, value(), state.required()) : undefined;
    });
    validate(child, ({ key, value }) => {
      const entry = entryOf(key());
      return entry ? dateBoundsError(value(), entry.minDate, entry.maxDate) : undefined;
    });
    // Date bounds also reach the input's min and max attributes; MIN and MAX pick the key.
    metadata(child, MIN_DATE, ({ key }) => entryOf(key())?.minDate);
    metadata(child, MAX_DATE, ({ key }) => entryOf(key())?.maxDate);
    metadata(child, MIN, ({ key }) => (entryOf(key())?.minDate ? MIN_DATE : MIN_NUMBER));
    metadata(child, MAX, ({ key }) => (entryOf(key())?.maxDate ? MAX_DATE : MAX_NUMBER));
    validate(child, ({ key, value }) => {
      const mask = entryOf(key())?.field.mask;
      return mask && maskIncomplete(value(), mask) ? { kind: 'mask' } : undefined;
    });
    debounce(child, ({ key }, abortSignal) => {
      const ms = untracked(() => entryOf(key())?.field.debounce);
      return ms ? wait(ms, abortSignal) : undefined;
    });
    validateAsync(child, {
      params: ({ key, value, valueOf }) => {
        const check = entryOf(key())?.field.validateAsync;
        return check
          ? { check, value: value(), model: untracked(() => valueOf(root)), values: untracked(() => valueOf(path)) }
          : undefined;
      },
      factory: (params) =>
        resource({
          params,
          loader: ({ params: p, abortSignal }) => p.check(p.value, p.model, p.values, abortSignal),
        }),
      onSuccess: (result) => toError(result, 'async'),
      onError: () => ({ kind: 'asyncFailed' }),
    });
    validate(child, ({ key, value }) => {
      const v = value();
      return entryOf(key())?.leaf.type === 'email' && typeof v === 'string' && v !== '' && !EMAIL_REGEXP.test(v)
        ? { kind: 'email' }
        : undefined;
    });
    validate(child, ({ key, value, valueOf }) => {
      for (const fn of entryOf(key())?.validators ?? []) {
        const error = toError(fn(value(), valueOf(root), valueOf(path)), 'custom');
        if (error) {
          return error;
        }
      }
      return undefined;
    });
  });
}

function applyLeaf(root: AnyPath, scope: AnyPath, path: AnyPath, def: LeafDef): void {
  const req = def.required;
  if (typeof req === 'function') {
    const result = (ctx: Ctx) => req(ctx.valueOf(root), ctx.valueOf(scope));
    required(path, {
      when: (ctx) => Boolean(result(ctx)),
      message: (ctx) => {
        const r = result(ctx);
        return (typeof r === 'string' ? r : undefined) as string;
      },
    });
  } else if (req) {
    required(path, typeof req === 'string' ? { message: req } : undefined);
  }
  if (def.type === 'captcha' && req === undefined) {
    required(path);
  }
  if (def.type === 'email') {
    email(path);
  }
  if (hasTypeRules(def)) {
    validate(path, ({ value, state }) => typeError(def, value(), state.required()));
  }
  // A list value is counted by typeError; its minLength and maxLength concern each tag.
  if (!def.multiple) {
    applyBounds(path, def);
  }
  if (def.mask) {
    const mask = def.mask;
    validate(path, ({ value }) => (maskIncomplete(value(), mask) ? { kind: 'mask' } : undefined));
  }
  const strength = def.type === 'password' ? strengthOptions(def.strength) : undefined;
  if (strength?.min != null) {
    const least = strength.min;
    const length = def.minLength;
    validate(path, ({ value }) => {
      const v = value();
      return typeof v === 'string' && v !== '' && passwordScore(v, strength, length) < least
        ? { kind: 'weakPassword' }
        : undefined;
    });
  }
  if (def.warn) {
    const checks = Array.isArray(def.warn) ? def.warn : [def.warn as Validator<any, any, any>];
    metadata(path, NGU_WARNINGS, ({ value, valueOf }) =>
      checks
        .map((fn) => toError(fn(value(), valueOf(root), valueOf(scope)), 'warning'))
        .filter((w): w is ValidationError => !!w),
    );
  }
  if (def.debounce != null) {
    debounce(path, def.debounce);
  }
  applyValidators(root, scope, path, def.validate);
  if (def.validateAsync) {
    const check = def.validateAsync;
    validateAsync(path, {
      params: ({ value, valueOf }) => ({
        value: value(),
        model: untracked(() => valueOf(root)),
        scope: untracked(() => valueOf(scope)),
      }),
      factory: (params) =>
        resource({
          params,
          loader: ({ params: p, abortSignal }) => check(p.value, p.model, p.scope, abortSignal),
        }),
      onSuccess: (result) => toError(result, 'async'),
      onError: () => ({ kind: 'asyncFailed' }),
    });
  }
  applyLogic(root, scope, path, def.hidden, hidden);
  applyLogic(root, scope, path, def.disabled, disabled);
  applyLogic(root, scope, path, def.compute ? true : def.readonly, readonly);

  const options = def.choices;
  if (typeof options === 'function' && !isSignal(options)) {
    metadata(path, NGU_CHOICES, ({ valueOf }) => options(valueOf(root), valueOf(scope)));
  }
  if (def.onChange) {
    metadata(path, NGU_NODES, ({ fieldTreeOf }) => ({
      root: fieldTreeOf(root as never) as unknown as Field<any>,
      scope: fieldTreeOf(scope as never) as unknown as Field<any>,
    }));
  }
}

/** Length, pattern and min/max rules of a single-value field. */
function applyBounds(path: AnyPath, def: LeafDef): void {
  if (def.minLength != null) {
    minLength(path, def.minLength);
  }
  if (def.maxLength != null) {
    maxLength(path, def.maxLength);
  }
  if (def.pattern) {
    pattern(path, def.pattern);
  }
  if (def.type === 'date') {
    const lo = toDateBound(def.min);
    const hi = toDateBound(def.max);
    if (lo || hi) {
      validate(path, ({ value }) => dateBoundsError(value(), lo, hi));
    }
    // Lets [formField] set the date input's min and max attributes.
    if (lo) {
      metadata(path, MIN_DATE, () => lo);
      metadata(path, MIN, () => MIN_DATE);
    }
    if (hi) {
      metadata(path, MAX_DATE, () => hi);
      metadata(path, MAX, () => MAX_DATE);
    }
    return;
  }
  // Time-like bounds are strings, checked by typeError; a rating's `max` is its star count.
  if (typeof def.min === 'number') {
    min(path, def.min);
  }
  if (typeof def.max === 'number' && def.type !== 'rating') {
    max(path, def.max);
  }
}

/** `min` and `max` on run-time fields are numbers, or ISO dates on date fields. */
function numeric(value: number | string | undefined): number | undefined {
  return typeof value === 'number' ? value : undefined;
}

/** Works for `Date` values and ISO date strings alike. */
function dateBoundsError(value: unknown, lo: Date | undefined, hi: Date | undefined): ValidationError | undefined {
  const date = toDate(value);
  if (!date) {
    return undefined;
  }
  if (lo && date.getTime() < lo.getTime()) {
    return minDateError(lo);
  }
  if (hi && date.getTime() > hi.getTime()) {
    return maxDateError(hi);
  }
  return undefined;
}

function wait(ms: number, abortSignal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    abortSignal.addEventListener('abort', () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

function applyValidators(
  root: AnyPath,
  scope: AnyPath,
  path: AnyPath,
  validators: Validator<any, any, any> | readonly Validator<any, any, any>[] | undefined,
): void {
  if (!validators) {
    return;
  }
  const list = Array.isArray(validators) ? validators : [validators as Validator<any, any, any>];
  for (const fn of list) {
    validate(path, ({ value, valueOf }) => toError(fn(value(), valueOf(root), valueOf(scope)), 'custom'));
  }
}

function toError(result: ValidationResult, kind: string): ValidationError | undefined {
  if (result == null || result === '') {
    return undefined;
  }
  return typeof result === 'string' ? { kind, message: result } : { kind: result.kind, message: result.message };
}

function applyLogic(
  root: AnyPath,
  scope: AnyPath,
  path: AnyPath,
  value: boolean | LogicFn<any, boolean, any> | undefined,
  rule: (path: AnyPath, logic?: (ctx: Ctx) => boolean) => void,
): void {
  if (value === undefined || value === false) {
    return;
  }
  if (value === true) {
    rule(path);
    return;
  }
  rule(path, ({ valueOf }) => value(valueOf(root), valueOf(scope)));
}
