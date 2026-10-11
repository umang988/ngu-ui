import { TestBed } from '@angular/core/testing';
import { defineForm } from './define';

interface Model {
  name: string;
  address: { city: string; zip: string };
  tags: string[];
}

const start: Model = { name: 'a', address: { city: 'Surat', zip: '' }, tags: ['x'] };

function build() {
  return TestBed.runInInjectionContext(() =>
    defineForm<Model>(start, {
      name: { required: true },
      address: { city: 'City', zip: 'ZIP' },
      tags: { newItem: '', item: 'Tag' },
    }),
  );
}

describe('patch', () => {
  it('deep-merges objects and replaces arrays', () => {
    const def = build();
    def.patch({ address: { zip: '395007' }, tags: ['p', 'q'] });
    expect(def.value()).toEqual({ name: 'a', address: { city: 'Surat', zip: '395007' }, tags: ['p', 'q'] });
  });

  it('does not mark fields dirty or touched', () => {
    const def = build();
    def.patch({ name: 'patched' });
    expect(def.tree.name().dirty()).toBe(false);
    expect(def.tree().touched()).toBe(false);
  });
});

describe('reset', () => {
  it('restores the initial value, even after nested mutation of the model', () => {
    const def = build();
    def.model.update((m) => ({ ...m, name: 'changed', address: { ...m.address, city: 'Pune' }, tags: [] }));
    def.reset();
    expect(def.value()).toEqual(start);
    expect(def.value()).not.toBe(start);
    expect(def.initial).toEqual(start);
  });

  it('clears touched and dirty state and counts resets', () => {
    const def = build();
    def.tree.name().markAsTouched();
    def.tree.name().markAsDirty();
    expect(def.resets()).toBe(0);
    def.reset();
    expect(def.tree.name().touched()).toBe(false);
    expect(def.tree.name().dirty()).toBe(false);
    expect(def.resets()).toBe(1);
  });

  it('accepts a new value to reset to', () => {
    const def = build();
    const next: Model = { name: 'b', address: { city: 'Delhi', zip: '1' }, tags: [] };
    def.reset(next);
    expect(def.value()).toEqual(next);
  });
});
