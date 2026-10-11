import { Component } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';

@Component({
  selector: 'demo-radio-numbers',
  imports: [NguForm],
  template: `<ngu-form [form]="form" />`,
})
export class RadioNumbersDemo {
  readonly form = defineForm(
    { seats: 5 },
    {
      seats: {
        label: 'Seats',
        type: 'radio',
        options: [
          { value: 1, label: 'Just me' },
          { value: 5, label: 'Up to 5' },
          { value: 20, label: 'Up to 20' },
        ],
      },
    },
  );
}
