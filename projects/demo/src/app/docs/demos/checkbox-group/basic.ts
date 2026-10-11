import { Component } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';

const TOPPINGS = [
  { value: 'cheese', label: 'Extra cheese' },
  { value: 'olives', label: 'Olives' },
  { value: 'peppers', label: 'Peppers' },
  { value: 'pineapple', label: 'Pineapple' },
];

@Component({
  selector: 'demo-checkbox-group-basic',
  imports: [NguForm],
  template: `<ngu-form [form]="form" />`,
})
export class CheckboxGroupBasicDemo {
  readonly form = defineForm(
    { toppings: ['cheese'] as string[] },
    {
      toppings: { label: 'Toppings', type: 'checkbox', options: TOPPINGS },
    },
  );
}
