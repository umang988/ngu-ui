import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { defineForm } from '../define';
import type { SubmitAction, SubmitResult } from '../types';
import { NguForm } from './ngu-form';

interface Model {
  name: string;
  plan: 'a' | 'b' | '';
  agree: boolean;
  account: { email: string };
  items: { sku: string }[];
}

@Component({
  imports: [NguForm],
  template: `<ngu-form [form]="form" [action]="action" submitLabel="Save" />`,
})
class Host {
  readonly result = signal<SubmitResult<Model>>(undefined);
  readonly action: SubmitAction<Model> = () => this.result();
  readonly form = defineForm<Model>(
    { name: 'ok', plan: '', agree: false, account: { email: '' }, items: [{ sku: 'A' }] },
    {
      name: { label: 'Name', required: true },
      plan: { label: 'Plan', type: 'radio', options: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }] },
      agree: { label: 'Agree' },
      account: { title: 'Account', fields: { email: { label: 'Email', type: 'email', required: true } } },
      items: { title: 'Items', min: 1, newItem: () => ({ sku: '' }), item: { sku: { label: 'SKU', required: true } } },
    },
  );
}

describe('accessibility', () => {
  let fixture: ComponentFixture<Host>;
  let el: HTMLElement;

  beforeEach(async () => {
    fixture = TestBed.createComponent(Host);
    el = fixture.nativeElement;
    document.body.appendChild(el); // focus needs a connected element
    await fixture.whenStable();
  });

  afterEach(() => el.remove());

  const submit = async () => {
    el.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
  };
  const input = (label: string) => {
    const l = Array.from(el.querySelectorAll('label')).find((x) => x.textContent?.replace('*', '').trim() === label)!;
    return el.querySelector<HTMLInputElement>(`#${l.htmlFor}`)!;
  };
  const live = () => el.querySelector('[aria-live="polite"].ngu-sr-only')!.textContent?.trim();

  it('marks shown errors with aria-invalid and links the message', async () => {
    const email = input('Email');
    expect(email.hasAttribute('aria-invalid')).toBe(false);
    await submit();
    expect(email.getAttribute('aria-invalid')).toBe('true');
    const msg = el.querySelector(`#${email.getAttribute('aria-describedby')}`)!;
    expect(msg.textContent?.trim()).toBe('Email is required');
    expect(msg.getAttribute('role')).toBeNull(); // no alert storm on submit
  });

  it('focuses the first invalid field and announces the count once', async () => {
    await submit();
    expect(document.activeElement).toBe(input('Email'));
    expect(live()).toBe('1 field needs attention.');
  });

  it('focuses a field that only the server rejected', async () => {
    fixture.componentInstance.form.patch({ account: { email: 'a@b.co' } });
    fixture.componentInstance.result.set({ 'items.0.sku': 'Unknown SKU' });
    await submit();
    expect(document.activeElement).toBe(el.querySelector('.ngu-array input'));
    expect(live()).toBe('1 field needs attention.');
  });

  it('focuses the form-level message when only the form failed', async () => {
    fixture.componentInstance.form.patch({ account: { email: 'a@b.co' } });
    fixture.componentInstance.result.set('Server is busy');
    await submit();
    const formError = el.querySelector<HTMLElement>('.ngu-form-error')!;
    expect(formError.getAttribute('role')).toBe('alert');
    expect(document.activeElement).toBe(formError);
  });

  it('names titled groups and lists, and gives radios radiogroup semantics', () => {
    for (const title of ['Account', 'Items']) {
      const heading = Array.from(el.querySelectorAll('h3')).find((h) => h.textContent?.trim() === title)!;
      const group = el.querySelector(`[aria-labelledby="${heading.id}"]`)!;
      expect(group.getAttribute('role')).toBe('group');
    }
    const radios = el.querySelector('fieldset[role="radiogroup"]')!;
    expect(el.querySelector(`#${radios.getAttribute('aria-labelledby')}`)?.textContent?.trim()).toBe('Plan');
    expect(el.querySelector('ngu-group:not([aria-labelledby])')?.getAttribute('role')).toBeNull();
  });

  it('moves focus into a new row and away from a removed one', async () => {
    const add = el.querySelector<HTMLButtonElement>('.ngu-array__add')!;
    add.click();
    await fixture.whenStable();
    const rows = () => Array.from(el.querySelectorAll('.ngu-array__row'));
    expect(rows().length).toBe(2);
    expect(document.activeElement).toBe(rows()[1].querySelector('input'));

    rows()[0].querySelector<HTMLButtonElement>('.ngu-array__remove')!.click();
    await fixture.whenStable();
    expect(rows().length).toBe(1);
    expect(document.activeElement).toBe(rows()[0].querySelector('input'));
  });
});

describe('accessibility: empty list', () => {
  @Component({
    imports: [NguForm],
    template: `<ngu-form [form]="form" />`,
  })
  class EmptyHost {
    readonly form = defineForm({ tags: [] as string[] }, { tags: { title: 'Tags', newItem: '', item: 'Tag' } });
  }

  it('drops the list role while there are no rows', async () => {
    const fixture = TestBed.createComponent(EmptyHost);
    await fixture.whenStable();
    const rows = (fixture.nativeElement as HTMLElement).querySelector('.ngu-array__rows')!;
    expect(rows.getAttribute('role')).toBeNull();
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.ngu-array__add')!.click();
    await fixture.whenStable();
    expect(rows.getAttribute('role')).toBe('list');
  });
});
