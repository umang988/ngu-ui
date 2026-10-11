import { Component } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';

@Component({
  selector: 'demo-verify',
  imports: [NguForm],
  template: `<ngu-form [form]="form" submitLabel="Subscribe" />`,
})
export class VerifyDemo {
  readonly form = defineForm(
    { email: '' },
    { email: { label: 'Email', type: 'email', required: true } },
  );
}
