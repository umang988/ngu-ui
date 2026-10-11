import { TestBed } from '@angular/core/testing';
import type { Field } from '@angular/forms/signals';
import { resolveCols } from './config';
import { defineForm } from './define';
import { NGU_CHOICES } from './internal';
import { errorMessage } from './messages';
import type { Choice, LeafDef } from './types';
import { provideNguFormConfig } from './config';
import { hasUnsavedChanges, nguUnsavedChangesGuard } from './unsaved-changes';

const run = <T>(fn: () => T) => TestBed.runInInjectionContext(fn);

describe('dependent options', () => {
  const states: Record<string, Choice<string>[]> = {
    in: [{ value: 'mh', label: 'Maharashtra' }],
    us: [
      { value: 'ca', label: 'California' },
      { value: 'ny', label: 'New York' },
    ],
  };
  const countries = [
    { value: 'in', label: 'India' },
    { value: 'us', label: 'United States' },
  ];

  function build(initial = { country: 'in', state: 'mh' }) {
    return run(() =>
      defineForm(initial, {
        country: { type: 'select', options: countries },
        state: { type: 'select', options: (m) => states[m.country] ?? [] },
      }),
    );
  }

  const choices = (field: Field<any>) => field().metadata(NGU_CHOICES)?.();

  it('computes options from the model', () => {
    const def = build();
    expect(choices(def.tree.state)).toEqual(states['in']);
    def.model.update((m) => ({ ...m, country: 'us' }));
    expect(choices(def.tree.state)).toEqual(states['us']);
  });

  it('clears the value when its option disappears', () => {
    const def = build();
    def.model.update((m) => ({ ...m, country: 'us' }));
    TestBed.tick();
    expect(def.value().state).toBe('');
  });

  it('keeps a value that is still offered', () => {
    const def = build({ country: 'us', state: 'ca' });
    def.model.update((m) => ({ ...m, state: 'ny' }));
    TestBed.tick();
    expect(def.value().state).toBe('ny');
  });

  it('keeps a value that was never in the list, such as data loaded before its options', () => {
    const def = build({ country: 'in', state: 'zz' });
    def.model.update((m) => ({ ...m, country: 'us' }));
    TestBed.tick();
    expect(def.value().state).toBe('zz');
  });

  it('works per array item', () => {
    const def = run(() =>
      defineForm(
        { rows: [{ country: 'in', state: 'mh' }, { country: 'in', state: 'mh' }] },
        {
          rows: {
            newItem: { country: 'in', state: '' },
            item: {
              country: { type: 'select', options: countries },
              state: { type: 'select', options: (_, row) => states[row.country] ?? [] },
            },
          },
        },
      ),
    );
    def.tree.rows[1].country().value.set('us');
    TestBed.tick();
    expect(def.value().rows.map((r) => r.state)).toEqual(['mh', '']);
  });
});

describe('computed fields', () => {
  interface Order {
    discount: number;
    lines: { qty: number; price: number; amount: number }[];
    total: number;
  }

  function build() {
    return run(() =>
      defineForm<Order>(
        { discount: 0, lines: [{ qty: 2, price: 5, amount: 0 }], total: 0 },
        {
          discount: 'Discount',
          lines: {
            newItem: { qty: 1, price: 0, amount: 0 },
            item: {
              qty: 'Qty',
              price: 'Price',
              amount: { label: 'Amount', compute: (_, line) => line.qty * line.price },
            },
          },
          total: {
            label: 'Total',
            compute: (m) => m.lines.reduce((sum, l) => sum + l.qty * l.price, 0) - m.discount,
          },
        },
      ),
    );
  }

  it('fills computed values before the form starts', () => {
    const def = build();
    expect(def.value().lines[0].amount).toBe(10);
    expect(def.value().total).toBe(10);
    expect(def.initial.total).toBe(10);
  });

  it('updates live and is read-only', () => {
    const def = build();
    def.tree.lines[0].qty().value.set(3);
    def.tree.discount().value.set(5);
    TestBed.tick();
    expect(def.value().lines[0].amount).toBe(15);
    expect(def.value().total).toBe(10);
    expect(def.tree.total().readonly()).toBe(true);
  });

  it('covers rows added later and keeps row identity', () => {
    const def = build();
    const firstRow = def.tree.lines[0];
    def.model.update((m) => ({ ...m, lines: [...m.lines, { qty: 4, price: 1, amount: 0 }] }));
    TestBed.tick();
    expect(def.value().lines.map((l) => l.amount)).toEqual([10, 4]);
    expect(def.tree.lines[0]).toBe(firstRow);
  });

  it('does not mark computed fields dirty', () => {
    const def = build();
    def.tree.lines[0].qty().value.set(9);
    TestBed.tick();
    expect(def.tree.total().dirty()).toBe(false);
  });
});

