import { Component } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { defineForm } from '../define';
import { NguForm } from './ngu-form';

interface Line {
  sku: string;
  qty: number;
  gift: boolean;
  note: string;
}

const line = (sku: string, qty = 1): Line => ({ sku, qty, gift: false, note: '' });

@Component({
  imports: [NguForm],
  template: `<ngu-form [form]="form" submitLabel="Save" />`,
})
class ToolsHost {
  readonly form = defineForm(
    { lines: [line('A'), line('B'), line('C')] },
    {
      lines: {
        title: 'Lines',
        reorder: true,
        duplicate: true,
        max: 4,
        newItem: () => line(''),
        item: {
          sku: { label: 'SKU', required: true },
          qty: { label: 'Qty', min: 1 },
          gift: 'Gift',
          note: { label: 'Note', hidden: (_, l) => !l.gift },
        },
      },
    },
  );
}

@Component({
  imports: [NguForm],
  template: `<ngu-form [form]="form" submitLabel="Save" />`,
})
class SummaryHost {
  readonly form = defineForm(
    { people: [{ name: 'Asha', email: 'a@x.in' }, { name: '', email: '' }] },
    {
      people: {
        title: 'People',
        summary: (p) => (p.name ? `${p.name} <${p.email}>` : ''),
        newItem: { name: '', email: '' },
        item: { name: { label: 'Name', required: true }, email: 'Email' },
      },
    },
  );
}

@Component({
  imports: [NguForm],
  template: `<ngu-form [form]="form" submitLabel="Save" />`,
})
class TableHost {
  readonly form = defineForm(
    { lines: [line('A', 2), { ...line('B'), gift: true }] },
    {
      lines: {
        title: 'Lines',
        layout: 'table',
        newItem: () => line(''),
        item: {
          sku: { label: 'SKU', required: true, span: 2 },
          qty: { label: 'Qty', min: 1 },
          gift: 'Gift',
          note: { label: 'Note', hidden: (_, l) => !l.gift },
        },
      },
    },
  );
}

@Component({
  imports: [NguForm],
  template: `<ngu-form [form]="form" submitLabel="Save" />`,
})
class VirtualHost {
  readonly form = defineForm(
    { rows: Array.from({ length: 300 }, (_, i) => ({ code: i === 250 ? '' : `R${i}` })) },
    {
      rows: { title: 'Rows', virtual: true, newItem: { code: '' }, item: { code: { label: 'Code', required: true } } },
    },
  );
}

@Component({
  imports: [NguForm],
  template: `<ngu-form [form]="form" submitLabel="Save" />`,
})
class NestedHost {
  readonly form = defineForm(
    { days: [{ title: 'Mon', slots: [{ time: '09:00' }] }] },
    {
      days: {
        title: 'Days',
        newItem: () => ({ title: '', slots: [] }),
        item: {
          title: 'Day',
          slots: { title: 'Slots', addLabel: 'Add slot', newItem: { time: '' }, item: { time: { label: 'Time', type: 'time' } } },
        },
      },
    },
  );
}

async function render<T>(type: new () => T): Promise<{ fixture: ComponentFixture<T>; el: HTMLElement }> {
  const fixture = TestBed.createComponent(type);
  const el = fixture.nativeElement as HTMLElement;
  document.body.appendChild(el);
  await fixture.whenStable();
  return { fixture, el };
}

const rows = (el: HTMLElement) => Array.from(el.querySelectorAll<HTMLElement>('ngu-array > .ngu-array__viewport .ngu-array__row'));
const live = (el: HTMLElement) => el.querySelector('[aria-live="polite"].ngu-sr-only')!.textContent?.trim();

