import { Component } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';

@Component({
  selector: 'demo-checkbox-group-numbers',
  imports: [NguForm],
  template: `<ngu-form [form]="form" />`,
})
export class CheckboxGroupNumbersDemo {
  readonly form = defineForm(
    { days: [1, 5] as number[] },
    {
      // Option values keep their type: the model holds numbers.
      days: {
        label: 'Delivery days',
        type: 'checkbox',
        options: [
          { value: 1, label: 'Mon' },
          { value: 2, label: 'Tue' },
          { value: 3, label: 'Wed' },
          { value: 4, label: 'Thu' },
          { value: 5, label: 'Fri' },
        ],
      },
    },
  );
}
