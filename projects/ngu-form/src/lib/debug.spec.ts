import { Component, Injector, runInInjectionContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { debugRows, NguFormDebug } from 'ngu-form/debug';
import { defineForm } from './define';

describe('debug panel', () => {
  const build = () =>
    runInInjectionContext(TestBed.inject(Injector), () =>
      defineForm(
        { name: '', when: new Date('2026-01-02T00:00:00Z'), items: [{ sku: '' }], extra: { color: 'red' } as Record<string, string> },
        {
          name: { label: 'Name', required: true },
          when: 'When',
          items: { item: { sku: { label: 'SKU', required: true } }, newItem: { sku: '' } },
          extra: { fields: [{ key: 'color', label: 'Color', required: true }] },
        },
      ),
    );

  it('lists every field, group and list by model path with its errors', () => {
    const form = build();
    const rows = debugRows(form);
    expect(rows.map((r) => `${r.kind}:${r.path}`)).toEqual([
      'field:name',
      'field:when',
      'list:items',
      'group:items.0',
      'field:items.0.sku',
      'group:extra',
      'field:extra.color',
    ]);
    expect(rows.find((r) => r.path === 'name')!.errors).toEqual(['required: required']);
    expect(rows.find((r) => r.path === 'items.0.sku')!.errors.length).toBe(1);
    expect(rows.find((r) => r.path === 'extra.color')!.errors).toEqual([]);
  });

  it('renders state, value, changes, errors and changed fields', async () => {
    @Component({
      imports: [NguFormDebug],
      template: `<ngu-form-debug [form]="form" />`,
    })
    class Host {
      readonly form = build();
    }
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('summary')!.textContent).toContain('ngu-form debug');
    expect(el.textContent).toContain('valid: no');
    const [value, changes] = Array.from(el.querySelectorAll('pre'));
    expect(value.textContent).toContain('"when": "2026-01-02T00:00:00.000Z"');
    expect(changes.textContent!.trim()).toBe('{}');
    expect(el.querySelector('tbody')!.textContent).toContain('name');

    fixture.componentInstance.form.tree.name().value.set('Ada');
    fixture.componentInstance.form.tree.name().markAsDirty();
    await fixture.whenStable();
    expect(changes.textContent).toContain('"name": "Ada"');
    expect(el.textContent).toContain('Changed fields');
    expect(Array.from(el.querySelectorAll('code')).map((c) => c.textContent)).toContain('name');
  });
});