describe('list tools', () => {
  afterEach(() => document.body.querySelectorAll('.ngu-form').forEach((n) => n.remove()));

  it('move rows with Move up and Move down, keeping focus on the moved row', async () => {
    const { fixture, el } = await render(ToolsHost);
    const form = fixture.componentInstance.form;
    const down = rows(el)[0].querySelector<HTMLButtonElement>('.ngu-array__down')!;
    expect(down.getAttribute('aria-label')).toBe('Move entry 1 down');
    expect(rows(el)[0].querySelector<HTMLButtonElement>('.ngu-array__up')!.disabled).toBe(true);

    form.tree.lines[0].sku().markAsTouched();
    down.click();
    await fixture.whenStable();
    expect(form.value().lines.map((l) => l.sku)).toEqual(['B', 'A', 'C']);
    // The row keeps its own state when it moves.
    expect(form.tree.lines[1].sku().touched()).toBe(true);
    expect(document.activeElement).toBe(rows(el)[1].querySelector('.ngu-array__down'));
    expect(live(el)).toBe('Moved to position 2 of 3');

    (document.activeElement as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(form.value().lines.map((l) => l.sku)).toEqual(['B', 'C', 'A']);
    // At the end Move down is disabled, so focus goes to Move up.
    expect(document.activeElement).toBe(rows(el)[2].querySelector('.ngu-array__up'));
  });

  it('drag a row by its handle, and cancel with Escape', async () => {
    const { fixture, el } = await render(ToolsHost);
    const form = fixture.componentInstance.form;
    rows(el).forEach((row, i) => {
      row.getBoundingClientRect = () => ({ top: i * 50, height: 50, bottom: i * 50 + 50 }) as DOMRect;
    });
    const handle = rows(el)[0].querySelector<HTMLElement>('.ngu-array__handle')!;
    expect(handle.getAttribute('aria-hidden')).toBe('true');
    const fire = (type: string, clientY: number) =>
      handle.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, button: 0, clientY }));

    fire('pointerdown', 10);
    fire('pointermove', 120);
    await fixture.whenStable();
    expect(rows(el)[2].classList).toContain('ngu-array__row--drop-before');
    fire('pointerup', 120);
    await fixture.whenStable();
    expect(form.value().lines.map((l) => l.sku)).toEqual(['B', 'A', 'C']);

    fire('pointerdown', 10);
    fire('pointermove', 140);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fire('pointerup', 140);
    await fixture.whenStable();
    expect(form.value().lines.map((l) => l.sku)).toEqual(['B', 'A', 'C']);
  });

  it('duplicate a row next to itself as an independent copy', async () => {
    const { fixture, el } = await render(ToolsHost);
    const form = fixture.componentInstance.form;
    const copy = rows(el)[0].querySelector<HTMLButtonElement>('.ngu-array__duplicate')!;
    expect(copy.getAttribute('aria-label')).toBe('Duplicate entry 1');
    copy.click();
    await fixture.whenStable();
    expect(form.value().lines.map((l) => l.sku)).toEqual(['A', 'A', 'B', 'C']);
    expect(document.activeElement).toBe(rows(el)[1].querySelector('input'));
    expect(live(el)).toBe('Copy added as entry 2');

    form.tree.lines[1].sku().value.set('A2');
    expect(form.value().lines[0].sku).toBe('A');
    // At `max` both Add and Duplicate are disabled.
    expect(rows(el)[0].querySelector<HTMLButtonElement>('.ngu-array__duplicate')!.disabled).toBe(true);
  });

  it('collapse rows to a summary line and expand rows with problems on a refused submit', async () => {
    const { fixture, el } = await render(SummaryHost);
    const toggles = () => Array.from(el.querySelectorAll<HTMLButtonElement>('.ngu-array__toggle'));
    expect(toggles().map((t) => t.querySelector('.ngu-array__summary')!.textContent)).toEqual(['Asha <a@x.in>', 'Entry 2']);
    expect(toggles().map((t) => t.getAttribute('aria-expanded'))).toEqual(['false', 'false']);
    const body = el.querySelector(`#${toggles()[0].getAttribute('aria-controls')}`)!;
    expect(body.hasAttribute('hidden')).toBe(true);

    toggles()[0].click();
    await fixture.whenStable();
    expect(body.hasAttribute('hidden')).toBe(false);

    el.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
    expect(toggles()[1].getAttribute('aria-expanded')).toBe('true');
    expect(toggles()[1].textContent).toContain('Needs attention');
    expect(document.activeElement).toBe(rows(el)[1].querySelector('.ngu-array__body input'));
  });

  it('opens new rows of a summarized list and focuses their first field', async () => {
    const { fixture, el } = await render(SummaryHost);
    el.querySelector<HTMLButtonElement>('.ngu-array__add')!.click();
    await fixture.whenStable();
    const last = rows(el)[2];
    expect(last.querySelector('.ngu-array__toggle')!.getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement).toBe(last.querySelector('.ngu-array__body input'));
  });

  it('edit object rows as a table with column headers', async () => {
    const { el } = await render(TableHost);
    const table = el.querySelector('table.ngu-table')!;
    expect(table.getAttribute('aria-labelledby')).toBe(el.querySelector('.ngu-array__title')!.id);
    const headers = Array.from(table.querySelectorAll('thead th')).map((th) => th.textContent?.replace(/\s+/g, ' ').trim());
    expect(headers).toEqual(['#Entry number', 'SKU*', 'Qty', 'Gift', 'Note', 'Actions']);
    const body = Array.from(table.querySelectorAll('tbody tr'));
    expect(body.map((tr) => tr.querySelector('th[scope="row"]')!.textContent)).toEqual(['1', '2']);
    // Each control keeps its label for screen readers.
    const sku = body[0].querySelector('td ngu-field')!;
    expect(sku.classList).toContain('ngu-field--compact');
    expect(sku.querySelector('label')!.textContent?.replace('*', '').trim()).toBe('SKU');
    // The note is hidden on the first row and shown on the second.
    expect(body[0].querySelectorAll('td')[3].children.length).toBe(0);
    expect(body[1].querySelectorAll('td')[3].querySelector('textarea, input')).toBeTruthy();
  });

  it('render only the rows in view of a virtual list, and bring a problem row into view', async () => {
    const { fixture, el } = await render(VirtualHost);
    expect(rows(el).length).toBeLessThan(20);
    const list = el.querySelector('.ngu-array__rows')!;
    expect(list.getAttribute('role')).toBe('list');
    expect(rows(el)[0].getAttribute('aria-setsize')).toBe('300');
    expect(rows(el)[0].getAttribute('aria-posinset')).toBe('1');
    expect(el.querySelector<HTMLElement>('.ngu-array__viewport > .ngu-spacer:last-child')!.style.height).not.toBe('');

    el.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
    const indexes = rows(el).map((r) => Number(r.dataset['index']));
    expect(indexes).toContain(250);
    expect(document.activeElement).toBe(rows(el).find((r) => r.dataset['index'] === '250')!.querySelector('input'));
  });

  it('nest lists inside list rows', async () => {
    const { fixture, el } = await render(NestedHost);
    const form = fixture.componentInstance.form;
    const add = Array.from(el.querySelectorAll<HTMLButtonElement>('.ngu-array__add')).find((b) => b.textContent?.trim() === 'Add slot')!;
    add.click();
    await fixture.whenStable();
    expect(form.value().days[0].slots.length).toBe(2);
    expect(el.querySelectorAll('ngu-array ngu-array .ngu-array__row').length).toBe(2);
  });
});