describe('conditional required', () => {
  function build(required: LeafDef['required']) {
    return run(() =>
      defineForm({ plan: 'free', company: '' }, { plan: 'Plan', company: { label: 'Company', required } as never }),
    );
  }

  it('is required only while the function says so', () => {
    const def = build((m: { plan: string }) => m.plan === 'pro');
    expect(def.tree.company().required()).toBe(false);
    expect(def.tree.company().errors()).toEqual([]);
    def.model.update((m) => ({ ...m, plan: 'pro' }));
    expect(def.tree.company().required()).toBe(true);
    expect(errorMessage(def.tree.company().errors(), def.fields['company'] as LeafDef)).toBe('Company is required');
  });

  it('uses a returned string as the message', () => {
    const def = build((m: { plan: string }) => m.plan === 'pro' && 'Pro accounts need a company');
    def.model.update((m) => ({ ...m, plan: 'pro' }));
    expect(def.tree.company().errors()[0]?.message).toBe('Pro accounts need a company');
  });
});

describe('form state', () => {
  interface Profile {
    name: string;
    plan: 'free' | 'pro';
    company: string;
    address: { city: string; zip: string };
    tags: string[];
  }
  const initial: Profile = { name: '', plan: 'free', company: '', address: { city: '', zip: '' }, tags: [] };

  function build(options: { omitHidden?: boolean } = {}) {
    return run(() =>
      defineForm<Profile>(
        structuredClone(initial),
        {
          name: { label: 'Name', required: true },
          plan: 'Plan',
          company: { label: 'Company', hidden: (m) => m.plan !== 'pro' },
          address: { city: 'City', zip: 'ZIP' },
          tags: { newItem: '', item: 'Tag' },
          $note: { text: 'Static content is not part of the value' },
        },
        options,
      ),
    );
  }

  it('exposes dirty, touched, valid and pending', () => {
    const def = build();
    expect(def.dirty()).toBe(false);
    expect(def.touched()).toBe(false);
    expect(def.valid()).toBe(false);
    expect(def.pending()).toBe(false);
    expect(def.submitting()).toBe(false);
    def.tree.name().markAsDirty();
    def.tree.name().markAsTouched();
    def.tree.name().value.set('Asha');
    expect(def.dirty()).toBe(true);
    expect(def.touched()).toBe(true);
    expect(def.valid()).toBe(true);
  });

  it('lists only changed values, with arrays whole', () => {
    const def = build();
    expect(def.changes()).toEqual({});
    def.tree.address.city().value.set('Pune');
    def.tree.tags().value.set(['a']);
    expect(def.changes()).toEqual({ address: { city: 'Pune' }, tags: ['a'] });
  });

  it('drops a value changed back to where it was', () => {
    const def = build();
    def.tree.name().value.set('x');
    def.tree.name().value.set('');
    expect(def.changes()).toEqual({});
  });

  it('treats patched data as saved, but keeps earlier edits', () => {
    const def = build();
    def.tree.name().value.set('Asha');
    def.patch({ address: { city: 'Pune', zip: '411001' } });
    expect(def.changes()).toEqual({ name: 'Asha' });
  });

  it('starts over after reset', () => {
    const def = build();
    def.tree.name().value.set('Asha');
    def.reset();
    expect(def.changes()).toEqual({});
    def.reset({ ...initial, name: 'Loaded' });
    expect(def.changes()).toEqual({});
  });

  it('payload is the model by default', () => {
    const def = build();
    expect(def.payload()).toBe(def.value());
  });

  it('omitHidden leaves hidden values out of the payload', () => {
    const def = build({ omitHidden: true });
    def.tree.company().value.set('Acme');
    expect('company' in def.payload()).toBe(false);
    def.tree.plan().value.set('pro');
    expect(def.payload().company).toBe('Acme');
  });

  it('mapValue shapes the payload after omitHidden', () => {
    const def = run(() =>
      defineForm(
        { first: 'Asha', last: 'Rao', plan: 'free', company: 'Acme' },
        { first: 'First', last: 'Last', plan: 'Plan', company: { hidden: (m) => m.plan !== 'pro' } },
        {
          omitHidden: true,
          mapValue: (m) => ({ fullName: `${m.first} ${m.last}`, company: m.company ?? null }),
        },
      ),
    );
    const payload: { fullName: string; company: string | null } = def.payload();
    expect(payload).toEqual({ fullName: 'Asha Rao', company: null });
  });

  it('describes static content without a model key', () => {
    const def = build();
    expect(def.fields['$note']).toMatchObject({ __ngu: 'static', kind: 'text' });
    expect('$note' in def.value()).toBe(false);
  });
});

