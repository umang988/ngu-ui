import { Component } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';

@Component({
  selector: 'demo-custom-validation',
  imports: [NguForm],
  template: `<ngu-form [form]="form" submitLabel="Change password" />`,
})
export class CustomValidationDemo {
  readonly form = defineForm(
    { password: '', confirm: '' },
    {
      password: { label: 'New password', type: 'password', required: true, minLength: 8 },
      confirm: {
        label: 'Repeat it',
        type: 'password',
        required: true,
        // Reads the model, so it re-runs when the password changes too.
        validate: (value, model) => (value === model.password ? undefined : 'The passwords differ'),
      },
    },
  );
}
