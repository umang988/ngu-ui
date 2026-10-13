import { Component, input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormField, type Field } from '@angular/forms/signals';
import { defineForm } from '../define';
import { provideNguFieldTypes } from '../field-types';
import { NguForm } from './ngu-form';
import { NguControlTemplate, NguFieldTemplate } from './ngu-templates';

declare module '../types' {
  interface NguFieldTypeMap {
    score: number;
  }
}

@Component({
  selector: 'test-score',
  imports: [FormField],
  template: `<input class="score" type="range" [id]="id()" [formField]="field()" />`,
})
class ScoreInput {
  readonly field = input.required<Field<number>>();
  readonly id = input<string>();
}

@Component({
  imports: [NguForm, NguFieldTemplate, NguControlTemplate, FormField],
  providers: [provideNguFieldTypes({ score: ScoreInput })],
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
      score: { label: 'Score', type: 'score' },
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
    const score = el.querySelector<HTMLInputElement>('test-score input.score')!;
    expect(score).toBeTruthy();
    expect(score.value).toBe('3');
    expect(el.querySelector(`label[for="${score.id}"]`)?.textContent).toContain('Score');

    score.value = '5';
    score.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(fixture.componentInstance.form.value().score).toBe(5);
  });
});
