import { Component } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';

@Component({
  selector: 'demo-select-basic',
  imports: [NguForm],
  template: `<ngu-form [form]="form" />`,
})
export class SelectBasicDemo {
  readonly form = defineForm(
    { country: '', size: 2 },
    {
      country: {
        label: 'Country',
        type: 'select',
        placeholder: 'Choose…',
        required: true,
        options: [
          { value: 'in', label: 'India' },
          { value: 'ae', label: 'United Arab Emirates' },
          { value: 'gb', label: 'United Kingdom' },
        ],
      },
      // Number options write numbers.
      size: {
        label: 'Size',
        type: 'select',
        options: [
          { value: 1, label: 'Small' },
          { value: 2, label: 'Medium' },
          { value: 3, label: 'Large' },
        ],
      },
    },
  );
}
