import { Component } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';

@Component({
  selector: 'demo-warnings',
  imports: [NguForm],
  template: `<ngu-form [form]="form" submitLabel="Save" />`,
})
export class WarningsDemo {
  readonly form = defineForm(
    { email: 'ana@gmial.com' },
    {
      email: {
        label: 'Email',
        type: 'email',
        // Shown in a warning style; never blocks the submit.
        warn: (value) => (value.endsWith('@gmial.com') ? 'Did you mean gmail.com?' : undefined),
      },
    },
  );
}
