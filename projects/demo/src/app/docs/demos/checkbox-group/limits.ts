import { Component } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';

const TOPPINGS = [
  { value: 'cheese', label: 'Extra cheese' },
  { value: 'olives', label: 'Olives' },
  { value: 'peppers', label: 'Peppers' },
  { value: 'pineapple', label: 'Pineapple' },
];

@Component({
  selector: 'demo-checkbox-group-limits',
  imports: [NguForm],
  template: `<ngu-form [form]="form" submitLabel="Order" />`,
})
export class CheckboxGroupLimitsDemo {
  readonly form = defineForm(
    { toppings: [] as string[] },
    {
      toppings: {
        label: 'Pick up to three',
        type: 'checkbox',
        options: TOPPINGS,
        required: true,
        max: 3,
      },
    },
  );
}
