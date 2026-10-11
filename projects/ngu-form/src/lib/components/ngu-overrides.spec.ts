import { Component, input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormField, type Field } from '@angular/forms/signals';
import { defineForm } from '../define';
import { provideNguFieldTypes } from '../field-types';
import type { LeafDef } from '../types';
import { NguForm } from './ngu-form';
import { NguControlTemplate, NguFieldTemplate } from './ngu-templates';

declare module '../types' {
  interface NguFieldTypeMap {
    rating: number;
  }
}

@Component({
  selector: 'test-rating',
  imports: [FormField],
  template: `<input class="rating" type="range" [id]="id()" [formField]="field()" />`,
})
class Rating {
  readonly field = input.required<Field<number>>();
  readonly id = input<string>();
}

@Component({
  imports: [NguForm, NguFieldTemplate, NguControlTemplate, FormField],
  providers: [provideNguFieldTypes({ rating: Rating })],
  template: `
    <ngu-form [form]="form" submitLabel="Save">
      <ng-template nguField="account.email" let-field let-def="def">
        <input class="custom-email" [formField]="field" [placeholder]="def.label" />
      </ng-template>
      <ng-template nguControl="items[].note" let-field let-id="id">
        <textarea class="custom-note" [id]="id" [formField]="field"></textarea>
      </ng-template>
    </ngu-form>
  `,
})
class Host {
  readonly form = defineForm(
    { account: { email: '' }, score: 3, items: [{ note: '' }] },
    {
      account: { email: { label: 'Email', type: 'email' } },
      score: { label: 'Score', type: 'rating' },
      items: { newItem: { note: '' }, item: { note: { label: 'Note' } } },
    },
  );
}

describe('NguField overrides', () => {
  async function setup() {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  it('renders an nguField template instead of the whole field', async () => {
    const { el } = await setup();
    const custom = el.querySelector<HTMLInputElement>('.custom-email')!;
    expect(custom).toBeTruthy();
    expect(custom.placeholder).toBe('Email');
    expect(el.querySelector('input[type="email"]')).toBeNull();
    expect(el.querySelector('label[for]')?.textContent).not.toContain('Email');
  });

  it('renders an nguControl template inside the label chrome, including array items', async () => {
    const { el, fixture } = await setup();
    const note = el.querySelector<HTMLTextAreaElement>('.custom-note')!;
    expect(note).toBeTruthy();
    const label = el.querySelector<HTMLLabelElement>(`label[for="${note.id}"]`);
    expect(label?.textContent).toContain('Note');

    note.value = 'hello';
    note.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(fixture.componentInstance.form.value().items[0].note).toBe('hello');
  });

  it('renders a registered custom type and passes only declared inputs', async () => {
    const { el, fixture } = await setup();
    const rating = el.querySelector<HTMLInputElement>('test-rating input.rating')!;
    expect(rating).toBeTruthy();
    expect(rating.value).toBe('3');
    expect(el.querySelector(`label[for="${rating.id}"]`)?.textContent).toContain('Score');

    rating.value = '5';
    rating.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(fixture.componentInstance.form.value().score).toBe(5);
  });
});
