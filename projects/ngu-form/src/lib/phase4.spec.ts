import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { Field } from '@angular/forms/signals';
import { defineForm } from './define';
import { copyRow, ordered } from './internal';
import { createNguI18n } from './messages';
import { REVIEW_STEP } from './steps';
import type { ArrayDef, FormDefOptions, GroupDef, LeafDef } from './types';
import { viewValue } from './view';

interface Trip {
  who: { name: string; email: string };
  stay: { nights: number; hotel: string };
  extras: { notes: string };
}

const blankTrip = (): Trip => ({ who: { name: '', email: '' }, stay: { nights: 1, hotel: '' }, extras: { notes: '' } });

function trip(options: FormDefOptions<Trip> = {}, initial: Trip = blankTrip()) {
  return TestBed.runInInjectionContext(() =>
    defineForm<Trip>(
      initial,
      {
        who: { title: 'You', fields: { name: { label: 'Name', required: true }, email: 'Email' } },
        stay: {
          title: 'Stay',
          hidden: (m) => m.who.name === 'day trip',
          fields: { nights: { label: 'Nights', min: 1 }, hotel: { label: 'Hotel', required: true } },
        },
        extras: { title: 'Extras', fields: { notes: 'Notes' } },
      },
      { layout: 'steps', ...options },
    ),
  );
}

describe('steps', () => {
  it('lists the top-level groups as steps and starts on the first', () => {
    const def = trip();
    expect(def.layout).toBe('steps');
    expect(def.steps.keys()).toEqual(['who', 'stay', 'extras']);
    expect(def.steps.current()).toBe('who');
    expect(def.steps.index()).toBe(0);
    expect(def.steps.count()).toBe(3);
    expect(def.steps.first()).toBe(true);
    expect(def.steps.last()).toBe(false);
  });

  it('refuses Next while the step is invalid, then moves on once it is valid', () => {
    const def = trip();
    expect(def.steps.next()).toBe(false);
    expect(def.steps.current()).toBe('who');

    def.tree.who.name().value.set('Asha');
    expect(def.steps.next()).toBe(true);
    expect(def.steps.current()).toBe('stay');
    def.steps.back();
    expect(def.steps.current()).toBe('who');
    expect(def.value().who.name).toBe('Asha');
  });

  it('opens later steps only once every step before them is valid', () => {
    const def = trip();
    expect(def.steps.canGoTo('extras')).toBe(false);
    expect(def.steps.goTo('extras')).toBe(false);

    def.tree.who.name().value.set('Asha');
    expect(def.steps.canGoTo('stay')).toBe(true);
    expect(def.steps.canGoTo('extras')).toBe(false);
    def.tree.stay.hotel().value.set('Lake view');
    expect(def.steps.goTo('extras')).toBe(true);
    // Going back is always allowed, even to a step that became invalid.
    def.tree.who.name().value.set('');
    expect(def.steps.goTo('who')).toBe(true);
    expect(def.steps.goTo('nope')).toBe(false);
  });

  it('skips a hidden step, and moves off it when it becomes hidden', () => {
    const def = trip();
    def.tree.who.name().value.set('day trip');
    expect(def.steps.keys()).toEqual(['who', 'extras']);
    expect(def.steps.next()).toBe(true);
    expect(def.steps.current()).toBe('extras');
    expect(def.steps.last()).toBe(true);

    def.tree.who.name().value.set('Asha');
    def.steps.goTo('stay');
    expect(def.steps.current()).toBe('stay');
    def.tree.who.name().value.set('day trip');
    expect(def.steps.current()).toBe('extras');
  });

  it('ends with a review step; Edit returns to it after Next', () => {
    const def = trip({ review: 'Check' }, {
      who: { name: 'Asha', email: '' },
      stay: { nights: 2, hotel: 'Lake view' },
      extras: { notes: '' },
    });
    expect(def.steps.keys()).toEqual(['who', 'stay', 'extras', REVIEW_STEP]);
    expect(def.steps.goTo(REVIEW_STEP)).toBe(true);
    expect(def.steps.last()).toBe(true);
    expect(def.steps.next()).toBe(false);
  });

  it('restarts on reset', () => {
    const def = trip({}, { who: { name: 'Asha', email: '' }, stay: { nights: 2, hotel: 'X' }, extras: { notes: '' } });
    def.steps.goTo('extras');
    def.reset();
    expect(def.steps.current()).toBe('who');
  });

  it('reports the first step with errors', () => {
    const def = trip({}, { who: { name: 'Asha', email: '' }, stay: { nights: 0, hotel: '' }, extras: { notes: '' } });
    expect(def.steps.next()).toBe(true);
    // firstInvalid is internal to the wizard; check it through the handle.
    expect((def.steps as unknown as { firstInvalid(): string }).firstInvalid()).toBe('stay');
  });

  it('are inert without layout steps', () => {
    const def = TestBed.runInInjectionContext(() => defineForm({ a: '' }, { a: 'A' }));
    expect(def.steps.keys()).toEqual([]);
    expect(def.steps.next()).toBe(false);
    expect(def.steps.goTo('a')).toBe(false);
  });
});

