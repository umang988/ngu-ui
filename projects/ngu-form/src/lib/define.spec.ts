import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { defineForm } from './define';
import { isLeafDef, type ArrayDef, type FormDefinition, type GroupDef, type LeafDef } from './types';

interface Model {
  name: string;
  age: number;
  address: { city: string };
  plan: 'free' | 'pro';
  agree: boolean;
}

const initial: Model = { name: '', age: 0, address: { city: '' }, plan: 'free', agree: false };

function build() {
  return TestBed.runInInjectionContext(() =>
    defineForm<Model>(
      initial,
      {
        name: { label: 'Name', required: true, minLength: 2 },
        age: { label: 'Age', min: 18 },
        address: {
          cols: 2,
          fields: { city: { required: 'City please', hidden: (m) => m.plan === 'free' } },
        },
        plan: {
          type: 'select',
          options: [
            { value: 'free', label: 'Free' },
            { value: 'pro', label: 'Pro' },
          ],
        },
        agree: 'I agree',
      },
      { cols: 2 },
    ),
  );
}

describe('defineForm', () => {
  it('creates the model signal from an initial value', () => {
    const def = build();
    expect(def.model()).toEqual(initial);
    expect(def.value()).toEqual(initial);
    expect(def.cols).toBe(2);
  });

  it('accepts an existing model signal', () => {
    const model = signal({ email: '' });
    const def = TestBed.runInInjectionContext(() => defineForm(model, { email: 'Email' }));
    expect(def.model).toBe(model);
  });

  it('infers the input type from the value and accepts a label shorthand', () => {
    const def = build();
    expect(def.fields['name']).toMatchObject({ __ngu: 'leaf', type: 'text', label: 'Name' });
    expect(def.fields['age']).toMatchObject({ type: 'number', min: 18 });
    expect(def.fields['agree']).toMatchObject({ type: 'checkbox', label: 'I agree' });
    expect((def.fields['plan'] as LeafDef).choices).toHaveLength(2);
  });

  it('turns nested objects into groups, with or without a wrapper', () => {
    const def = build();
    const address = def.fields['address'] as GroupDef;
    expect(address.__ngu).toBe('group');
    expect(address.cols).toBe(2);
    expect(address.fields['city']).toMatchObject({ type: 'text', required: 'City please' });

    const direct = TestBed.runInInjectionContext(() =>
      defineForm({ address: { city: '', zip: '' } }, { address: { city: 'City', zip: 'ZIP' } }),
    );
    const group = direct.fields['address'] as GroupDef;
    expect(group.cols).toBeUndefined();
    expect(Object.keys(group.fields)).toEqual(['city', 'zip']);
  });

  it('treats a model key named "fields" as a field, not a wrapper', () => {
    const def = TestBed.runInInjectionContext(() =>
      defineForm({ meta: { fields: 0, title: '' } }, { meta: { fields: 'Count', title: 'Title' } }),
    );
    const meta = def.fields['meta'] as GroupDef;
    expect(meta.fields['fields']).toMatchObject({ type: 'number', label: 'Count' });
    expect(meta.fields['title']).toMatchObject({ type: 'text', label: 'Title' });
  });

  it('applies validation rules to the signal-forms tree', () => {
    const def = build();
    expect(def.tree().invalid()).toBe(true);
    expect(def.tree.name().errors().map((e) => e.kind)).toEqual(['required']);
    expect(def.tree.age().errors().map((e) => e.kind)).toEqual(['min']);

    def.model.set({ ...initial, name: 'U', age: 30, plan: 'pro' });
    expect(def.tree.name().errors().map((e) => e.kind)).toEqual(['minLength']);
    expect(def.tree.address.city().errors()[0].message).toBe('City please');

    def.model.set({ name: 'Umang', age: 30, address: { city: 'Surat' }, plan: 'pro', agree: true });
    expect(def.tree().valid()).toBe(true);
  });

  it('evaluates hidden logic against the whole model', () => {
    const def = build();
    expect(def.tree.address.city().hidden()).toBe(true);
    def.model.update((m) => ({ ...m, plan: 'pro' }));
    expect(def.tree.address.city().hidden()).toBe(false);
  });

  it('fails fast when a type cannot be inferred', () => {
    expect(() =>
      TestBed.runInInjectionContext(() =>
        defineForm({ when: undefined as unknown as string }, { when: 'When' }),
      ),
    ).toThrow(/cannot infer the input type for "when"/);
  });
});

