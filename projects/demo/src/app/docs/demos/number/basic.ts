import { Component } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';

@Component({
  selector: 'demo-number-basic',
  imports: [NguForm],
  template: `<ngu-form [form]="form" />`,
})
export class NumberBasicDemo {
  readonly form = defineForm(
    { quantity: 1, weight: 0.5 },
    {
      quantity: { label: 'Quantity', min: 1, max: 99 },
      weight: { label: 'Weight', min: 0, step: 0.5, suffix: 'kg' },
    },
  );
}
