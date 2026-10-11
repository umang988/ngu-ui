import { computed, effect, signal, untracked, type CreateEffectOptions, type Signal } from '@angular/core';
import type { Field } from '@angular/forms/signals';
import { clone, deepEqual, isDate, isPlainObject } from './internal';
import type { DraftOptions, DraftStorage, FormDefinition, FormDraft, LeafDef } from './types';

const PREFIX = 'ngu-form:draft:';
const VERSION = 1;

/** What is stored: the value (dates encoded) and when it was saved. */
interface Envelope {
  readonly v: number;
  readonly savedAt: number;
  readonly value: unknown;
}

function webStorage(kind: 'local' | 'session'): DraftStorage {
  const store = (): Storage | undefined => {
    try {
      return kind === 'local' ? globalThis.localStorage : globalThis.sessionStorage;
    } catch {
      return undefined; // blocked by privacy settings
    }
  };
  return {
    load(key) {
      try {
        const raw = store()?.getItem(PREFIX + key);
        return raw ? JSON.parse(raw) : undefined;
      } catch {
        return undefined;
      }
    },
    save(key, value) {
      try {
        store()?.setItem(PREFIX + key, JSON.stringify(value));
      } catch {
        // Quota exceeded or storage blocked: drafts are best effort.
      }
    },
    remove(key) {
      try {
        store()?.removeItem(PREFIX + key);
      } catch {
        // ignore
      }
    },
  };
}

/**
 * Draft storage in IndexedDB, for large forms or when localStorage is full.
 *
 * ```ts
 * defineForm(initial, spec, { draft: { key: 'claim', storage: nguIndexedDbDrafts() } })
 * ```
 */
export function nguIndexedDbDrafts(database = 'ngu-form', store = 'drafts'): DraftStorage {
  let db: Promise<IDBDatabase> | undefined;
  /** Opens the database, adding the store with a version bump when another store came first. */
  const connect = (version?: number): Promise<IDBDatabase> =>
    new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(database, version);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(store)) {
          request.result.createObjectStore(store);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    }).then((d: IDBDatabase) => {
      if (d.objectStoreNames.contains(store)) {
        return d;
      }
      d.close();
      return connect(d.version + 1);
    });
  const open = () => (db ??= connect());
  const run = <T>(mode: IDBTransactionMode, op: (s: IDBObjectStore) => IDBRequest<T>) =>
    open().then(
      (d) =>
        new Promise<T>((resolve, reject) => {
          const request = op(d.transaction(store, mode).objectStore(store));
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        }),
    );
  const available = typeof indexedDB !== 'undefined';
  return {
    load: (key) => (available ? run('readonly', (s) => s.get(key)).catch(() => undefined) : undefined),
    save: (key, value) => (available ? run('readwrite', (s) => s.put(value, key)).then(() => undefined, () => undefined) : undefined),
    remove: (key) => (available ? run('readwrite', (s) => s.delete(key)).then(() => undefined, () => undefined) : undefined),
  };
}

function resolveStorage(storage: DraftOptions['storage']): DraftStorage {
  if (storage === undefined || storage === 'local') {
    return webStorage('local');
  }
  return storage === 'session' ? webStorage('session') : storage;
}

// ---------------------------------------------------------------------------
// Encoding
// ---------------------------------------------------------------------------

/** Dates become `{ $date: iso }` so the draft survives JSON. */
function encode(value: unknown): unknown {
  if (isDate(value)) {
    return { $date: value.toISOString() };
  }
  if (Array.isArray(value)) {
    return value.map(encode);
  }
  if (isPlainObject(value)) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, encode(v)]));
  }
  return value;
}

function decode(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(decode);
  }
  if (isPlainObject(value)) {
    const keys = Object.keys(value);
    if (keys.length === 1 && keys[0] === '$date' && typeof value['$date'] === 'string') {
      return new Date(value['$date']);
    }
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, decode(v)]));
  }
  return value;
}

/** Secrets and single-use values: passwords, one-time codes and captcha tokens. */
const SECRET_TYPES = new Set(['password', 'otp', 'captcha']);
const keepsOut = (def: LeafDef) => SECRET_TYPES.has(def.type) || def.persist === false;

