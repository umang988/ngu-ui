import { Component } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';

@Component({
  selector: 'demo-text-counter',
  imports: [NguForm],
  template: `<ngu-form [form]="form" />`,
})
export class TextCounterDemo {
  readonly form = defineForm(
    { headline: '', summary: '' },
    {
      headline: { label: 'Headline', maxLength: 60 },
      summary: { label: 'Summary', type: 'textarea', maxLength: 140, rows: 3 },
    },
  );
}
