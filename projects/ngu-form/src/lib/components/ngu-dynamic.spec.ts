import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormField } from '@angular/forms/signals';
import { defineForm } from '../define';
import type { DynamicField } from '../types';
import { NguForm } from './ngu-form';
import { NguFieldTemplate } from './ngu-templates';

@Component({
  imports: [NguForm, NguFieldTemplate, FormField],
  template: `
    <ngu-form [form]="form" submitLabel="Send">
      <ng-template nguField="answers.color" let-field>
        <input class="custom-color" [formField]="field" />
      </ng-template>
    </ngu-form>
  `,
})
class Host {
  readonly questions = signal<DynamicField[]>([
    { key: 'city', label: 'City', required: true },
    { key: 'pets', label: 'Pets', type: 'number', min: 0 },
  ]);
  readonly form = defineForm({ answers: {} as Record<string, string | number | boolean> }, {
    answers: { fields: this.questions },
  });
}

describe('NguDynamic', () => {
  it('renders listed fields in order and follows the list', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const labels = () => Array.from(el.querySelectorAll('label.ngu-label')).map((l) => l.textContent?.replace('*', '').trim());
    expect(labels()).toEqual(['City', 'Pets']);

    fixture.componentInstance.questions.update((q) => [...q, { key: 'color', label: 'Color' }, { key: 'note', label: 'Note' }]);
    await fixture.whenStable();
    expect(labels()).toEqual(['City', 'Pets', 'Note']);
    expect(el.querySelector('.custom-color')).toBeTruthy();

    fixture.componentInstance.questions.update((q) => q.filter((f) => f.key !== 'pets'));
    await fixture.whenStable();
    expect(labels()).toEqual(['City', 'Note']);
  });

  it('binds input and shows errors after submit', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    el.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
    expect(Array.from(el.querySelectorAll('.ngu-error')).map((e) => e.textContent?.trim())).toEqual(['City is required']);

    const city = el.querySelector<HTMLInputElement>('input[type="text"]')!;
    city.value = 'Surat';
    city.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(fixture.componentInstance.form.value().answers['city']).toBe('Surat');
    expect(el.querySelectorAll('.ngu-error').length).toBe(0);
  });
});