/** Values a draft can hold: JSON data and dates. Files, blobs and class instances are left out. */
function storable(value: unknown): boolean {
  if (value === null || typeof value !== 'object') {
    return typeof value !== 'function' && typeof value !== 'symbol' && typeof value !== 'bigint';
  }
  if (isDate(value)) {
    return true;
  }
  if (Array.isArray(value)) {
    return value.every(storable);
  }
  return isPlainObject(value) && Object.values(value).every(storable);
}

/** The value without passwords, one-time codes, captcha tokens and fields with `persist: false`. */
export function persistable(fields: FormDefinition, value: unknown): Record<string, unknown> {
  const source = (isPlainObject(value) ? value : {}) as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [key, def] of Object.entries(fields)) {
    const v = source[key];
    switch (def.__ngu) {
      case 'static':
        continue;
      case 'leaf':
        if (!keepsOut(def) && storable(v)) {
          out[key] = v;
        }
        continue;
      case 'group':
        out[key] = persistable(def.fields, v);
        continue;
      case 'array':
        if (!Array.isArray(v)) {
          continue;
        }
        if (def.item.__ngu === 'leaf') {
          if (!keepsOut(def.item as LeafDef) && storable(v)) {
            out[key] = v;
          }
        } else {
          out[key] = v.map((item) => persistable(def.item as FormDefinition, item));
        }
        continue;
      case 'dynamic': {
        const entries = untracked(def.entries);
        out[key] = Object.fromEntries(
          Object.entries(isPlainObject(v) ? v : {}).filter(([k]) => {
            const entry = entries.get(k);
            return !entry || !keepsOut(entry.leaf);
          }),
        );
        continue;
      }
    }
  }
  return out;
}

/** Same kind of value, so a draft from an older form version cannot put a string in a number field. */
function compatible(stored: unknown, current: unknown): boolean {
  if (stored === null || current === null || stored === undefined) {
    return stored !== undefined;
  }
  if (isDate(current) || isDate(stored)) {
    return isDate(current) && isDate(stored);
  }
  if (Array.isArray(current) || Array.isArray(stored)) {
    return Array.isArray(current) && Array.isArray(stored);
  }
  return typeof stored === typeof current;
}

/**
 * Lays a stored draft over the current value, key by key along the definition. Keys the
 * form no longer has are dropped; fields left out of drafts keep their current value.
 */
