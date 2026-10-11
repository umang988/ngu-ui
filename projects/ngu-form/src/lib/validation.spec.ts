import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { defineForm } from './define';

const kinds = (errors: readonly { kind: string }[]) => errors.map((e) => e.kind);
const messages = (errors: readonly { message?: string }[]) => errors.map((e) => e.message);

describe('custom validation', () => {
  it('turns a returned string into an error message', () => {
    const def = TestBed.runInInjectionContext(() =>
      defineForm({ code: '' }, { code: { validate: (v) => (v.startsWith('X') ? undefined : 'Must start with X') } }),
    );
    expect(messages(def.tree.code().errors())).toEqual(['Must start with X']);
    expect(kinds(def.tree.code().errors())).toEqual(['custom']);
    def.model.set({ code: 'X1' });
    expect(def.tree.code().errors()).toEqual([]);
  });

  it('keeps the kind of a returned error object and runs every validator in a list', () => {
    const def = TestBed.runInInjectionContext(() =>
      defineForm({ code: 'ab' }, {
        code: {
          validate: [
            (v) => (v.length < 3 ? { kind: 'short', message: 'Too short' } : undefined),
            (v) => (/\d/.test(v) ? undefined : 'Needs a digit'),
          ],
        },
      }),
    );
    expect(kinds(def.tree.code().errors())).toEqual(['short', 'custom']);
    expect(messages(def.tree.code().errors())).toEqual(['Too short', 'Needs a digit']);
  });

  it('re-validates when another field the validator reads changes', () => {
    const def = TestBed.runInInjectionContext(() =>
      defineForm({ password: 'secret', confirm: 'secret' }, {
        password: 'Password',
        confirm: { validate: (v, m) => (v === m.password ? undefined : 'Passwords do not match') },
      }),
    );
    expect(def.tree.confirm().errors()).toEqual([]);
    def.model.update((m) => ({ ...m, password: 'changed' }));
    expect(messages(def.tree.confirm().errors())).toEqual(['Passwords do not match']);
  });

  it('validates a group as a whole', () => {
    const def = TestBed.runInInjectionContext(() =>
      defineForm({ range: { from: 5, to: 1 } }, {
        range: {
          validate: (r) => (r.from <= r.to ? undefined : 'From must be before to'),
          fields: { from: 'From', to: 'To' },
        },
      }),
    );
    expect(messages(def.tree.range().errors())).toEqual(['From must be before to']);
    expect(def.tree.range.from().errors()).toEqual([]);
  });

  it('validates an array as a whole and passes the item to item validators', () => {
    const def = TestBed.runInInjectionContext(() =>
      defineForm({ items: [{ sku: 'A', qty: 1 }, { sku: 'A', qty: 9 }] }, {
        items: {
          newItem: { sku: '', qty: 1 },
          validate: (list) =>
            new Set(list.map((i) => i.sku)).size === list.length ? undefined : 'SKUs must be unique',
          item: {
            sku: 'SKU',
            qty: { validate: (v, _m, item) => (item.sku === 'A' && v > 5 ? 'At most 5 of A' : undefined) },
          },
        },
      }),
    );
    expect(messages(def.tree.items().errors())).toEqual(['SKUs must be unique']);
    expect(def.tree.items[0].qty().errors()).toEqual([]);
    expect(messages(def.tree.items[1].qty().errors())).toEqual(['At most 5 of A']);
  });
});

describe('async validation', () => {
  function deferred<T>() {
    let resolve!: (v: T) => void;
    const promise = new Promise<T>((r) => (resolve = r));
    return { promise, resolve };
  }

  it('is pending while the check runs, then reports its result', async () => {
    const calls: { value: string; signal: AbortSignal; done: ReturnType<typeof deferred<string | undefined>> }[] = [];
    const def = TestBed.runInInjectionContext(() =>
      defineForm({ username: 'umang' }, {
        username: {
          required: true,
          validateAsync: (value, _m, _s, signal) => {
            const done = deferred<string | undefined>();
            calls.push({ value, signal, done });
            return done.promise;
          },
        },
      }),
    );
    const appRef = TestBed.inject(ApplicationRef);
    appRef.tick();
    expect(calls.map((c) => c.value)).toEqual(['umang']);
    expect(def.tree.username().pending()).toBe(true);

    calls[0].done.resolve('Username is taken');
    await appRef.whenStable();
    expect(def.tree.username().pending()).toBe(false);
    expect(messages(def.tree.username().errors())).toEqual(['Username is taken']);

    def.model.set({ username: 'free-name' });
    appRef.tick();
    expect(calls.map((c) => c.value)).toEqual(['umang', 'free-name']);
    calls[1].done.resolve(undefined);
    await appRef.whenStable();
    expect(def.tree.username().errors()).toEqual([]);
    expect(def.tree().valid()).toBe(true);
  });

  it('aborts a running check when the value changes', async () => {
    const signals: AbortSignal[] = [];
    const def = TestBed.runInInjectionContext(() =>
      defineForm({ username: 'a' }, {
        username: {
          validateAsync: (_v, _m, _s, signal) => {
            signals.push(signal);
            return new Promise(() => {});
          },
        },
      }),
    );
    const appRef = TestBed.inject(ApplicationRef);
    appRef.tick();
    def.model.set({ username: 'ab' });
    appRef.tick();
    expect(signals.length).toBe(2);
    expect(signals[0].aborted).toBe(true);
    expect(signals[1].aborted).toBe(false);
  });

  it('does not call the server while sync rules fail', () => {
    let called = 0;
    TestBed.runInInjectionContext(() =>
      defineForm({ username: '' }, {
        username: {
          required: true,
          validateAsync: async () => {
            called++;
            return undefined;
          },
        },
      }),
    );
    TestBed.inject(ApplicationRef).tick();
    expect(called).toBe(0);
  });
});
