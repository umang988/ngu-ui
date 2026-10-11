import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { defineForm } from './define';
import { errorMessage } from './messages';
import type { DynamicDef, DynamicField } from './types';

type Answers = Record<string, string | number | boolean>;
interface Survey {
  name: string;
  answers: Answers;
}

const kinds = (errors: readonly { kind: string }[]) => errors.map((e) => e.kind);

function build(list: DynamicField[] | ReturnType<typeof signal<DynamicField[]>>, initial: Answers = {}, keepRemoved = false) {
  return TestBed.runInInjectionContext(() =>
    defineForm<Survey>({ name: '', answers: initial }, {
      name: 'Name',
      answers: { title: 'Questions', cols: 2, fields: list, keepRemoved },
    }),
  );
}

describe('run-time fields: model', () => {
  it('adds a default value for every listed field, in list order', () => {
    const def = build([
      { key: 'city', label: 'City' },
      { key: 'age', type: 'number' },
      { key: 'agree', type: 'checkbox' },
      { key: 'color', type: 'select', default: 'red', options: [{ value: 'red', label: 'Red' }] },
    ]);
    expect(def.value().answers).toEqual({ city: '', age: 0, agree: false, color: 'red' });
    expect(Object.keys(def.value().answers)).toEqual(['city', 'age', 'agree', 'color']);
    expect((def.fields['answers'] as DynamicDef).__ngu).toBe('dynamic');
  });

  it('keeps existing values and drops values of unlisted fields', () => {
    const def = build([{ key: 'city' }], { city: 'Surat', stale: 'x' });
    expect(def.value().answers).toEqual({ city: 'Surat' });
  });

  it('keeps unlisted values with keepRemoved', () => {
    const def = build([{ key: 'city' }], { city: 'Surat', stale: 'x' }, true);
    expect(def.value().answers).toEqual({ city: 'Surat', stale: 'x' });
  });

  it('follows the list signal as fields are added and removed', () => {
    const list = signal<DynamicField[]>([{ key: 'a' }]);
    const def = build(list);
    list.set([{ key: 'a' }, { key: 'b', type: 'number', required: true }]);
    TestBed.tick();
    expect(def.value().answers).toEqual({ a: '', b: 0 });

    def.model.update((m) => ({ ...m, answers: { ...m.answers, b: Number.NaN } }));
    expect(kinds(def.tree.answers['b']().errors())).toEqual(['required']);

    list.set([{ key: 'b', type: 'number' }]);
    TestBed.tick();
    expect(Object.keys(def.value().answers)).toEqual(['b']);
    expect(def.tree.answers['b']().errors()).toEqual([]);
  });

  it('restores listed keys after a reset to a value without them', () => {
    const list = signal<DynamicField[]>([]);
    const def = build(list);
    list.set([{ key: 'late', label: 'Late' }]);
    TestBed.tick();
    def.reset();
    TestBed.tick();
    expect(def.value().answers).toEqual({ late: '' });
  });

  it('rejects duplicate keys', () => {
    expect(() => build([{ key: 'x' }, { key: 'x' }])).toThrow(/two run-time fields with key "x"/);
  });
});