describe('section layouts', () => {
  it('need groups or lists at the top of a wizard or tabs', () => {
    expect(() =>
      TestBed.runInInjectionContext(() => defineForm({ name: '', more: { x: '' } }, { name: 'Name', more: { x: 'X' } }, { layout: 'steps' })),
    ).toThrow(/"name" must be a group or a list/);
    expect(() =>
      TestBed.runInInjectionContext(() =>
        defineForm({ g: { a: '', b: { c: '' } } }, { g: { layout: 'tabs', fields: { a: 'A', b: { c: 'C' } } } }),
      ),
    ).toThrow(/"g" shows its entries as tabs, so "a" must be a group or a list/);
  });

  it('allow steps only on the whole form', () => {
    expect(() =>
      TestBed.runInInjectionContext(() =>
        defineForm({ g: { b: { c: '' } } }, { g: { layout: 'steps' as never, fields: { b: { c: 'C' } } } }),
      ),
    ).toThrow(/only the whole form can be a wizard/);
  });

  it('make an accordion of collapsible groups and lists, the first one open', () => {
    const def = TestBed.runInInjectionContext(() =>
      defineForm(
        { intro: '', a: { x: '' }, b: { y: '' }, c: { z: '' }, list: [] as string[] },
        {
          intro: 'Intro',
          a: { title: 'A', fields: { x: 'X' } },
          b: { title: 'B', fields: { y: 'Y' } },
          c: { title: 'C', collapsed: false, fields: { z: 'Z' } },
          list: { title: 'List', newItem: '', item: 'Item' },
        },
        { layout: 'accordion' },
      ),
    );
    expect((def.fields['a'] as GroupDef).collapsed).toBe(false);
    expect((def.fields['b'] as GroupDef).collapsed).toBe(true);
    expect((def.fields['c'] as GroupDef).collapsed).toBe(false);
    expect((def.fields['list'] as ArrayDef).collapsed).toBe(true);
    expect((def.fields['intro'] as LeafDef).type).toBe('text');
  });

  it('keep tabs on groups and accept order on every kind of entry', () => {
    const def = TestBed.runInInjectionContext(() =>
      defineForm(
        { g: { one: { a: '' }, two: { b: '' } }, t: { x: { a: '' } } },
        {
          g: {
            order: 2,
            fields: { $note: { text: 'Hi', order: -1 } as never, one: { title: 'One', order: 1, fields: { a: 'A' } }, two: { b: 'B' } },
          },
          t: { layout: 'tabs', fields: { x: { a: 'A' } } },
        },
      ),
    );
    const g = def.fields['g'] as GroupDef;
    expect((def.fields['t'] as GroupDef).layout).toBe('tabs');
    expect(g.order).toBe(2);
    expect(ordered(g.fields).map(([k]) => k)).toEqual(['$note', 'two', 'one']);
  });
});

describe('ordered', () => {
  it('sorts by order like CSS, keeping model order for ties', () => {
    const leaf = (order?: number) => ({ __ngu: 'leaf', type: 'text', order }) as LeafDef;
    expect(ordered({ a: leaf(), b: leaf(1), c: leaf(-1), d: leaf(), e: leaf(1) }).map(([k]) => k)).toEqual([
      'c',
      'a',
      'd',
      'b',
      'e',
    ]);
  });
});

