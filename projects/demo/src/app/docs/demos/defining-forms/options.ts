import { Component } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';

@Component({
  selector: 'demo-options',
  imports: [NguForm],
  template: `<ngu-form [form]="form" submitLabel="Save" />`,
})
export class OptionsDemo {
  readonly form = defineForm(
    { email: '', bio: '' },
    {
      email: {
        label: 'Email',
        type: 'email',
        required: true,
        placeholder: 'you@example.com',
        hint: 'We never share it',
        autocomplete: 'email',
      },
      bio: { label: 'Bio', type: 'textarea', maxLength: 200 },
    },
  );
}
