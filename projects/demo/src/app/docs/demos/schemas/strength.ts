import { Component } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';

@Component({
  selector: 'demo-strength',
  imports: [NguForm],
  template: `<ngu-form [form]="form" submitLabel="Set password" />`,
})
export class StrengthDemo {
  readonly form = defineForm(
    { password: '' },
    {
      // A meter and checklist; below score 2 the password is refused.
      password: {
        label: 'Password',
        type: 'password',
        required: true,
        minLength: 10,
        strength: { min: 2 },
      },
    },
  );
}