export function fitDraft(fields: FormDefinition, stored: unknown, current: unknown): unknown {
  const from = (isPlainObject(stored) ? stored : {}) as Record<string, unknown>;
  const base = (isPlainObject(current) ? current : {}) as Record<string, unknown>;
  const out: Record<string, unknown> = { ...base };
  for (const [key, def] of Object.entries(fields)) {
    if (def.__ngu === 'static' || !(key in from)) {
      continue;
    }
    const s = from[key];
    const c = base[key];
    switch (def.__ngu) {
      case 'leaf':
        if (!keepsOut(def) && compatible(s, c)) {
          out[key] = s;
        }
        continue;
      case 'group':
        out[key] = fitDraft(def.fields, s, c);
        continue;
      case 'array':
        if (Array.isArray(s)) {
          const item = def.item;
          out[key] =
            item.__ngu === 'leaf'
              ? keepsOut(item as LeafDef)
                ? c
                : s
              : s.map((row) => fitDraft(item as FormDefinition, row, def.newItem()));
        }
        continue;
      case 'dynamic':
        if (isPlainObject(s)) {
          out[key] = { ...(isPlainObject(c) ? c : {}), ...s };
        }
        continue;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Wiring
// ---------------------------------------------------------------------------

export interface DraftHandle extends FormDraft {
  /**
   * The form was saved or reset: drop the stored draft and any pending save now, rather than
   * in a later effect, so navigating away right after a submit cannot leave a stale draft.
   */
  settle(): void;
}

/**
 * Restores a saved draft once the form is ready (after `load`, if any), then saves changes
 * after a pause and removes the draft when nothing is left unsaved.
 */
export function setupDraft(args: {
  readonly options: DraftOptions;
  readonly fields: FormDefinition;
  readonly root: Field<any>;
  readonly model: { (): unknown; set(value: any): void };
  readonly changed: Signal<boolean>;
  readonly ready: Signal<boolean>;
  readonly discard: () => void;
  readonly effectOptions: CreateEffectOptions | undefined;
  readonly onDestroy: (fn: () => void) => void;
}): DraftHandle {
  const { options, fields, root, model, changed, ready } = args;
  const storage = resolveStorage(options.storage);
  const delay = options.debounce ?? 800;
  const restoredAt = signal<Date | undefined>(undefined);
  const savedAt = signal<Date | undefined>(undefined);
  /** 'waiting' until the form is ready, 'restoring' while the stored draft loads, then 'active'. */
  const phase = signal<'waiting' | 'restoring' | 'active'>('waiting');

  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending: (() => void) | undefined;
  const flush = () => {
    clearTimeout(timer);
    timer = undefined;
    const run = pending;
    pending = undefined;
    run?.();
  };
  const schedule = (fn: () => void, wait: number) => {
    clearTimeout(timer);
    pending = fn;
    timer = setTimeout(flush, wait);
  };

  // Restore once the form is ready.
  effect(() => {
    if (!ready() || phase() !== 'waiting') {
      return;
    }
    untracked(() => {
      phase.set('restoring');
      const before = clone(model());
      Promise.resolve()
        .then(() => storage.load(options.key))
        .then((envelope) => {
          const stored = readEnvelope(envelope);
          // Skip when the user started typing while the draft loaded.
          if (stored && deepEqual(model(), before)) {
            const next = fitDraft(fields, decode(stored.value), before);
            if (!deepEqual(next, before)) {
              model.set(next);
              root().markAsDirty();
              restoredAt.set(new Date(stored.savedAt));
              savedAt.set(new Date(stored.savedAt));
            }
          }
        })
        .catch(() => undefined)
        .finally(() => phase.set('active'));
    });
  }, args.effectOptions);

  // Save after a pause; remove when there is nothing unsaved.
  effect(() => {
    if (phase() !== 'active') {
      return;
    }
    const value = model();
    const hasChanges = changed();
    untracked(() => {
      if (!hasChanges) {
        clearTimeout(timer);
        pending = undefined;
        if (savedAt()) {
          savedAt.set(undefined);
          void storage.remove(options.key);
        }
        return;
      }
      const snapshot = persistable(fields, value);
      schedule(() => {
        const now = Date.now();
        const envelope: Envelope = { v: VERSION, savedAt: now, value: encode(snapshot) };
        void storage.save(options.key, envelope);
        savedAt.set(new Date(now));
      }, delay);
    });
  }, args.effectOptions);

  // Leaving the page must not lose the last keystrokes.
  if (typeof document !== 'undefined') {
    const onHide = () => {
      if (document.visibilityState === 'hidden') {
        flush();
      }
    };
    document.addEventListener('visibilitychange', onHide);
    args.onDestroy(() => {
      document.removeEventListener('visibilitychange', onHide);
      flush();
    });
  }

  return {
    restoredAt: restoredAt.asReadonly(),
    savedAt: savedAt.asReadonly(),
    discard() {
      settle();
      args.discard();
    },
    settle,
  };

  function settle(): void {
    clearTimeout(timer);
    pending = undefined;
    restoredAt.set(undefined);
    savedAt.set(undefined);
    void storage.remove(options.key);
  }
}

function readEnvelope(value: unknown): Envelope | undefined {
  return isPlainObject(value) && value['v'] === VERSION && typeof value['savedAt'] === 'number' && 'value' in value
    ? (value as unknown as Envelope)
    : undefined;
}

/** A `FormDraft` that does nothing, for forms without `draft`. */
export function inertDraft(): DraftHandle {
  const none = computed(() => undefined);
  return { restoredAt: none, savedAt: none, discard: () => undefined, settle: () => undefined };
}
