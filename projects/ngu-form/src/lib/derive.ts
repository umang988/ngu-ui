import { isSignal, untracked } from '@angular/core';
import type { Field, FieldState } from '@angular/forms/signals';
import { deepEqual, isPlainObject, NGU_CHOICES } from './internal';
import type { AnyFieldDef, Choice, FormDefinition, LeafDef } from './types';

/** Last seen option list per field, so a value is cleared only when its option goes away. */
export type ChoiceMemory = WeakMap<FieldState<unknown>, readonly Choice<unknown>[]>;

/** True when some field outside run-time lists has `compute` or options computed from the model. */
export function hasDerived(fields: FormDefinition): boolean {
  return Object.values(fields).some((def) => {
    switch (def.__ngu) {
      case 'leaf':
        return isDerivedLeaf(def);
      case 'group':
        return hasDerived(def.fields);
      case 'array':
        return def.item.__ngu === 'leaf' ? isDerivedLeaf(def.item as LeafDef) : hasDerived(def.item as FormDefinition);
      default:
        return false;
    }
  });
}

/**
 * Writes computed values and clears values whose computed option disappeared. Values are
 * written through the field tree, so array items keep their identity and rows are not rebuilt.
 */
export function runDerived(root: Field<any>, fields: FormDefinition, memory: ChoiceMemory): void {
  walkFields(root, root, root, fields, memory);
}

function walkFields(root: Field<any>, scope: Field<any>, node: Field<any>, fields: FormDefinition, memory: ChoiceMemory) {
  const children = node as unknown as Record<string, Field<any>>;
  for (const [key, def] of Object.entries(fields)) {
    walkEntry(root, scope, children[key], def, memory);
  }
}

function walkEntry(root: Field<any>, scope: Field<any>, node: Field<any> | undefined, def: AnyFieldDef, memory: ChoiceMemory) {
  if (!node) {
    return;
  }
  switch (def.__ngu) {
    case 'group':
      walkFields(root, scope, node, def.fields, memory);
      return;
    case 'array': {
      // Reading the value tracks added and removed rows.
      const length = (node().value() as readonly unknown[]).length;
      const rows = node as unknown as ArrayLike<Field<any>>;
      for (let i = 0; i < length; i++) {
        const row = rows[i];
        if (def.item.__ngu === 'leaf') {
          walkEntry(root, row, row, def.item as LeafDef, memory);
        } else {
          walkFields(root, row, row, def.item as FormDefinition, memory);
        }
      }
      return;
    }
    case 'leaf':
      walkLeaf(root, scope, node, def, memory);
      return;
    default:
      return;
  }
}

function walkLeaf(root: Field<any>, scope: Field<any>, node: Field<any>, def: LeafDef, memory: ChoiceMemory) {
  const state = node();
  if (def.compute) {
    const next = def.compute(root().value(), scope().value());
    if (!deepEqual(next, untracked(state.value))) {
      state.value.set(next);
    }
  }
  if (typeof def.choices === 'function' && !isSignal(def.choices)) {
    const list = state.metadata(NGU_CHOICES)?.() ?? [];
    const before = memory.get(state);
    memory.set(state, list);
    const value = untracked(state.value);
    if (before && !isEmpty(value) && hasChoice(before, value) && !hasChoice(list, value)) {
      state.value.set(typeof value === 'string' ? '' : null);
    }
  }
}

function isDerivedLeaf(def: LeafDef): boolean {
  return Boolean(def.compute) || (typeof def.choices === 'function' && !isSignal(def.choices));
}

function isEmpty(value: unknown): boolean {
  return value === '' || value == null;
}

/** Native selects hand back strings, so `1` and `'1'` count as the same option. */
function hasChoice(list: readonly Choice<unknown>[], value: unknown): boolean {
  return list.some((c) => Object.is(c.value, value) || String(c.value) === String(value));
}

// ---------------------------------------------------------------------------
// Submitted value and changes
// ---------------------------------------------------------------------------

/** Copies `value` without the values of hidden fields. */
export function withoutHidden(node: Field<any> | undefined, value: unknown): unknown {
  if (!node) {
    return value;
  }
  if (Array.isArray(value)) {
    const rows = node as unknown as ArrayLike<Field<any>>;
    return value.map((item, i) => withoutHidden(rows[i], item));
  }
  if (isPlainObject(value)) {
    const children = node as unknown as Record<string, Field<any> | undefined>;
    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value)) {
      const child = children[key];
      if (child?.().hidden()) {
        continue;
      }
      out[key] = withoutHidden(child, v);
    }
    return out;
  }
  return value;
}

/** Values that differ from `base`, following the definition. Leaves and arrays are compared whole. */
export function diff(fields: FormDefinition, value: unknown, base: unknown): Record<string, unknown> | undefined {
  const current = (value ?? {}) as Record<string, unknown>;
  const before = (isPlainObject(base) ? base : {}) as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [key, def] of Object.entries(fields)) {
    switch (def.__ngu) {
      case 'static':
        continue;
      case 'group': {
        const d = diff(def.fields, current[key], before[key]);
        if (d) {
          out[key] = d;
        }
        continue;
      }
      case 'dynamic': {
        const values = (current[key] ?? {}) as Record<string, unknown>;
        const old = (isPlainObject(before[key]) ? before[key] : {}) as Record<string, unknown>;
        const changed = Object.entries(values).filter(([k, v]) => !deepEqual(v, old[k]));
        if (changed.length) {
          out[key] = Object.fromEntries(changed);
        }
        continue;
      }
      default:
        // A captcha token is a proof for one request, not a change to the record.
        if (def.__ngu === 'leaf' && def.type === 'captcha') {
          continue;
        }
        if (!deepEqual(current[key], before[key])) {
          out[key] = current[key];
        }
    }
  }
  return Object.keys(out).length ? out : undefined;
}
