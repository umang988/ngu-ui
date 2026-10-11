import { computed, effect, signal, untracked, type CreateEffectOptions, type WritableSignal } from '@angular/core';
import { cloneKeepingIds, deepEqual, isPlainObject } from './internal';
import type { FormHistory } from './types';

/** Changes to the same fields closer together than this are one undo step. */
const COALESCE_MS = 1000;

/** Dot paths of the leaves that differ between two values. Arrays of different length count as one path. */
export function changedPaths(a: unknown, b: unknown, path = '', out: string[] = []): string[] {
  if (deepEqual(a, b)) {
    return out;
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
      changedPaths(a[key], b[key], path ? `${path}.${key}` : key, out);
    }
    return out;
  }
  if (Array.isArray(a) && Array.isArray(b) && a.length === b.length) {
    a.forEach((item, i) => changedPaths(item, b[i], path ? `${path}.${i}` : String(i), out));
    return out;
  }
  out.push(path);
  return out;
}

export interface HistoryHandle extends FormHistory {
  /** Paths changed by the last undo or redo, for focus and announcements. */
  readonly lastPaths: () => readonly string[];
  /** The next change (a reset or patch from code) is a step of its own, never merged with typing. */
  checkpoint(): void;
}

/**
 * Records snapshots of the model. Typing in one field is one step until a pause or a change
 * elsewhere; undo and redo write a snapshot back.
 */
export function setupHistory(
  model: WritableSignal<any>,
  limit: number,
  effectOptions: CreateEffectOptions | undefined,
  /** Runs after undo or redo wrote a value, so the form can count it as a change. */
  afterRestore: () => void = () => undefined,
): HistoryHandle {
  const past: unknown[] = [];
  const future: unknown[] = [];
  const version = signal(0);
  // Snapshots are the model's own values, which Signal Forms never mutates except to tag
  // array rows with a symbol. Keeping them (not copies) keeps those tags, so undo maps rows
  // back to their fields with their touched, dirty and server-error state.
  let current: unknown = untracked(model);
  let lastKey = '';
  let lastAt = 0;
  let lastPaths: readonly string[] = [];
  let isolate = false;

  effect(() => {
    const value = model();
    untracked(() => {
      if (deepEqual(value, current)) {
        return;
      }
      const paths = changedPaths(current, value);
      const key = paths.join('|');
      const now = Date.now();
      if (isolate || !(key === lastKey && now - lastAt < COALESCE_MS && past.length)) {
        past.push(current);
        if (past.length > limit) {
          past.shift();
        }
      }
      future.length = 0;
      current = value;
      lastKey = isolate ? '' : key;
      lastAt = now;
      isolate = false;
      version.update((n) => n + 1);
    });
  }, effectOptions);

  const move = (from: unknown[], to: unknown[]) => {
    const target = from.pop();
    if (target === undefined) {
      return;
    }
    to.push(current);
    lastPaths = changedPaths(current, target);
    current = target;
    lastKey = '';
    lastAt = 0;
    // A copy that keeps the row tags, so the stored snapshot stays as it was for redo.
    model.set(cloneKeepingIds(target));
    version.update((n) => n + 1);
    afterRestore();
  };

  return {
    canUndo: computed(() => (version(), past.length > 0)),
    canRedo: computed(() => (version(), future.length > 0)),
    undo: () => move(past, future),
    redo: () => move(future, past),
    clear() {
      past.length = 0;
      future.length = 0;
      current = untracked(model);
      lastKey = '';
      version.update((n) => n + 1);
    },
    lastPaths: () => lastPaths,
    checkpoint() {
      isolate = true;
    },
  };
}

/** A `FormHistory` that does nothing, for forms without `history`. */
export function inertHistory(): HistoryHandle {
  const no = computed(() => false);
  return {
    canUndo: no,
    canRedo: no,
    undo: () => undefined,
    redo: () => undefined,
    clear: () => undefined,
    lastPaths: () => [],
    checkpoint: () => undefined,
  };
}