describe('run-time fields: rules', () => {
  it('applies the built-in rules per key', () => {
    const def = build([
      { key: 'req', label: 'Req', required: 'Please answer' },
      { key: 'short', minLength: 3, default: 'ab' },
      { key: 'zip', pattern: '\\d{5}', default: '1234567' },
      { key: 'age', type: 'number', min: 18, max: 99, default: 10 },
      { key: 'mail', type: 'email', default: 'nope' },
      { key: 'free', default: 'anything' },
    ]);
    const a = def.tree.answers;
    expect(kinds(a['req']().errors())).toEqual(['required']);
    expect(errorMessage(a['req']().errors(), { __ngu: 'leaf', type: 'text', required: 'Please answer' })).toBe('Please answer');
    expect(kinds(a['short']().errors())).toEqual(['minLength']);
    expect(kinds(a['zip']().errors())).toEqual(['pattern']); // string patterns must match the whole value
    expect(kinds(a['age']().errors())).toEqual(['min']);
    expect(kinds(a['mail']().errors())).toEqual(['email']);
    expect(a['free']().errors()).toEqual([]);
  });

  it('runs custom validators with the sibling values', () => {
    const def = build([
      { key: 'from', type: 'number', default: 5 },
      { key: 'to', type: 'number', default: 1, validate: (v, _m, values) => (Number(v) >= Number(values['from']) ? undefined : 'Must be after from') },
    ]);
    expect(def.tree.answers['to']().errors()[0].message).toBe('Must be after from');
    def.model.update((m) => ({ ...m, answers: { ...m.answers, to: 9 } }));
    expect(def.tree.answers['to']().errors()).toEqual([]);
  });

  it('hides fields through showIf and hidden, and skips their validation', () => {
    const def = build([
      { key: 'uses', type: 'radio', default: 'no', options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }] },
      { key: 'version', required: true, showIf: { key: 'uses', equals: 'yes' } },
      { key: 'why', showIf: { key: 'uses', in: ['no'] } },
      { key: 'secret', hidden: (model) => model.name !== 'admin' },
    ]);
    const a = def.tree.answers;
    expect(a['version']().hidden()).toBe(true);
    expect(a['why']().hidden()).toBe(false);
    expect(a['secret']().hidden()).toBe(true);
    expect(def.tree().valid()).toBe(true);

    def.patch({ name: 'admin', answers: { uses: 'yes' } });
    expect(a['version']().hidden()).toBe(false);
    expect(a['why']().hidden()).toBe(true);
    expect(a['secret']().hidden()).toBe(false);
    expect(def.tree().valid()).toBe(false);
  });

  it('supports disabled and readonly as flags or functions', () => {
    const def = build([
      { key: 'locked', disabled: true },
      { key: 'ro', readonly: (_m, values) => values['locked'] === '' },
    ]);
    expect(def.tree.answers['locked']().disabled()).toBe(true);
    expect(def.tree.answers['ro']().readonly()).toBe(true);
  });

  it('works inside a group', () => {
    const def = TestBed.runInInjectionContext(() =>
      defineForm({ meta: { answers: {} as Answers } }, {
        meta: { answers: { fields: [{ key: 'q', required: true }] } },
      }),
    );
    expect(def.value().meta.answers).toEqual({ q: '' });
    expect(kinds(def.tree.meta.answers['q']().errors())).toEqual(['required']);
  });

  it('rejects run-time fields inside array items', () => {
    expect(() =>
      TestBed.runInInjectionContext(() =>
        defineForm({ rows: [] as { extra: Answers }[] }, {
          rows: { newItem: { extra: {} }, item: { extra: { fields: [] } } },
        }),
      ),
    ).toThrow(/not supported/);
  });
});

describe('run-time fields: input options', () => {
  it('pass prefix, suffix, counter, keyboard and textarea options to the renderer', () => {
    const def = build([
      { key: 'amount', type: 'number', prefix: '₹', suffix: 'per month', inputmode: 'decimal', enterkeyhint: 'next' },
      { key: 'story', type: 'textarea', maxLength: 300, counter: false, rows: 2, maxRows: 6 },
      { key: 'secret', type: 'password', reveal: false },
    ]);
    const entries = (def.fields['answers'] as DynamicDef).entries();
    expect(entries.get('amount')!.leaf).toMatchObject({ prefix: '₹', suffix: 'per month', inputmode: 'decimal', enterkeyhint: 'next' });
    expect(entries.get('story')!.leaf).toMatchObject({ counter: false, rows: 2, maxRows: 6 });
    expect(entries.get('secret')!.leaf).toMatchObject({ reveal: false });
  });
});