describe('array options', () => {
  it('table layout needs object items made of plain fields, and no summary', () => {
    expect(() =>
      TestBed.runInInjectionContext(() =>
        defineForm({ tags: [] as string[] }, { tags: { layout: 'table', newItem: '', item: 'Tag' } }),
      ),
    ).toThrow(/needs object items made of plain fields/);
    expect(() =>
      TestBed.runInInjectionContext(() =>
        defineForm({ rows: [] as { a: { b: string } }[] }, { rows: { layout: 'table', newItem: { a: { b: '' } }, item: { a: { b: 'B' } } } }),
      ),
    ).toThrow(/plain fields/);
    expect(() =>
      TestBed.runInInjectionContext(() =>
        defineForm({ rows: [] as { a: string }[] }, {
          rows: { layout: 'table', summary: (r) => r.a, newItem: { a: '' }, item: { a: 'A' } },
        }),
      ),
    ).toThrow(/remove "summary"/);
  });

  it('keeps reorder, duplicate, summary, layout and virtual on the definition', () => {
    const summary = (r: { a: string }) => r.a;
    const def = TestBed.runInInjectionContext(() =>
      defineForm({ rows: [] as { a: string }[] }, {
        rows: { reorder: true, duplicate: 'Copy', summary, virtual: true, newItem: { a: '' }, item: { a: 'A' } },
      }),
    );
    expect(def.fields['rows']).toMatchObject({ reorder: true, duplicate: 'Copy', summary, virtual: true });
  });
});

describe('nested arrays', () => {
  interface Plan {
    days: { title: string; slots: { time: string; what: string; minutes: number; total: number }[] }[];
  }
  const slot = () => ({ time: '', what: '', minutes: 30, total: 0 });

  function plan(initial: Plan) {
    return TestBed.runInInjectionContext(() =>
      defineForm<Plan>(initial, {
        days: {
          newItem: () => ({ title: '', slots: [] }),
          item: {
            title: { label: 'Day', required: true },
            slots: {
              min: 1,
              newItem: slot,
              item: {
                time: 'Time',
                // The scope inside the inner list is the inner row.
                what: { label: 'What', required: (_, s) => s.time !== '' },
                minutes: 'Minutes',
                total: { label: 'Total', compute: (_, s) => s.minutes * 2 },
              },
            },
          },
        },
      }),
    );
  }

  it('apply rules and logic per inner row', () => {
    const def = plan({ days: [{ title: 'Mon', slots: [{ ...slot(), time: '09:00' }, slot()] }] });
    const slots = def.tree.days[0].slots;
    expect(slots[0].what().errors().map((e) => e.kind)).toEqual(['required']);
    expect(slots[1].what().errors()).toEqual([]);
    expect(def.value().days[0].slots.map((s) => s.total)).toEqual([60, 60]);

    def.tree.days[0].slots[1].minutes().value.set(10);
    TestBed.tick();
    expect(def.value().days[0].slots[1].total).toBe(20);

    def.tree.days[0].slots().value.set([]);
    expect(def.tree.days[0].slots().errors().map((e) => e.kind)).toEqual(['minLength']);
  });

  it('report changes and reset like any other value', () => {
    const def = plan({ days: [{ title: 'Mon', slots: [slot()] }] });
    def.tree.days[0].slots[0].what().value.set('Walk');
    // Rows carry Signal Forms' identity symbols, so compare the plain data.
    expect(JSON.parse(JSON.stringify(def.changes()))).toEqual({
      days: [{ title: 'Mon', slots: [{ time: '', what: 'Walk', minutes: 30, total: 60 }] }],
    });
    def.reset();
    expect(def.value().days[0].slots[0].what).toBe('');
  });

  it('reject lists of lists without an object in between', () => {
    expect(() =>
      TestBed.runInInjectionContext(() => defineForm({ grid: [] as string[][] }, { grid: { newItem: [], item: 'Cell' as never } })),
    ).toThrow(/lists themselves|is an array/);
  });
});

describe('whole-form disabled and readonly', () => {
  it('follow a signal and reach every field', () => {
    const locked = signal(false);
    const busy = signal(false);
    const def = TestBed.runInInjectionContext(() =>
      defineForm(
        { name: '', rows: [{ a: '' }] },
        { name: { label: 'Name', required: true }, rows: { newItem: { a: '' }, item: { a: 'A' } } },
        { readonly: locked, disabled: () => busy() },
      ),
    );
    expect(def.tree.name().readonly()).toBe(false);
    expect(def.valid()).toBe(false);

    locked.set(true);
    expect(def.tree.name().readonly()).toBe(true);
    expect(def.tree.rows[0].a().readonly()).toBe(true);
    // Read-only fields are not validated.
    expect(def.valid()).toBe(true);

    locked.set(false);
    busy.set(true);
    expect(def.tree.rows[0].a().disabled()).toBe(true);
    busy.set(false);
    expect(def.tree.rows[0].a().disabled()).toBe(false);
  });

  it('accept plain flags', () => {
    const def = TestBed.runInInjectionContext(() => defineForm({ a: '' }, { a: 'A' }, { disabled: true }));
    expect(def.tree.a().disabled()).toBe(true);
  });
});

