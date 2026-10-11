import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { defineForm } from '../define';
import { NguForm } from './ngu-form';

@Component({
  imports: [NguForm],
  template: `<ngu-form [form]="form" submitLabel="Save" />`,
})
class Host {
  readonly form = defineForm(
    { items: [{ name: 'first' }], tags: [] as string[] },
    {
      items: { min: 1, max: 2, newItem: () => ({ name: '' }), item: { name: { label: 'Name', required: true } } },
      tags: { title: 'Tags', addLabel: 'Add tag', newItem: '', item: 'Tag' },
    },
  );
}

describe('NguArray', () => {
  async function setup() {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const rows = (list: number) => el.querySelectorAll('ngu-array')[list].querySelectorAll('.ngu-array__row');
    const button = (text: string) =>
      Array.from(el.querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.trim() === text)!;
    return { fixture, el, rows, button };
  }

  it('renders one row per element and the add button', async () => {
    const { rows, button } = await setup();
    expect(rows(0).length).toBe(1);
    expect(rows(1).length).toBe(0);
    expect(button('Add').textContent?.trim()).toBe('Add');
    expect(button('Add tag')).toBeTruthy();
  });

  it('adds and removes rows through the model', async () => {
    const { fixture, rows, button } = await setup();
    button('Add tag').click();
    button('Add tag').click();
    await fixture.whenStable();
    expect(rows(1).length).toBe(2);
    expect(fixture.componentInstance.form.value().tags).toEqual(['', '']);

    rows(1)[0].querySelector<HTMLButtonElement>('.ngu-array__remove')!.click();
    await fixture.whenStable();
    expect(rows(1).length).toBe(1);
  });

  it('respects min and max', async () => {
    const { fixture, rows, button } = await setup();
    const remove = () => rows(0)[0].querySelector<HTMLButtonElement>('.ngu-array__remove')!;
    expect(remove().disabled).toBe(true);

    button('Add').click();
    await fixture.whenStable();
    expect(rows(0).length).toBe(2);
    expect(button('Add').disabled).toBe(true);
    expect(remove().disabled).toBe(false);
  });

  it('shows item errors after submit', async () => {
    const { fixture, el, button } = await setup();
    button('Add').click();
    await fixture.whenStable();
    el.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
    const messages = Array.from(el.querySelectorAll('.ngu-error')).map((e) => e.textContent?.trim());
    expect(messages).toEqual(['Name is required']);
  });
});