describe('nguUnsavedChangesGuard', () => {
  function setup(confirmLeave?: () => boolean) {
    TestBed.configureTestingModule({
      providers: confirmLeave ? [provideNguFormConfig({ confirmLeave })] : [],
    });
    const form = run(() => defineForm({ name: '' }, { name: 'Name' }));
    const page = { form, other: 42 };
    const guard = () => run(() => nguUnsavedChangesGuard(page));
    return { form, guard };
  }

  it('lets the user leave a clean form', () => {
    const confirm = vi.fn(() => false);
    const { guard } = setup(confirm);
    expect(guard()).toBe(true);
    expect(confirm).not.toHaveBeenCalled();
  });

  it('asks when a form has unsaved changes', () => {
    const confirm = vi.fn(() => false);
    const { form, guard } = setup(confirm);
    form.tree.name().markAsDirty();
    form.tree.name().value.set('Asha');
    expect(hasUnsavedChanges(form)).toBe(true);
    expect(guard()).toBe(false);
    expect(confirm).toHaveBeenCalledOnce();
  });

  it('does not ask when the edit was undone', () => {
    const confirm = vi.fn(() => false);
    const { form, guard } = setup(confirm);
    form.tree.name().markAsDirty();
    form.tree.name().value.set('Asha');
    form.tree.name().value.set('');
    expect(guard()).toBe(true);
  });
});

describe('resolveCols', () => {
  const bp = { sm: 480, md: 720, lg: 960 };

  it('collapses a number below sm', () => {
    expect(resolveCols(3, 479, bp)).toBe(1);
    expect(resolveCols(3, 480, bp)).toBe(3);
  });

  it('picks the largest breakpoint reached', () => {
    const cols = { base: 1, md: 2, lg: 3 };
    expect(resolveCols(cols, 500, bp)).toBe(1);
    expect(resolveCols(cols, 800, bp)).toBe(2);
    expect(resolveCols(cols, 1200, bp)).toBe(3);
  });

  it('uses the widest setting before the form is measured', () => {
    expect(resolveCols({ base: 1, md: 2 }, undefined, bp)).toBe(2);
    expect(resolveCols(undefined, 1000, bp)).toBe(1);
  });
});