describe('copyRow', () => {
  it('copies plain data without symbol keys, and shares files', () => {
    const id = Symbol('row');
    const when = new Date(Date.UTC(2026, 0, 2));
    const file = new File(['x'], 'a.txt');
    const row = { [id]: 1, name: 'A', when, files: [file], nested: { list: [{ [id]: 2, v: 1 }] } };
    const copy = copyRow(row);
    expect(copy).toEqual({ name: 'A', when, files: [file], nested: { list: [{ v: 1 }] } });
    expect(Object.getOwnPropertySymbols(copy)).toEqual([]);
    expect(Object.getOwnPropertySymbols(copy.nested.list[0])).toEqual([]);
    expect(copy.when).not.toBe(when);
    expect(copy.files[0]).toBe(file);
  });
});

describe('view values', () => {
  const i18n = createNguI18n([], 'en-US');

  function view<T extends object>(initial: T, spec: object) {
    const def = TestBed.runInInjectionContext(() => defineForm<T>(initial, spec as never));
    return (key: string) =>
      viewValue(def.fields[key] as LeafDef, (def.tree as unknown as Record<string, Field<any>>)[key], def.value(), i18n);
  }

  it('formats values by type for the locale', () => {
    const v = view(
      {
        name: 'Asha',
        empty: '',
        secret: 'hunter2',
        agree: true,
        plan: 'pro',
        colors: ['r', 'g'],
        born: new Date(Date.UTC(1990, 4, 17)),
        start: '09:30',
        amount: 1234.5,
        stars: 4,
        weight: 70,
        tags: ['a', 'b', 'c'],
        stay: { from: '2026-01-02', to: '2026-01-05' },
        note: 'one\ntwo',
        shade: '#ff0000',
      },
      {
        name: 'Name',
        empty: 'Empty',
        secret: { label: 'Password', type: 'password' },
        agree: 'Agree',
        plan: { label: 'Plan', type: 'radio', options: [{ value: 'pro', label: 'Pro plan' }] },
        colors: { label: 'Colors', type: 'checkbox', options: [{ value: 'r', label: 'Red' }, { value: 'g', label: 'Green' }] },
        born: 'Born',
        start: { label: 'Start', type: 'time' },
        amount: { label: 'Amount', type: 'currency', currency: 'INR' },
        stars: { label: 'Stars', type: 'rating' },
        weight: { label: 'Weight', suffix: 'kg' },
        tags: { label: 'Tags', type: 'tags' },
        stay: { label: 'Stay', type: 'daterange' },
        note: { label: 'Note', type: 'textarea' },
        shade: { label: 'Shade', type: 'color' },
      },
    );
    expect(v('name')).toEqual({ text: 'Asha' });
    expect(v('empty')).toEqual({ text: '', empty: true });
    expect(v('secret')).toMatchObject({ secret: true });
    expect(v('agree').text).toBe('Yes');
    expect(v('plan').text).toBe('Pro plan');
    expect(v('colors').text).toBe('Red and Green');
    expect(v('born').text).toBe('May 17, 1990');
    expect(v('start').text).toBe('9:30 AM');
    expect(v('amount').text).toBe('₹1,234.50');
    expect(v('stars').text).toBe('4 of 5');
    expect(v('weight').text).toBe('70 kg');
    expect(v('tags').text).toBe('a, b, and c');
    expect(v('stay').text).toBe('Jan 2, 2026 – Jan 5, 2026');
    expect(v('note')).toEqual({ text: 'one\ntwo', multiline: true });
    expect(v('shade')).toEqual({ text: '#ff0000', color: '#ff0000' });
  });

  it('uses display when set, and treats a zero rating as empty', () => {
    const v = view(
      { size: 'm', stars: 0 },
      { size: { label: 'Size', display: (s: string, m: { stars: number }) => `${s.toUpperCase()} (${m.stars})` }, stars: { label: 'Stars', type: 'rating' } },
    );
    expect(v('size').text).toBe('M (0)');
    expect(v('stars').empty).toBe(true);
  });

  it('shows options from a function of the model, and values without an option as written', () => {
    const v = view(
      { country: 'IN', city: 'SRT' },
      {
        country: { label: 'Country', type: 'select', options: [{ value: 'IN', label: 'India' }] },
        city: { label: 'City', type: 'select', options: (m: { country: string }) => (m.country === 'IN' ? [{ value: 'AMD', label: 'Ahmedabad' }] : []) },
      },
    );
    expect(v('country').text).toBe('India');
    expect(v('city').text).toBe('SRT');
  });
});