describe('defineForm arrays', () => {
  interface Order {
    items: { sku: string; qty: number; note: string }[];
    tags: string[];
  }

  function build(initial: Order = { items: [], tags: [] }) {
    return TestBed.runInInjectionContext(() =>
      defineForm<Order>(initial, {
        items: {
          title: 'Items',
          min: 1,
          max: 3,
          cols: 2,
          newItem: () => ({ sku: '', qty: 1, note: '' }),
          item: {
            sku: { label: 'SKU', required: true },
            qty: { min: 1 },
            note: { label: 'Note', hidden: (_, item) => item.qty < 2 },
          },
        },
        tags: { newItem: '', item: { label: 'Tag', minLength: 2 } },
      }),
    );
  }

  it('normalizes object and primitive arrays', () => {
    const def = build();
    const items = def.fields['items'] as ArrayDef;
    expect(items).toMatchObject({ __ngu: 'array', min: 1, max: 3, cols: 2 });
    // Button labels default in the renderer, so they follow the active language.
    expect(items.addLabel).toBeUndefined();
    expect(isLeafDef(items.item)).toBe(false);
    expect((items.item as FormDefinition)['qty']).toMatchObject({ type: 'number', min: 1 });
    expect(items.newItem()).toEqual({ sku: '', qty: 1, note: '' });

    const tags = def.fields['tags'] as ArrayDef;
    expect(isLeafDef(tags.item)).toBe(true);
    expect(tags.item).toMatchObject({ type: 'text', label: 'Tag', minLength: 2 });
  });

  it('clones a plain newItem value on every add', () => {
    const def = build();
    const tags = def.fields['tags'] as ArrayDef;
    expect(tags.newItem()).toBe('');
    const nested = TestBed.runInInjectionContext(() =>
      defineForm({ rows: [] as { a: string }[] }, { rows: { newItem: { a: '' }, item: { a: 'A' } } }),
    );
    const rows = nested.fields['rows'] as ArrayDef;
    expect(rows.newItem()).not.toBe(rows.newItem());
  });

  it('applies min/max as list-length rules and item rules per element', () => {
    const def = build();
    expect(def.tree.items().errors().map((e) => e.kind)).toEqual(['minLength']);

    def.model.update((m) => ({ ...m, items: [{ sku: '', qty: 0, note: '' }] }));
    expect(def.tree.items().errors()).toEqual([]);
    expect(def.tree.items[0].sku().errors().map((e) => e.kind)).toEqual(['required']);
    expect(def.tree.items[0].qty().errors().map((e) => e.kind)).toEqual(['min']);

    def.model.update((m) => ({ ...m, tags: ['x'] }));
    expect(def.tree.tags[0]().errors().map((e) => e.kind)).toEqual(['minLength']);
  });

  it('passes the current item to logic functions inside the array', () => {
    const def = build({ items: [{ sku: 'A', qty: 1, note: '' }, { sku: 'B', qty: 5, note: '' }], tags: [] });
    expect(def.tree.items[0].note().hidden()).toBe(true);
    expect(def.tree.items[1].note().hidden()).toBe(false);
  });

  it('rejects an array without item and newItem', () => {
    expect(() =>
      TestBed.runInInjectionContext(() =>
        defineForm({ tags: [] as string[] }, { tags: 'Tags' as unknown as { item: string; newItem: string } }),
      ),
    ).toThrow(/needs an object spec with "item" and "newItem"/);
  });
});
